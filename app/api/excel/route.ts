import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getConfig, signRequest } from "@/lib/s3-signer";
import { detectPeriod, periodToKey } from "@/lib/data-helpers";

export const runtime = "nodejs";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Server-side detection to determine key
    const wb = XLSX.read(buffer, { type: "buffer", bookSheets: true });
    const period = detectPeriod(wb.SheetNames);
    const monthKey = periodToKey(period);
    const objectKey = `months/${monthKey}.xlsx`;

    const config = getConfig();
    const contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const headers = signRequest(
      "PUT",
      config.host,
      objectKey,
      config.accessKey,
      config.secretKey,
      config.region,
      buffer,
      contentType
    );

    const url = `${config.baseUrl}/${objectKey}`;
    console.log("[v0] Uploading to:", url);

    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: buffer,
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Upload failed (${res.status}): ${errText}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully to Linode Object Storage",
      period,
      key: monthKey,
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

export async function GET(request: NextRequest) {
  try {
    const config = getConfig();
    const { searchParams } = new URL(request.url);
    let month = searchParams.get("month");

    // If no month provided, we first list and pick the latest
    // But for now, we'll implement a fallback to the env key if month is missing
    // or call the internal list logic.
    if (!month) {
      const listRes = await fetch(new URL("/api/excel/list", request.url).toString());
      const listData = await listRes.json();
      if (listData.success && listData.months.length > 0) {
        month = listData.months[0].monthKey;
      } else {
        // Fallback to legacy key if env key is defined
        const legacyKey = (process.env.LINODE_OBJECT_KEY || "data.xlsx").trim();
        return await fetchAndReturnS3(config, legacyKey);
      }
    }

    const objectKey = `months/${month}.xlsx`;
    return await fetchAndReturnS3(config, objectKey);

  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("[v0] Download error:", message);
    return NextResponse.json(
      { error: "Failed to load from Linode: " + message },
      { status: 500 }
    );
  }
}

async function fetchAndReturnS3(config: any, objectKey: string) {
  const headers = signRequest(
    "GET",
    config.host,
    objectKey,
    config.accessKey,
    config.secretKey,
    config.region,
    null
  );

  const url = `${config.baseUrl}/${objectKey}`;
  const res = await fetch(url, { method: "GET", headers });

  if (!res.ok) {
    if (res.status === 404) {
      return NextResponse.json({ error: "No file found" }, { status: 404 });
    }
    const txt = await res.text();
    throw new Error(`S3 fetch failed (${res.status}): ${txt}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return NextResponse.json({
    success: true,
    data: base64,
    key: objectKey.replace("months/", "").replace(".xlsx", ""),
    size: arrayBuffer.byteLength,
  });
}
