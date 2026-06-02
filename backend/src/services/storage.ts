import { Client as MinioClient } from "minio";
import { env } from "../env";

let _client: MinioClient | null = null;

export function storage(): MinioClient {
  if (_client) return _client;
  const e = env();
  const u = new URL(e.S3_ENDPOINT);
  _client = new MinioClient({
    endPoint: u.hostname,
    port: Number(u.port) || (u.protocol === "https:" ? 443 : 80),
    useSSL: u.protocol === "https:",
    accessKey: e.S3_ACCESS_KEY,
    secretKey: e.S3_SECRET_KEY,
    pathStyle: e.S3_FORCE_PATH_STYLE,
    region: e.S3_REGION,
  });
  return _client;
}

export async function ensureBucket(name?: string): Promise<string> {
  const e = env();
  const bucket = name ?? e.S3_BUCKET;
  const c = storage();
  const exists = await c.bucketExists(bucket).catch(() => false);
  if (!exists) {
    await c.makeBucket(bucket, e.S3_REGION);
  }
  return bucket;
}
