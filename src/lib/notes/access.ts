// The enums entry, not the client: this module stays free of server code.
import { NoteShareRole, NoteVisibility } from "@/generated/prisma/enums";
import { can, type RoleHolder } from "@/lib/auth/permissions";

/**
 * Who may see, edit and share a note (spec 3.3, policy 6.8, and note
 * sharing: docs/features/notes-sharing.md). The note actions, the note
 * page, the collaboration token and the collaboration bridge all ask here;
 * RLS on "Note" and "NoteShare" enforces the same rules in the database
 * (app.note_share_role, app.can_share_note, app.note_sharing_guard).
 *
 * - See: a club (ORGANIZATION) note, your own, or one shared with you.
 * - Edit: your own; one shared with you as an editor; a club note when it
 *   lets every member edit, and any club note for an OWNER/ADMIN.
 * - Share (who sees it, who edits it) and delete: the author, and an
 *   OWNER/ADMIN on a club note. A PRIVATE note stays its author's to share,
 *   whoever it was shared with.
 */

export interface NoteAccessFields {
  visibility: NoteVisibility;
  authorId: string;
  memberCanEdit: boolean;
  /** The caller's own share of the note, if it was shared with them. */
  shareRole: NoteShareRole | null;
}

/** The columns access is decided from, plus the caller's own share (as `shares`). */
export function noteAccessSelect(userId: string) {
  return {
    authorId: true,
    visibility: true,
    memberCanEdit: true,
    shares: { where: { userId }, select: { role: true }, take: 1 },
  } as const;
}

/**
 * A note row read with noteAccessSelect (or with its `shares` included the
 * same way), as the fields the checks below take.
 */
export function toNoteAccess<
  T extends {
    visibility: NoteVisibility;
    authorId: string;
    memberCanEdit?: boolean;
    shares?: { role: NoteShareRole }[];
  },
>(note: T): Omit<T, "shares" | "memberCanEdit"> & NoteAccessFields {
  const { shares, memberCanEdit, ...rest } = note;
  return { ...rest, memberCanEdit: memberCanEdit ?? false, shareRole: shares?.[0]?.role ?? null };
}

/** Private notes are invisible to everyone but their author and the people they're shared with, regardless of role. */
export function isNoteVisibleTo(
  userId: string,
  note: Pick<NoteAccessFields, "visibility" | "authorId" | "shareRole">,
): boolean {
  return (
    note.visibility === NoteVisibility.ORGANIZATION ||
    note.authorId === userId ||
    note.shareRole !== null
  );
}

export function canEditNote(
  actor: RoleHolder & { userId: string },
  note: NoteAccessFields,
): boolean {
  if (note.authorId === actor.userId) return true;
  if (note.shareRole === NoteShareRole.EDITOR) return true;
  return (
    note.visibility === NoteVisibility.ORGANIZATION &&
    (note.memberCanEdit || can(actor, "notes.manageAll"))
  );
}

/** Changing who sees and edits a note, and moving it to the trash (or back). */
export function canShareNote(
  actor: RoleHolder & { userId: string },
  note: Pick<NoteAccessFields, "visibility" | "authorId">,
): boolean {
  return (
    note.authorId === actor.userId ||
    (note.visibility === NoteVisibility.ORGANIZATION && can(actor, "notes.manageAll"))
  );
}

/** Whether the note's general access is "Everyone in the club can edit". */
export type NoteGeneralAccess = "RESTRICTED" | "CLUB_VIEW" | "CLUB_EDIT";

export function generalAccessOf(note: {
  visibility: NoteVisibility;
  memberCanEdit: boolean;
}): NoteGeneralAccess {
  if (note.visibility !== NoteVisibility.ORGANIZATION) return "RESTRICTED";
  return note.memberCanEdit ? "CLUB_EDIT" : "CLUB_VIEW";
}

export function fromGeneralAccess(access: NoteGeneralAccess): {
  visibility: NoteVisibility;
  memberCanEdit: boolean;
} {
  return access === "RESTRICTED"
    ? { visibility: NoteVisibility.PRIVATE, memberCanEdit: false }
    : { visibility: NoteVisibility.ORGANIZATION, memberCanEdit: access === "CLUB_EDIT" };
}
