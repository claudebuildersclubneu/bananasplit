import type { JSONContent } from "@tiptap/react";
import { notFound } from "next/navigation";

import { NoteEditorShell } from "@/components/notes/note-editor-shell";
import { handleAuthErrorInPage } from "@/lib/auth/handle-auth-error";
import { collabConfig } from "@/lib/collab/config";
import { canEditNote, canShareNote, generalAccessOf, toNoteAccess } from "@/lib/notes/access";
import { mintNoteCollabSession } from "@/server/collab/session";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { planGate } from "@/server/billing/plan-gate";
import { userPublicSelect } from "@/server/members";
import { listNoteShares } from "@/server/notes/sharing";

import { getNoteById, getOrgEventsForPicker } from "../queries";

export default async function NoteDetailPage({
  params,
}: PageProps<"/app/[orgSlug]/notes/[noteId]">) {
  const { orgSlug, noteId } = await params;
  const planLock = await planGate(orgSlug, "files");
  if (planLock) return planLock;
  const { organization: org, user, role } = await getOrgContextBySlug(orgSlug);

  const { note, events, shares, members } = await withOrgTx(org.id, async ({ db }) => {
    const found = await getNoteById(db, org.id, user.id, noteId);
    // Skip the other queries for a missing (or invisible) note.
    if (!found) return { note: null, events: [], shares: [], members: [] };
    return {
      note: found,
      events: await getOrgEventsForPicker(db, org.id),
      shares: await listNoteShares(db, org.id, found.id),
      // The share dialog's people picker: names and pictures only.
      members: (
        await db.membership.findMany({
          where: { organizationId: org.id },
          select: { user: { select: userPublicSelect } },
        })
      )
        .map((m) => m.user)
        .sort((a, b) =>
          (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" }),
        ),
    };
  }).catch(handleAuthErrorInPage);
  if (!note) {
    notFound();
  }

  const access = toNoteAccess(note);
  const actor = { userId: user.id, organizationId: org.id, role, user };
  const canEdit = canEditNote(actor, access);
  // Live collaboration (docs/features/collaboration.md): the first token,
  // for a note RLS just returned to this user. Null while the flag is off,
  // which keeps the autosave editor.
  const config = collabConfig();
  const collab = config ? mintNoteCollabSession(config, actor, access) : null;

  return (
    <NoteEditorShell
      orgId={org.id}
      orgSlug={orgSlug}
      canEdit={canEdit}
      events={events}
      collab={collab}
      sharing={{
        canShare: canShareNote(actor, access),
        isAuthor: access.authorId === user.id,
        viewerId: user.id,
        myRole: access.shareRole,
        author: { id: note.author.id, name: note.author.name, image: note.author.image },
        generalAccess: generalAccessOf(access),
        shares,
        members,
      }}
      note={{
        id: note.id,
        title: note.title,
        contentJson: note.contentJson as JSONContent,
        contentText: note.contentText,
        visibility: note.visibility,
        eventId: note.eventId,
        version: note.version,
      }}
    />
  );
}
