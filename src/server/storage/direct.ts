import { assertNoTx } from "@/server/db/context";

import { DATABASE_BLOB_MAX_BYTES } from "./database-driver";
import { storeToken } from "./drivers";
import { randomKeyId } from "./index";
import { MAX_UPLOAD_BYTES, scopePrefix, storageKey } from "./kinds";

/**
 * Big files straight from the browser to blob storage (redesign guide
 * 11.2). Route handlers take request bodies up to about 4.5 MB on Vercel,
 * so a Notes file over DIRECT_UPLOAD_THRESHOLD goes like this:
 *
 *   1. POST /api/orgs/{orgId}/files/uploads (JSON: name, size): the upload
 *      gate (src/server/storage/quota.ts) and the way to send it. Direct:
 *      a key the server picked, files/{orgId}/{random}.
 *   2. @vercel/blob/client upload() asks POST
 *      /api/orgs/{orgId}/files/upload-token for a client token: the gate
 *      again, then a token for that one key, capped at the declared size,
 *      only the Notes types, valid DIRECT_TOKEN_TTL_MS, no overwrite.
 *   3. The browser uploads to the store (multipart for big files).
 *   4. POST /api/orgs/{orgId}/files/complete: the server reads the blob's
 *      real size and type from the store, sniffs its first and last bytes,
 *      runs the gate once more with the real size, and writes the OrgFile
 *      row as the uploader (RLS), with the quota re-checked in the row's
 *      transaction. Anything refused is deleted from the store.
 *
 * The browser drives step 4 (the store's own completion callback can't
 * reach a local server, and a Personal space's uploader has no service
 * path to OrgFile). A blob whose step 4 never came is swept by the nightly
 * storage job a day later (sweepDirectOrphans).
 *
 * Without a Vercel Blob private store (local disk, Postgres) there is no
 * direct path: files go through the route, up to inRouteMaxBytes().
 */

/** Files above this go straight to the store (when there is one). */
export const DIRECT_UPLOAD_THRESHOLD = MAX_UPLOAD_BYTES;

/** Above this, the browser uploads in parts. */
export const MULTIPART_THRESHOLD = 32 * 1024 * 1024;

/** How long a client token is good for. */
export const DIRECT_TOKEN_TTL_MS = 15 * 60 * 1000;

/** A direct upload with no row after this long is an orphan. */
export const ORPHAN_AFTER_MS = 24 * 60 * 60 * 1000;

type Env = Record<string, string | undefined>;

/** Whether this deployment has a Vercel Blob private store the browser can upload to. */
export function directUploadsAvailable(env: Env = process.env): boolean {
  if (env.FILE_STORAGE?.trim().toLowerCase() === "database") return false;
  return Boolean(storeToken("private", env));
}

/**
 * The largest file the upload route takes in its body: about 4 MB on
 * Vercel (its function body limit), the database's blob cap elsewhere
 * (local development, a self-hosted server).
 */
export function inRouteMaxBytes(env: Env = process.env): number {
  return env.VERCEL ? MAX_UPLOAD_BYTES : DATABASE_BLOB_MAX_BYTES;
}

const KEY_ID = /^[A-Za-z0-9_-]{22,64}$/;

/** A fresh key for a direct upload to `orgId`'s Notes files. */
export function directUploadKey(orgId: string): string {
  return storageKey("files", orgId, randomKeyId(18));
}

/** Whether `key` is one directUploadKey() could have made for `orgId`. */
export function isDirectUploadKey(orgId: string, key: unknown): key is string {
  if (typeof key !== "string") return false;
  let prefix: string;
  try {
    prefix = scopePrefix("files", orgId);
  } catch {
    return false;
  }
  return key.startsWith(prefix) && KEY_ID.test(key.slice(prefix.length));
}

function token(): string {
  const t = storeToken("private");
  if (!t) throw new Error("direct uploads need BLOB_READ_WRITE_TOKEN");
  return t;
}

/** The blob's size and declared type in the store, or null when it isn't there. */
export async function headDirectUpload(key: string): Promise<{ size: number; contentType: string } | null> {
  assertNoTx("headDirectUpload");
  const { head, BlobNotFoundError } = await import("@vercel/blob");
  try {
    const blob = await head(key, { token: token() });
    return { size: blob.size, contentType: blob.contentType };
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw error;
  }
}

async function readRange(key: string, range: string): Promise<Buffer> {
  const { get } = await import("@vercel/blob");
  const result = await get(key, { access: "private", token: token(), headers: { Range: range } });
  if (!result?.stream) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  for await (const chunk of result.stream as unknown as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** The first and last `bytes` of a stored blob, for sniffing (src/lib/files/types.ts). */
export async function readDirectUploadEdges(
  key: string,
  size: number,
  bytes = 64 * 1024,
): Promise<{ head: Buffer; tail: Buffer }> {
  assertNoTx("readDirectUploadEdges");
  const head = (await readRange(key, `bytes=0-${bytes - 1}`)).subarray(0, bytes);
  const tail =
    size <= bytes ? head : (await readRange(key, `bytes=-${bytes}`)).subarray(-bytes);
  return { head, tail };
}

/**
 * Deletes direct uploads under `orgId` that never got a row (`known` holds
 * every OrgFile.storageKey of the org) and are older than ORPHAN_AFTER_MS.
 * Only the Vercel Blob store has direct uploads; returns how many went.
 */
export async function sweepDirectOrphans(
  orgId: string,
  known: ReadonlySet<string>,
  now: Date = new Date(),
): Promise<number> {
  assertNoTx("sweepDirectOrphans");
  if (!directUploadsAvailable()) return 0;
  const { list, del } = await import("@vercel/blob");
  const prefix = scopePrefix("files", orgId);
  const orphans: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000, token: token() });
    for (const blob of page.blobs) {
      if (known.has(blob.pathname)) continue;
      if (now.getTime() - new Date(blob.uploadedAt).getTime() < ORPHAN_AFTER_MS) continue;
      orphans.push(blob.pathname);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  for (let i = 0; i < orphans.length; i += 500) {
    await del(orphans.slice(i, i + 500), { token: token() });
  }
  return orphans.length;
}
