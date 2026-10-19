import { NotFoundError } from "@/lib/auth/errors";
import { getSession } from "@/lib/auth/session";
import { isCrossSite } from "@/lib/http/cross-site";
import { FileRejectedError, recordDirectUpload } from "@/server/notes/files";
import { directUploadsAvailable } from "@/server/storage/direct";
import { UploadRefusedError, uploadRefusalResponse } from "@/server/storage/quota";

/**
 * POST /api/orgs/{orgId}/files/complete (JSON { key, name, visibility,
 * folderId }): the last step of a direct upload
 * (src/server/storage/direct.ts, step 4). The server reads the blob's real
 * size and type from the store, sniffs its bytes, runs the upload gate
 * with the real size and records the OrgFile as the caller under RLS, the
 * quota re-checked in the row's transaction (recordDirectUpload). A
 * refused upload is deleted from the store. Repeating it returns the same
 * file.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  if (isCrossSite(request)) return json(403, { error: "Forbidden." });
  if (!directUploadsAvailable()) return json(404, { error: "Direct uploads aren't set up here." });
  const session = await getSession();
  if (!session) return json(401, { error: "Sign in to upload." });
  const { orgId } = await params;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const key = body?.key;
  const name = typeof body?.name === "string" ? body.name.slice(0, 255) : "";
  const folderId = typeof body?.folderId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(body.folderId) ? body.folderId : null;
  if (typeof key !== "string") return json(400, { error: "No file provided." });

  try {
    const file = await recordDirectUpload({
      orgId,
      key,
      filename: name,
      visibility: body?.visibility === "PRIVATE" ? "PRIVATE" : "ORGANIZATION",
      folderId,
    });
    return json(200, { file: { id: file.id, name: file.name } });
  } catch (error) {
    if (error instanceof UploadRefusedError) return uploadRefusalResponse(error.refusal);
    if (error instanceof FileRejectedError) return json(error.status, { error: error.message });
    if (error instanceof NotFoundError) return json(404, { error: "Not found." });
    throw error;
  }
}
