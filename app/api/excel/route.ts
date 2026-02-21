import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// ─────────────────────────────────────────────────
// Linode Object Storage helper using raw S3 v4 signing
// This bypasses AWS SDK issues with Linode entirely.
// Endpoint: https://{bucket}.{region}.linodeobjects.com/{key}
// ─────────────────────────────────────────────────

function getConfig() {
  const region = (process.env.LINODE_REGION || "in-maa-1").trim();
  const accessKey = (process.env.LINODE_ACCESS_KEY || "").trim();
  const secretKey = (process.env.LINODE_SECRET_KEY || "").trim();
  const bucket = (process.env.LINODE_BUCKET || "").trim();
  const objectKey = (process.env.LINODE_OBJECT_KEY || "data.xlsx").trim();
  const host = `${bucket}.${region}.linodeobjects.com`;
  const baseUrl = `https://${host}`;

  console.log("[v0] Config - region:", region);
  console.log("[v0] Config - host:", host);
  console.log("[v0] Config - baseUrl:", baseUrl);
  console.log("[v0] Config - accessKey first4:", accessKey.substring(0, 4));
  console.log("[v0] Config - bucket:", bucket);
  console.log("[v0] Config - objectKey:", objectKey);

  return { region, accessKey, secretKey, bucket, objectKey, host, baseUrl };
}

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

// ─── AWS Signature V4 helpers ────────────────────

function hmacSHA256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmacSHA256(Buffer.from("AWS4" + secretKey, "utf8"), dateStamp);
  const kRegion = hmacSHA256(kDate, region);
  const kService = hmacSHA256(kRegion, service);
  const kSigning = hmacSHA256(kService, "aws4_request");
  return kSigning;
}

function signRequest(
  method: string,
  host: string,
  path: string,
  accessKey: string,
  secretKey: string,
  region: string,
  body: Buffer | null,
  contentType?: string
): Record<string, string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const dateStamp = amzDate.substring(0, 8);
  const service = "s3";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const payloadHash = body ? sha256Hex(body) : sha256Hex("");

  const headers: Record<string, string> = {
    host: host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };

  if (contentType) {
    headers["content-type"] = contentType;
  }

  const signedHeaderKeys = Object.keys(headers).sort();
  const signedHeaders = signedHeaderKeys.join(";");
  const canonicalHeaders = signedHeaderKeys.map((k) => `${k}:${headers[k]}\n`).join("");

  const canonicalRequest = [
    method,
    "/" + path,
    "", // no query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature = hmacSHA256(signingKey, stringToSign).toString("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    Authorization: authorization,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

// ─── POST: Upload Excel to Linode ────────────────

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

    const config = getConfig();
    const body = Buffer.from(await file.arrayBuffer());
    const contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const headers = signRequest(
      "PUT",
      config.host,
      config.objectKey,
      config.accessKey,
      config.secretKey,
      config.region,
      body,
      contentType
    );

    const url = `${config.baseUrl}/${config.objectKey}`;
    console.log("[v0] Uploading to:", url);

    const res = await fetch(url, {
      method: "PUT",
      headers,
      body,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[v0] Upload response status:", res.status);
      console.error("[v0] Upload response body:", errText);
      return NextResponse.json(
        { error: `Upload failed (${res.status}): ${errText}` },
        { status: 500 }
      );
    }

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
    return NextResponse.json(
      { error: "Upload failed: " + message },
      { status: 500 }
    );
  }
}

// ─── GET: Download Excel from Linode ─────────────

export async function GET() {
  try {
    const config = getConfig();

    const headers = signRequest(
      "GET",
      config.host,
      config.objectKey,
      config.accessKey,
      config.secretKey,
      config.region,
      null
    );

    const url = `${config.baseUrl}/${config.objectKey}`;
    console.log("[v0] Downloading from:", url);

    const res = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[v0] Download response status:", res.status);
      console.error("[v0] Download response body:", errText);

      if (res.status === 404) {
        return NextResponse.json(
          { error: "No file found in storage" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `Download failed (${res.status}): ${errText}` },
        { status: 500 }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return NextResponse.json({
      success: true,
      data: base64,
      contentType:
        res.headers.get("content-type") ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      lastModified: res.headers.get("last-modified") || undefined,
      size: arrayBuffer.byteLength,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("[v0] Download error:", message);
    return NextResponse.json(
      { error: "Failed to load from Linode: " + message },
      { status: 500 }
    );
  }
}
