import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

// Linode region slug -> actual S3 endpoint mapping
// Some Linode regions have different S3 endpoint hostnames than their region slug
const LINODE_ENDPOINT_MAP: Record<string, string> = {
  "ap-south-1": "https://ap-south-1.linodeobjects.com",
  "ap-south": "https://in-maa.linodeobjects.com",
  "in-maa": "https://in-maa.linodeobjects.com",
  "in-maa-1": "https://in-maa.linodeobjects.com",
  "us-east-1": "https://us-east-1.linodeobjects.com",
  "us-southeast-1": "https://us-southeast-1.linodeobjects.com",
  "eu-central-1": "https://eu-central-1.linodeobjects.com",
  "jp-osa-1": "https://jp-osa-1.linodeobjects.com",
  "us-iad-1": "https://us-iad-1.linodeobjects.com",
  "fr-par-1": "https://fr-par-1.linodeobjects.com",
  "us-ord-1": "https://us-ord-1.linodeobjects.com",
  "us-sea-1": "https://us-sea-1.linodeobjects.com",
  "us-lax-1": "https://us-lax-1.linodeobjects.com",
  "us-mia-1": "https://us-mia-1.linodeobjects.com",
  "id-cgk-1": "https://id-cgk-1.linodeobjects.com",
  "se-sto-1": "https://se-sto-1.linodeobjects.com",
  "nl-ams-1": "https://nl-ams-1.linodeobjects.com",
  "es-mad-1": "https://es-mad-1.linodeobjects.com",
  "gb-lon-1": "https://gb-lon-1.linodeobjects.com",
  "it-mil-1": "https://it-mil-1.linodeobjects.com",
  "br-gru-1": "https://br-gru-1.linodeobjects.com",
  "sg-sin-1": "https://sg-sin-1.linodeobjects.com",
  "jp-tyo-3": "https://jp-tyo-3.linodeobjects.com",
  "au-mel-1": "https://au-mel-1.linodeobjects.com",
};

function resolveEndpoint(region: string): string {
  const trimmed = region.trim().toLowerCase();
  // If the user provided a full URL, use it directly
  if (trimmed.startsWith("https://")) return trimmed;
  // Check the map
  if (LINODE_ENDPOINT_MAP[trimmed]) return LINODE_ENDPOINT_MAP[trimmed];
  // Fallback: construct from region
  return `https://${trimmed}.linodeobjects.com`;
}

function getS3Client() {
  const region = (process.env.LINODE_REGION || "ap-south-1").trim();
  const accessKeyId = (process.env.LINODE_ACCESS_KEY || "").trim();
  const secretAccessKey = (process.env.LINODE_SECRET_KEY || "").trim();
  const endpoint = resolveEndpoint(region);

  console.log("[v0] S3 Config - region:", region);
  console.log("[v0] S3 Config - resolved endpoint:", endpoint);
  console.log("[v0] S3 Config - accessKeyId length:", accessKeyId.length);
  console.log("[v0] S3 Config - bucket:", process.env.LINODE_BUCKET);
  console.log("[v0] S3 Config - objectKey:", process.env.LINODE_OBJECT_KEY);

  return new S3Client({
    region: "us-east-1", // dummy region - Linode ignores this, endpoint is what matters
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
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
