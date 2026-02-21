import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

// Linode Object Storage endpoint format:
// Virtual-hosted style: https://{bucket}.{region}.linodeobjects.com/{key}
// The S3 SDK endpoint must be https://{region}.linodeobjects.com
// and forcePathStyle must be false so SDK prepends bucket as subdomain.
//
// IMPORTANT: LINODE_REGION must match the cluster your bucket lives on.
// e.g. "in-maa-1" for India/Chennai, "us-east-1" for Newark, etc.

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>;
    if (e.message) return String(e.message);
    if (e.Code) return String(e.Code);
    if (e.code) return String(e.code);
    return JSON.stringify(error);
  }
  return String(error);
}

function getS3Client() {
  const region = (process.env.LINODE_REGION || "in-maa-1").trim();
  const accessKeyId = (process.env.LINODE_ACCESS_KEY || "").trim();
  const secretAccessKey = (process.env.LINODE_SECRET_KEY || "").trim();
  const bucket = (process.env.LINODE_BUCKET || "").trim();

  // The SDK endpoint is the cluster base URL (without the bucket)
  const endpoint = `https://${region}.linodeobjects.com`;

  console.log("[v0] S3 Config - region:", region);
  console.log("[v0] S3 Config - endpoint:", endpoint);
  console.log("[v0] S3 Config - virtual-hosted URL:", `https://${bucket}.${region}.linodeobjects.com`);
  console.log("[v0] S3 Config - accessKeyId (first 4 chars):", accessKeyId.substring(0, 4) + "...");
  console.log("[v0] S3 Config - accessKeyId length:", accessKeyId.length);
  console.log("[v0] S3 Config - secretAccessKey length:", secretAccessKey.length);
  console.log("[v0] S3 Config - bucket:", bucket);
  console.log("[v0] S3 Config - objectKey:", process.env.LINODE_OBJECT_KEY);

  return new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: false,
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
    const message = getErrorMessage(error);
    console.error("[v0] Upload error:", message);
    console.error("[v0] Upload error full:", JSON.stringify(error, null, 2));
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
    const message = getErrorMessage(error);
    console.error("[v0] Download error:", message);
    console.error("[v0] Download error full:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Failed to load from Linode: " + message },
      { status: 500 }
    );
  }
}
