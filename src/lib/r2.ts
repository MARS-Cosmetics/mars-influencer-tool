/**
 * Cloudflare R2 client + helpers.
 * R2 is S3-compatible — we use the AWS SDK v3 against the R2 endpoint.
 *
 * Bucket strategy: ONE private bucket. All KYC/contract docs use path prefixes.
 * No public access. Reads always go through presigned URLs with short TTL.
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

let _client: S3Client | null = null;

function client(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return _client;
}

export function bucket(): string {
  return requireEnv("R2_BUCKET");
}

// ============================================================
// Key construction
// ============================================================

/**
 * Build a deterministic, safe object key for the bucket.
 * Format: `{entityType}s/{slug}-{shortId}/{documentType}/{uuid}.{ext}`
 *   e.g. `agencies/glamhouse-talent-50bd76f0/aadhar/d4e5f6.pdf`
 *
 * - `slug` makes the path human-readable in the R2 dashboard.
 * - `shortId` (first 8 chars of the entityId) keeps it unique across same-named entities.
 * - File-name UUID prevents collisions; original filename is stored in DB.
 */
export function buildKey(args: {
  entityType: string;
  entityId: string;
  entityName?: string;
  documentType: string;
  filename: string;
}): string {
  const { entityType, entityId, entityName, documentType, filename } = args;
  const ext = (filename.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1] ?? "bin").toLowerCase();
  const uuid = randomUUID();
  const folder = `${entityType.toLowerCase()}s`;
  const slug = entityName ? slugify(entityName) : "";
  const shortId = entityId.slice(0, 8);
  const folderName = slug ? `${slug}-${shortId}` : entityId;
  return `${folder}/${folderName}/${documentType}/${uuid}.${ext}`;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// ============================================================
// Presigned URLs
// ============================================================

interface PresignUploadArgs {
  key: string;
  contentType: string;
  contentLength: number;
  expiresIn?: number;        // seconds, default 300 (5 min)
}

/**
 * Generate a presigned PUT URL for direct browser upload.
 * The signature includes Content-Type and Content-Length — R2 rejects
 * uploads that don't match exactly.
 */
export async function presignUpload(args: PresignUploadArgs): Promise<{ url: string }> {
  const cmd = new PutObjectCommand({
    Bucket: bucket(),
    Key: args.key,
    ContentType: args.contentType,
    ContentLength: args.contentLength,
  });
  const url = await getSignedUrl(client(), cmd, {
    expiresIn: args.expiresIn ?? 300,
    unhoistableHeaders: new Set(["host"]),
  });
  return { url };
}

interface PresignReadArgs {
  key: string;
  expiresIn?: number;          // seconds, default 60 (1 min)
  asAttachment?: boolean;       // forces download vs inline rendering
  filename?: string;            // suggested download filename
}

/**
 * Generate a presigned GET URL for reading. Default TTL is intentionally
 * very short (60s) — the URL is generated fresh on every view request,
 * so users never hold long-lived URLs.
 */
export async function presignRead(args: PresignReadArgs): Promise<{ url: string }> {
  const cmd = new GetObjectCommand({
    Bucket: bucket(),
    Key: args.key,
    ResponseContentDisposition: args.asAttachment
      ? `attachment; filename="${(args.filename ?? "download").replace(/"/g, "")}"`
      : undefined,
  });
  const url = await getSignedUrl(client(), cmd, {
    expiresIn: args.expiresIn ?? 60,
  });
  return { url };
}

// ============================================================
// Object operations
// ============================================================

export async function headObject(key: string): Promise<{
  exists: boolean;
  size?: number;
  contentType?: string;
}> {
  try {
    const res = await client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return {
      exists: true,
      size: res.ContentLength,
      contentType: res.ContentType,
    };
  } catch (err: unknown) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (e?.name === "NotFound" || e?.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    throw err;
  }
}

export async function deleteObject(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
