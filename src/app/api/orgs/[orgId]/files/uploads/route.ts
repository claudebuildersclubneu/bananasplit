import { NotFoundError } from "@/lib/auth/errors";
import { getSession } from "@/lib/auth/session";
import { formatStorage } from "@/lib/billing/storage";
import { noteFileTypeFromName } from "@/lib/files/types";
import { isCrossSite } from "@/lib/http/cross-site";
import { checkRateLimit, rateLimitKey, retryAfterText } from "@/lib/rate-limit";
import {
  DIRECT_UPLOAD_THRESHOLD,
  directUploadKey,
  directUploadsAvailable,
  inRouteMaxBytes,
  MULTIPART_THRESHOLD,
} from "@/server/storage/direct";
import { gateUpload, uploadRefusalResponse } from "@/server/storage/quota";

/**
 * POST /api/orgs/{orgId}/files/uploads (JSON { name, sizeBytes }): before
 * a Notes file is sent, the upload gate (the space, the plan's largest
 * file, the room left; src/server/storage/quota.ts) and how to send it:
 *
 *   { mode: "route" }    multipart to POST /api/orgs/{orgId}/files
 *   { mode: "direct", key, multipart, contentType }
 *                        straight to blob storage with @vercel/blob/client
 *                        upload(key, file, { handleUploadUrl: ./upload-token }),
 *                        then POST ./complete { key, name, visibility, folderId }
 *
 * Files up to DIRECT_UPLOAD_THRESHOLD (4 MB) go through the route; bigger
 * ones directly when the deployment has a Vercel Blob store, else through
 * the route up to inRouteMaxBytes() (local development). The browser side
 * is uploadNoteFile() in src/lib/files/upload.ts.
 */
export const dynamic = "force-dynamic";

const PREFLIGHTS_PER_HOUR = 120;

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  if (isCrossSite(request)) return json(403, { error: "Forbidden." });
  const session = await getSession();
  if (!session) return json(401, { error: "Sign in to upload." });
  const { orgId } = await params;

  const body = (await request.json().catch(() => null)) as { name?: unknown; sizeBytes?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.slice(0, 255) : "";
  const sizeBytes = typeof body?.sizeBytes === "number" ? body.sizeBytes : NaN;
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) return json(400, { error: "No file provided." });

  const limit = await checkRateLimit(rateLimitKey("note-file-preflight", session.user.id), PREFLIGHTS_PER_HOUR, 60 * 60);
  if (!limit.allowed) return json(429, { error: `Too many uploads. Try again ${retryAfterText(limit)}.` });

  let gate;
  try {
    gate = await gateUpload(orgId, sizeBytes, { feature: "files" });
  } catch (error) {
    if (error instanceof NotFoundError) return json(404, { error: "Not found." });
    throw error;
  }
  if (gate.refusal) return uploadRefusalResponse(gate.refusal);

  const routeMax = inRouteMaxBytes();
  if (sizeBytes <= DIRECT_UPLOAD_THRESHOLD) return json(200, { mode: "route" });
  if (directUploadsAvailable()) {
    const contentType = noteFileTypeFromName(name);
    if (!contentType) {
      return json(415, {
        error:
          "That file type isn't supported. Upload a PDF, Word, PowerPoint, Excel, image, text, Markdown or CSV file.",
      });
    }
    return json(200, {
      mode: "direct",
      key: directUploadKey(orgId),
      multipart: sizeBytes > MULTIPART_THRESHOLD,
      contentType,
    });
  }
  if (sizeBytes <= routeMax) return json(200, { mode: "route" });
  return json(413, {
    error: `This file is ${formatStorage(sizeBytes)}. This server takes files up to ${formatStorage(routeMax)}; bigger ones need a Vercel Blob store, so ask whoever runs Bananasplit to add one.`,
    code: "FILE_TOO_LARGE",
    sizeBytes,
    maxFileBytes: routeMax,
  });
}
