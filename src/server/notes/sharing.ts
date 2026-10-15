import type { NoteShareRole } from "@/generated/prisma/client";
import type { TxClient } from "@/server/db/context";
import { userPublicSelect, type UserPublic } from "@/server/members";

/**
 * Who a note is shared with (NoteShare), for the share dialog. Read in the
 * caller's RLS context: anyone who can see the note sees its shares (and
 * nothing else of the people but their public profile). Someone who has
 * left the club keeps no access (every policy needs a membership) and is
 * left out here; cleanupAfterDeparture deletes their shares.
 */

export interface NoteShareRow {
  userId: string;
  role: NoteShareRole;
  user: UserPublic;
}

export async function listNoteShares(
  db: TxClient,
  organizationId: string,
  noteId: string,
): Promise<NoteShareRow[]> {
  const rows = await db.noteShare.findMany({
    where: {
      organizationId,
      noteId,
      user: { memberships: { some: { organizationId } } },
    },
    select: { userId: true, role: true, user: { select: userPublicSelect } },
    orderBy: { createdAt: "asc" },
  });
  return rows;
}

/** How many people each note is shared with (the Files list's badges). */
export async function countNoteShares(
  db: TxClient,
  organizationId: string,
  noteIds: readonly string[],
): Promise<Map<string, number>> {
  if (noteIds.length === 0) return new Map();
  const rows = await db.noteShare.groupBy({
    by: ["noteId"],
    where: { organizationId, noteId: { in: [...noteIds] } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.noteId, r._count._all]));
}
