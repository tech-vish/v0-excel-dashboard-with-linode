import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

// Linode Object Storage uses virtual-hosted style endpoints:
// https://{bucket}.{region}.linodeobjects.com
// The S3 client endpoint should be https://{region}.linodeobjects.com
// with forcePathStyle: false so it prepends the bucket as a subdomain.

function getS3Client() {
  const region = (process.env.LINODE_REGION || "in-maa-1").trim();
  const accessKeyId = (process.env.LINODE_ACCESS_KEY || "").trim();
  const secretAccessKey = (process.env.LINODE_SECRET_KEY || "").trim();
  const bucket = (process.env.LINODE_BUCKET || "").trim();

  // Endpoint format: https://{region}.linodeobjects.com
  const endpoint = `https://${region}.linodeobjects.com`;

  console.log("[v0] S3 Config - region:", region);
  console.log("[v0] S3 Config - endpoint:", endpoint);
  console.log("[v0] S3 Config - full URL will be:", `https://${bucket}.${region}.linodeobjects.com`);
  console.log("[v0] S3 Config - accessKeyId length:", accessKeyId.length);
  console.log("[v0] S3 Config - bucket:", bucket);
  console.log("[v0] S3 Config - objectKey:", process.env.LINODE_OBJECT_KEY);

  return new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: false, // virtual-hosted style: {bucket}.{region}.linodeobjects.com
  });
}

// POST - Upload Excel file to Linode Object Storage
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!/\.xlsx?$/i.test(file.name)) {
      return NextResponse.json(
        { error: "Only .xlsx or .xls files are allowed" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const s3 = getS3Client();
    const bucket = process.env.LINODE_BUCKET || "";
    const key = process.env.LINODE_OBJECT_KEY || "data.xlsx";

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    );

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully to Linode Object Storage",
      fileName: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Upload error:", message);
    return NextResponse.json(
      { error: "Upload failed: " + message },
      { status: 500 }
    );
  }
}

// GET - Download Excel file from Linode Object Storage
export async function GET() {
  try {
    const s3 = getS3Client();
    const bucket = process.env.LINODE_BUCKET || "";
    const key = process.env.LINODE_OBJECT_KEY || "data.xlsx";

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3.send(command);

    if (!response.Body) {
      return NextResponse.json(
        { error: "No file found in storage" },
        { status: 404 }
      );
    }

    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();
    let done = false;

    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value) {
        chunks.push(result.value);
      }
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const base64 = Buffer.from(merged).toString("base64");

    return NextResponse.json({
      success: true,
      data: base64,
      contentType:
        response.ContentType ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      lastModified: response.LastModified?.toISOString(),
      size: response.ContentLength,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Download error:", message);
    return NextResponse.json(
      { error: "Failed to load from Linode: " + message },
      { status: 500 }
    );
  }
}
