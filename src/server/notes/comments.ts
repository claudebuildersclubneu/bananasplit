import type { TxClient } from "@/server/db/context";

/**
 * Comment threads on a note (NoteComment). A thread is its first comment
 * (threadId NULL) and the replies naming it; resolving marks the first
 * comment. Anchors: `anchorText` is the passage as quoted when the thread
 * started, `anchor` where it sits ({ from, to, prefix, suffix } in the
 * document, plus Yjs relative positions when it was made in a live note;
 * src/lib/notes/comment-anchor.ts finds it again). RLS: whoever can see
 * the note reads and adds comments.
 */

const personSelect = { id: true, name: true, image: true } as const;

export function listNoteComments(db: TxClient, organizationId: string, noteId: string) {
  return db.noteComment.findMany({
    where: { organizationId, noteId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      threadId: true,
      body: true,
      anchorText: true,
      anchor: true,
      resolvedAt: true,
      createdAt: true,

      author: { select: personSelect },
      resolvedBy: { select: personSelect },
    },
    take: 1000,
  });
}

export type NoteCommentRow = Awaited<ReturnType<typeof listNoteComments>>[number];

/** A comment as the browser gets it (dates as ISO strings). */
export interface NoteCommentDto {
  id: string;
  threadId: string | null;
  body: string;
  anchorText: string | null;
  anchor: unknown;
  resolvedAt: string | null;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null } | null;
  resolvedBy: { id: string; name: string | null; image: string | null } | null;
}

export function toCommentDto(row: NoteCommentRow): NoteCommentDto {
  return {
    id: row.id,
    threadId: row.threadId,
    body: row.body,
    anchorText: row.anchorText,
    anchor: row.anchor,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    author: row.author,
    resolvedBy: row.resolvedBy,
  };
}
