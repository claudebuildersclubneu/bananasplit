import { NextResponse } from "next/server";

import { ForbiddenError, NotFoundError } from "@/lib/auth/errors";
import { requireUser } from "@/lib/auth/session";
import { isCrossSite } from "@/lib/http/cross-site";
import { checkRateLimit, rateLimitKey, retryAfterText } from "@/lib/rate-limit";
import { DatabaseInputError, importDatabase } from "@/server/databases/custom";
import { withOrgTx, withUserTx } from "@/server/db/context";
import { AppError } from "@/server/db/errors";
import { readUpload, UploadError } from "@/server/storage/upload";

/**
 * A new club-made database from a spreadsheet (Databases › New database ›
 * Import a spreadsheet): POST multipart with the CSV as `file` and the
 * database's `name`. A route handler, not a Server Action, because a Server
 * Action's body is capped at 1 MB and a spreadsheet may be 4 MB. The body
 * is capped before it is read (readUpload), parsed in memory and never
 * stored. Owners and admins only (importDatabase checks the role, RLS the
 * writes); rate-limited to 20 imports an hour per person.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  // Multipart posts skip the framework's Server Action origin check.
  if (isCrossSite(request)) return json({ error: "Forbidden." }, 403);
  const { orgSlug } = await ctx.params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return json({ error: "Sign in again." }, 401);
  }
  const resolved = await withUserTx(
    user.id,
    ({ db }) =>
      db.$queryRaw<
        { organizationId: string }[]
      >`SELECT "organizationId" FROM app.resolve_org_slug(${orgSlug})`,
  );
  const orgId = resolved[0]?.organizationId;
  if (!orgId) return json({ error: "Not found." }, 404);

  const limit = await checkRateLimit(rateLimitKey("db-create-import", user.id), 20, 3600);
  if (!limit.allowed) {
    return json({ error: `Too many imports. Try again ${retryAfterText(limit)}.` }, 429);
  }

  let upload;
  try {
    upload = await readUpload(request, { maxBytes: MAX_BYTES });
  } catch (error) {
    if (error instanceof UploadError) {
      return json(
        {
          error:
            error.status === 413
              ? "That file is over 4 MB. Split it, or export fewer columns."
              : error.message,
        },
        error.status,
      );
    }
    throw error;
  }
  const csv = upload.file.bytes.toString("utf8");
  // A spreadsheet saved as .xlsx (or any binary file) is full of NUL bytes.
  if (csv.includes("\u0000")) {
    return json(
      {
        error:
          "That doesn't look like a CSV file. In Google Sheets or Excel: File › Download › CSV.",
      },
      400,
    );
  }
  const name = (upload.fields.name ?? "").slice(0, 200);

  try {
    const summary = await withOrgTx(orgId, (octx) =>
      importDatabase(
        { db: octx.db, organizationId: orgId, userId: octx.userId, role: octx.role },
        { name, csv },
      ),
    );
    return json(summary);
  } catch (error) {
    if (error instanceof DatabaseInputError) return json({ error: error.message }, 400);
    if (error instanceof NotFoundError) return json({ error: "Not found." }, 404);
    if (error instanceof ForbiddenError) return json({ error: error.message }, 403);
    if (error instanceof AppError) return json({ error: error.message }, error.status);
    console.error("[databases] import failed", error instanceof Error ? error.message : error);
    return json({ error: "The import failed. Nothing was saved." }, 500);
  }
}
