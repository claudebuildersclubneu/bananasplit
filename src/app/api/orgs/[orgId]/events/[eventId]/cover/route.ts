import { Prisma } from "@/generated/prisma/client";
import { NotFoundError } from "@/lib/auth/errors";
import { can } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { isCrossSite } from "@/lib/http/cross-site";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { withOrgTx, type OrgContext } from "@/server/db/context";
import {
  deleteStoredImage,
  ImageRejectedError,
  storeImage,
  type StoredImage,
} from "@/server/images";
import { STORAGE_NOT_SET_UP, StorageConfigError } from "@/server/storage";
import { readUpload, uploadErrorResponse } from "@/server/storage/upload";

/**
 * POST   /api/orgs/{orgId}/events/{eventId}/cover   multipart `file` (JPEG, PNG or WebP, 4 MB)
 * DELETE /api/orgs/{orgId}/events/{eventId}/cover
 *
 * The cover image on an event's public RSVP page (docs/features/rsvp.md).
 * OWNER/ADMIN (events.write). Like the logo: capped before the body is read,
 * sniffed by magic bytes, re-encoded by sharp into square WebP crops
 * (480/960, EXIF stripped) in the public store, then written to
 * Event.rsvpCover; the replaced crops are deleted after the row commits.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UPLOAD_LIMIT = { limit: 30, windowSec: 60 * 60 };

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

type Params = { params: Promise<{ orgId: string; eventId: string }> };
type Guard = { ok: true } | { ok: false; response: Response };

async function guard(request: Request, orgId: string): Promise<Guard> {
  if (isCrossSite(request)) return { ok: false, response: json(403, { error: "Forbidden." }) };
  const session = await getSession();
  if (!session) return { ok: false, response: json(401, { error: "Sign in first." }) };
  try {
    const role = await withOrgTx(orgId, async (ctx) => ctx.role);
    if (!can({ role }, "events.write")) {
      return {
        ok: false,
        response: json(403, { error: "Only owners and admins can change the cover." }),
      };
    }
  } catch (error) {
    if (error instanceof NotFoundError)
      return { ok: false, response: json(404, { error: "Not found." }) };
    throw error;
  }
  return { ok: true };
}

/** Writes the cover and returns the one it replaced (undefined when the event is gone). */
async function writeCover(ctx: OrgContext, eventId: string, cover: StoredImage | null) {
  const before = await ctx.db.event.findFirst({
    where: { id: eventId, organizationId: ctx.organizationId, deletedAt: null },
    select: { id: true, rsvpCover: true },
  });
  if (!before) return undefined;
  await ctx.db.event.update({
    where: { id: before.id },
    data: {
      rsvpCover: cover === null ? Prisma.DbNull : (cover as unknown as Prisma.InputJsonObject),
    },
  });
  return { previous: before.rsvpCover };
}

export async function POST(request: Request, { params }: Params) {
  const { orgId, eventId } = await params;
  const g = await guard(request, orgId);
  if (!g.ok) return g.response;

  const limited = await checkRateLimit(
    rateLimitKey("event-cover-upload", orgId),
    UPLOAD_LIMIT.limit,
    UPLOAD_LIMIT.windowSec,
  );
  if (!limited.allowed) return json(429, { error: "Too many uploads recently. Try again later." });

  const upload = await readUpload(request).catch(uploadErrorResponse);
  if (upload instanceof Response) return upload;

  let stored: StoredImage;
  try {
    stored = await storeImage("event-covers", orgId, "cover", upload.file.bytes);
  } catch (error) {
    if (error instanceof ImageRejectedError) return json(415, { error: error.message });
    if (error instanceof StorageConfigError) {
      console.error("[event-cover] storage not configured:", error.message);
      return json(503, { error: STORAGE_NOT_SET_UP });
    }
    throw error;
  }

  let written;
  try {
    written = await withOrgTx(orgId, (ctx) => writeCover(ctx, eventId, stored));
  } catch (error) {
    await deleteStoredImage(stored).catch(() => undefined);
    throw error;
  }
  if (!written) {
    await deleteStoredImage(stored).catch(() => undefined);
    return json(404, { error: "That event no longer exists." });
  }
  await deleteStoredImage(written.previous).catch((e) =>
    console.warn("[event-cover] old crops not deleted", e),
  );
  return json(200, { cover: { s480: stored.s480, s960: stored.s960 } });
}

export async function DELETE(request: Request, { params }: Params) {
  const { orgId, eventId } = await params;
  const g = await guard(request, orgId);
  if (!g.ok) return g.response;
  const written = await withOrgTx(orgId, (ctx) => writeCover(ctx, eventId, null));
  if (!written) return json(404, { error: "That event no longer exists." });
  await deleteStoredImage(written.previous).catch((e) =>
    console.warn("[event-cover] old crops not deleted", e),
  );
  return json(200, { cover: null });
}
