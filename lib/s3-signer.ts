import crypto from "crypto";

export interface S3Config {
    region: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    host: string;
    baseUrl: string;
}

export function getConfig(): S3Config {
    const region = (process.env.LINODE_REGION || "in-maa-1").trim();
    const accessKey = (process.env.LINODE_ACCESS_KEY || "").trim();
    const secretKey = (process.env.LINODE_SECRET_KEY || "").trim();
    const bucket = (process.env.LINODE_BUCKET || "").trim();
    const host = `${bucket}.${region}.linodeobjects.com`;
    const baseUrl = `https://${host}`;

    return { region, accessKey, secretKey, bucket, host, baseUrl };
}

export function hmacSHA256(key: Buffer | string, data: string): Buffer {
    return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

export function sha256Hex(data: Buffer | string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
}

export function getSignatureKey(
    secretKey: string,
    dateStamp: string,
    region: string,
    service: string
): Buffer {
    const kDate = hmacSHA256(Buffer.from("AWS4" + secretKey, "utf8"), dateStamp);
    const kRegion = hmacSHA256(kDate, region);
    const kService = hmacSHA256(kRegion, service);
    const kSigning = hmacSHA256(kService, "aws4_request");
    return kSigning;
}

export function signRequest(
    method: string,
    host: string,
    path: string,
    accessKey: string,
    secretKey: string,
    region: string,
    body: Buffer | null,
    contentType?: string,
    queryParams: Record<string, string> = {}
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
    const canonicalHeaders = signedHeaderKeys
        .map((k) => `${k}:${headers[k]}\n`)
        .join("");

    const sortedQueryKeys = Object.keys(queryParams).sort();
    const queryString = sortedQueryKeys
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
        .join("&");

    const canonicalRequest = [
        method,
        "/" + path,
        queryString,
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
