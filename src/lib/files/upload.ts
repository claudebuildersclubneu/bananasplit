/**
 * Uploading a Notes file (or an image in a note) from the browser, the one
 * way every screen should do it (redesign guide 11.2):
 *
 *   const result = await uploadNoteFile(orgId, file, { visibility, folderId, onProgress });
 *   if (!result.ok) setError(result.error); else open(result.file.id);
 *
 * It asks the server first (POST /api/orgs/{orgId}/files/uploads: the
 * plan's largest file and the space's room, with the numbers in the
 * refusal), then sends the file through the route (up to 4 MB, or more on a
 * local server) or straight to blob storage (src/server/storage/direct.ts),
 * and for a direct upload tells the server it finished, which records it.
 * Errors come back as the server's sentence ("This file is 312 MB. Your
 * plan allows files up to 250 MB.").
 */

export interface UploadedNoteFile {
  id: string;
  name: string;
}

export type UploadNoteFileResult =
  | { ok: true; file: UploadedNoteFile }
  | { ok: false; error: string; code?: string };

export interface UploadNoteFileOptions {
  visibility?: "PRIVATE" | "ORGANIZATION";
  folderId?: string | null;
  /** 0 to 100, for a direct upload's progress bar. */
  onProgress?: (percent: number) => void;
}

async function failure(res: Response, fallback: string): Promise<UploadNoteFileResult> {
  const body = (await res.json().catch(() => null)) as { error?: unknown; code?: unknown } | null;
  return {
    ok: false,
    error: typeof body?.error === "string" ? body.error : fallback,
    code: typeof body?.code === "string" ? body.code : undefined,
  };
}

export async function uploadNoteFile(
  orgId: string,
  file: File,
  options: UploadNoteFileOptions = {},
): Promise<UploadNoteFileResult> {
  const base = `/api/orgs/${encodeURIComponent(orgId)}/files`;
  const visibility = options.visibility ?? "ORGANIZATION";

  const preflight = await fetch(`${base}/uploads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: file.name, sizeBytes: file.size }),
  });
  if (!preflight.ok) return failure(preflight, "The upload failed.");
  const plan = (await preflight.json()) as
    | { mode: "route" }
    | { mode: "direct"; key: string; multipart: boolean; contentType: string };

  if (plan.mode === "route") {
    const form = new FormData();
    form.set("file", file);
    form.set("visibility", visibility);
    if (options.folderId) form.set("folderId", options.folderId);
    const res = await fetch(base, { method: "POST", body: form });
    if (!res.ok) return failure(res, "The upload failed.");
    options.onProgress?.(100);
    return { ok: true, file: ((await res.json()) as { file: UploadedNoteFile }).file };
  }

  try {
    const { upload } = await import("@vercel/blob/client");
    await upload(plan.key, file, {
      access: "private",
      handleUploadUrl: `${base}/upload-token`,
      clientPayload: JSON.stringify({ sizeBytes: file.size }),
      contentType: plan.contentType,
      multipart: plan.multipart,
      onUploadProgress: ({ percentage }) => options.onProgress?.(Math.round(percentage)),
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error && error.message
          ? `The upload failed: ${error.message}`
          : "The upload failed. Try again.",
    };
  }

  const done = await fetch(`${base}/complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      key: plan.key,
      name: file.name,
      visibility,
      folderId: options.folderId ?? null,
    }),
  });
  if (!done.ok) return failure(done, "The upload failed.");
  return { ok: true, file: ((await done.json()) as { file: UploadedNoteFile }).file };
}
