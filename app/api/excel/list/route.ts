import { NextResponse } from "next/server";
import { getConfig, signRequest } from "@/lib/s3-signer";
import { keyToPeriod } from "@/lib/data-helpers";

export const runtime = "nodejs";

export async function GET() {
    try {
        const config = getConfig();

        // AWS S3 ListObjectsV2 query params
        const queryParams = {
            prefix: "months/",
            delimiter: "/",
        };

        const headers = signRequest(
            "GET",
            config.host,
            "", // Path is empty for listing bucket (root)
            config.accessKey,
            config.secretKey,
            config.region,
            null,
            undefined,
            queryParams
        );

        const url = `${config.baseUrl}/?${new URLSearchParams(queryParams).toString()}`;
        const res = await fetch(url, { method: "GET", headers });

        if (!res.ok) {
            const errText = await res.text();
            return NextResponse.json(
                { error: `List failed (${res.status}): ${errText}` },
                { status: 500 }
            );
        }

        const xml = await res.text();

        // Simple XML parsing using regex for the S3 response
        // Next.js doesn't have a built-in XML parser and DOMParser is browser-only
        const contentsMatch = xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g);
        const months = [];

        for (const match of contentsMatch) {
            const content = match[1];
            const key = content.match(/<Key>(.*?)<\/Key>/)?.[1];
            const lastModified = content.match(/<LastModified>(.*?)<\/LastModified>/)?.[1];
            const size = parseInt(content.match(/<Size>(.*?)<\/Size>/)?.[1] || "0");

            if (key && key.endsWith(".xlsx")) {
                const monthKey = key.replace("months/", "").replace(".xlsx", "");
                months.push({
                    key,
                    monthKey,
                    period: keyToPeriod(monthKey),
                    lastModified,
                    size,
                });
            }
        }

        // Sort descending by monthKey (YYYY-MM)
        months.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

        return NextResponse.json({
            success: true,
            months,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[v0] List error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
