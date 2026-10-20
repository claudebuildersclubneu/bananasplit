import { isNoteVisibleTo, toNoteAccess } from "@/lib/notes/access";
import type { MemberContext } from "@/server/db/context";

/**
 * The note and the caller's access to it (their own share included), or
 * null when it doesn't exist in this org or they can't see it. Deleted
 * notes only when asked for (restore). Every note action starts here; RLS
 * repeats the visibility rule in the database.
 */
export async function loadNote(ctx: MemberContext, noteId: string, { deleted = false } = {}) {
  const row = await ctx.db.note.findFirst({
    where: {
      id: noteId,
      organizationId: ctx.organizationId,
      ...(deleted ? {} : { deletedAt: null }),
    },
    include: { shares: { where: { userId: ctx.userId }, select: { role: true }, take: 1 } },
  });
  if (!row) return null;
  const note = toNoteAccess(row);
  return isNoteVisibleTo(ctx.userId, note) ? note : null;
}

export type LoadedNote = NonNullable<Awaited<ReturnType<typeof loadNote>>>;
