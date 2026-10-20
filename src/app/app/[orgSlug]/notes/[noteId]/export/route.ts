import { NextResponse } from "next/server";

import { NotFoundError } from "@/lib/auth/errors";
import { getSession } from "@/lib/auth/session";
import { absoluteAppUrl } from "@/lib/app-url";
import { contentDisposition } from "@/lib/http/content-disposition";
import { noteToMarkdown } from "@/lib/notes/export/markdown";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { withOrgTx, withUserTx } from "@/server/db/context";
import { noteFilename, renderNoteDocx } from "@/server/notes/docx";

import { getNoteById } from "../../queries";

/**
 * GET /app/{orgSlug}/notes/{noteId}/export?format=docx|md: the note as a
 * Word document or Markdown, for anyone who can read it. The same rules as
 * the PDF route next door: read in a withOrgTx transaction as the caller
 * (RLS decides visibility), rendered after it closes. 401 without a
 * session, 404 for an unknown org, a non-member or a note the caller can't
 * see, 400 for another format, 429 past 30 downloads in 10 minutes (shared
 * with the PDF).
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/app/[orgSlug]/notes/[noteId]/export">,
) {
  const { orgSlug, noteId } = await ctx.params;
  const format = new URL(request.url).searchParams.get("format");
  if (format !== "docx" && format !== "md") {
    return new NextResponse("Choose docx or md", { status: 400 });
  }
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const orgId = await withUserTx(session.user.id, async ({ db }) => {
    const rows = await db.$queryRaw<{ organizationId: string }[]>`
      SELECT "organizationId" FROM app.resolve_org_slug(${orgSlug})`;
    return rows[0]?.organizationId ?? null;
  });
  if (!orgId) return new NextResponse("Not found", { status: 404 });

  const limit = await checkRateLimit(rateLimitKey("note-pdf", session.user.id), 30, 600);
  if (!limit.allowed) {
    return new NextResponse("Too many downloads. Try again in a few minutes.", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((limit.retryAfterMs ?? 60_000) / 1000)) },
    });
  }

  let found;
  try {
    found = await withOrgTx(orgId, async ({ db, userId }) => {
      const note = await getNoteById(db, orgId, userId, noteId);
      if (!note) return null;
      const org = await db.organization.findUniqueOrThrow({
        where: { id: orgId },
        select: { name: true, slug: true },
      });
      return { note, org };
    });
  } catch (error) {
    if (error instanceof NotFoundError) return new NextResponse("Not found", { status: 404 });
    throw error;
  }
  if (!found) return new NextResponse("Not found", { status: 404 });
  const { note, org } = found;
  let baseUrl: string;
  try {
    baseUrl = absoluteAppUrl(`/app/${org.slug}`);
  } catch {
    baseUrl = `${new URL(request.url).origin}/app/${org.slug}`;
  }

  if (format === "md") {
    const markdown = noteToMarkdown(note.title, note.contentJson, { baseUrl, orgId });
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": contentDisposition("attachment", noteFilename(note.title, "md")),
        "Cache-Control": "private, no-store",
      },
    });
  }

  const docx = await renderNoteDocx({
    title: note.title,
    contentJson: note.contentJson,
    orgName: org.name,
    paperSize: note.paperSize,
    baseUrl,
    orgId,
  });
  return new NextResponse(new Uint8Array(docx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": contentDisposition("attachment", noteFilename(note.title, "docx")),
      "Cache-Control": "private, no-store",
    },
  });
}
