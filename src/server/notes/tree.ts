import type { TxClient } from "@/server/db/context";
import { noteVisibleWhere } from "@/server/notes/visibility";

/**
 * The notes sidebar (Moonstone 13.1): every page the viewer can see, for
 * the tree of nested pages, the breadcrumbs and the "link to a page" menu.
 * Titles and icons only; RLS already hides what the viewer may not read.
 */
export function listNoteTree(db: TxClient, organizationId: string, userId: string) {
  return db.note.findMany({
    where: { organizationId, deletedAt: null, ...noteVisibleWhere(userId) },
    select: { id: true, title: true, icon: true, parentId: true, updatedAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 1000,
  });
}

export type NoteTreeRow = Awaited<ReturnType<typeof listNoteTree>>[number];

/**
 * Backlinks: the visible pages whose body links to `noteId` (a noteLink
 * node names it). The JSON is searched as text for the id in quotes, which
 * a cuid can't produce by accident; the query runs as the viewer, so RLS
 * leaves out pages they can't read.
 */
export async function listBacklinks(
  db: TxClient,
  organizationId: string,
  userId: string,
  noteId: string,
): Promise<{ id: string; title: string; icon: string | null }[]> {
  const needle = `%"noteId": "${noteId.replace(/[%_\\"]/g, "")}"%`;
  const compact = `%"noteId":"${noteId.replace(/[%_\\"]/g, "")}"%`;
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT n."id" FROM "Note" n
     WHERE n."organizationId" = ${organizationId}
       AND n."deletedAt" IS NULL
       AND n."id" <> ${noteId}
       AND (n."contentJson"::text LIKE ${needle} OR n."contentJson"::text LIKE ${compact})
     LIMIT 50`;
  if (rows.length === 0) return [];
  return db.note.findMany({
    where: {
      organizationId,
      deletedAt: null,
      id: { in: rows.map((r) => r.id) },
      ...noteVisibleWhere(userId),
    },
    select: { id: true, title: true, icon: true },
    orderBy: { updatedAt: "desc" },
  });
}
