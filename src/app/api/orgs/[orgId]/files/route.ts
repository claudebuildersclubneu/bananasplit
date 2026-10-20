import { NotFoundError } from "@/lib/auth/errors";
import { getSession } from "@/lib/auth/session";
import { uploadRefusal } from "@/lib/billing/storage";
import { isCrossSite } from "@/lib/http/cross-site";
import { checkRateLimit, rateLimitKey, retryAfterText } from "@/lib/rate-limit";
import { FileRejectedError, storeNoteFile } from "@/server/notes/files";
import { STORAGE_NOT_SET_UP, StorageConfigError } from "@/server/storage";
import { inRouteMaxBytes } from "@/server/storage/direct";
import { gateUpload, UploadRefusedError, uploadRefusalResponse } from "@/server/storage/quota";
import { readUpload, uploadErrorResponse } from "@/server/storage/upload";

/**
 * POST /api/orgs/{orgId}/files: a file for the Notes page, or an image in a
 * note (multipart `file`, optional `visibility` PRIVATE | ORGANIZATION,
 * default ORGANIZATION, and optional `folderId`, a Notes folder of this
 * org; the database checks it). Any member may upload; the type is sniffed
 * from the bytes; the row is written as the uploader under RLS.
 *
 * The upload gate (src/server/storage/quota.ts) runs before the body is
 * read: the space must include notes and files and not be paused (the
 * same spaceRefusal the actions use), the declared size must be within the
 * plan's largest file and fit the space's storage; it runs again with the
 * real size, and once more in the row's transaction. Refusals are JSON
 * 4xx with the numbers (code, sizeBytes, usedBytes, limitBytes,
 * maxFileBytes).
 *
 * The body is capped at inRouteMaxBytes() (about 4 MB on Vercel): bigger
 * files go straight to blob storage (POST ./uploads, src/lib/files/upload.ts).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UPLOADS_PER_HOUR = 60;

/** The multipart envelope around the file (readUpload allows the same). */
const MULTIPART_OVERHEAD = 64 * 1024;

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  if (isCrossSite(request)) return json(403, { error: "Forbidden." });
  const session = await getSession();
  if (!session) return json(401, { error: "Sign in to upload." });
  const { orgId } = await params;

  let gate;
  try {
    // The space first (a non-member gets 404 before the body is read).
    gate = await gateUpload(orgId, 0, { feature: "files" });
  } catch (error) {
    if (error instanceof NotFoundError) return json(404, { error: "Not found." });
    throw error;
  }
  if (gate.refusal) return uploadRefusalResponse(gate.refusal);

  const limit = await checkRateLimit(rateLimitKey("note-file", session.user.id), UPLOADS_PER_HOUR, 60 * 60);
  if (!limit.allowed) return json(429, { error: `Too many uploads. Try again ${retryAfterText(limit)}.` });

  // The declared size, before reading a byte: the plan's largest file, the route's cap, the room left.
  const routeMaxBytes = inRouteMaxBytes();
  const declared = Number(request.headers.get("content-length") ?? "NaN");
  if (Number.isFinite(declared)) {
    // At most the file's real size, so whatever this refuses, the real file would be too.
    const approx = Math.max(0, declared - MULTIPART_OVERHEAD);
    const early = uploadRefusal(gate.space, approx, {
      feature: "files",
      routeMaxBytes,
      canManagePlan: gate.canManagePlan,
    });
    if (early) return uploadRefusalResponse(early);
  }

  const upload = await readUpload(request, {
    maxBytes: Math.min(gate.state.maxFileBytes, routeMaxBytes),
  }).catch(uploadErrorResponse);
  if (upload instanceof Response) return upload;
  const visibility = upload.fields.visibility === "PRIVATE" ? "PRIVATE" : "ORGANIZATION";

  try {
    const file = await storeNoteFile({
      orgId,
      bytes: upload.file.bytes,
      filename: upload.file.filename,
      visibility,
      folderId: /^[A-Za-z0-9_-]{1,64}$/.test(upload.fields.folderId ?? "") ? upload.fields.folderId : null,
    });
    return json(200, { file: { id: file.id, name: file.name } });
  } catch (error) {
    if (error instanceof UploadRefusedError) return uploadRefusalResponse(error.refusal);
    if (error instanceof FileRejectedError) return json(error.status, { error: error.message });
    if (error instanceof StorageConfigError) return json(503, { error: STORAGE_NOT_SET_UP });
    if (error instanceof NotFoundError) return json(404, { error: "Not found." });
    throw error;
  }
}
