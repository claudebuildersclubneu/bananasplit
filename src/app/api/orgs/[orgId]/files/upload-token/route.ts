import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { NotFoundError } from "@/lib/auth/errors";
import { getSession } from "@/lib/auth/session";
import { isCrossSite } from "@/lib/http/cross-site";
import { NOTE_FILE_TYPES } from "@/server/storage/kinds";
import { storeToken } from "@/server/storage/drivers";
import {
  DIRECT_TOKEN_TTL_MS,
  directUploadsAvailable,
  isDirectUploadKey,
} from "@/server/storage/direct";
import { checkUpload, UploadRefusedError, uploadRefusalResponse } from "@/server/storage/quota";

/**
 * POST /api/orgs/{orgId}/files/upload-token: the client-token half of a
 * direct upload (src/server/storage/direct.ts, step 2), in
 * @vercel/blob/client's handleUpload protocol. Only token requests from a
 * signed-in member are answered: the key must be one of this org's Notes
 * keys, and the upload gate runs again with the declared size (the
 * browser's clientPayload { sizeBytes }), so a token is never issued past
 * the plan's largest file or the space's room. The token is for that one
 * key, at most that many bytes, only the Notes types, for
 * DIRECT_TOKEN_TTL_MS, with no overwrite.
 *
 * The store's completion callback isn't used (no callbackUrl): the browser
 * reports completion to ./complete, which records the file as the
 * uploader. Any other event is refused.
 */
export const dynamic = "force-dynamic";

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  if (isCrossSite(request)) return json(403, { error: "Forbidden." });
  if (!directUploadsAvailable()) return json(404, { error: "Direct uploads aren't set up here." });
  const session = await getSession();
  if (!session) return json(401, { error: "Sign in to upload." });
  const { orgId } = await params;

  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (body?.type !== "blob.generate-client-token") return json(400, { error: "Bad request." });

  try {
    const result = await handleUpload({
      body,
      request,
      token: storeToken("private"),
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!isDirectUploadKey(orgId, pathname)) throw new NotFoundError();
        const payload = JSON.parse(clientPayload ?? "{}") as { sizeBytes?: unknown };
        const sizeBytes = Number(payload.sizeBytes);
        if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) throw new NotFoundError();
        const refusal = await checkUpload(orgId, sizeBytes, { feature: "files" });
        if (refusal) throw new UploadRefusedError(refusal);
        return {
          allowedContentTypes: [...NOTE_FILE_TYPES],
          maximumSizeInBytes: sizeBytes,
          validUntil: Date.now() + DIRECT_TOKEN_TTL_MS,
          addRandomSuffix: false,
          allowOverwrite: false,
          tokenPayload: JSON.stringify({ orgId, userId: session.user.id }),
        };
      },
    });
    return json(200, result as unknown as Record<string, unknown>);
  } catch (error) {
    if (error instanceof UploadRefusedError) return uploadRefusalResponse(error.refusal);
    if (error instanceof NotFoundError || error instanceof SyntaxError) {
      return json(404, { error: "Not found." });
    }
    throw error;
  }
}
