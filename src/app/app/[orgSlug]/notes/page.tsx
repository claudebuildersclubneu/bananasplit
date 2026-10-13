import type { Metadata } from "next";

import { NotesLibrary } from "@/components/notes/notes-library";
import { NotesNewMenu } from "@/components/notes/notes-new-menu";
import { PageHeader } from "@/components/page-header";
import { handleAuthErrorInPage } from "@/lib/auth/handle-auth-error";
import { can } from "@/lib/auth/permissions";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { listDeletedNoteFiles, listNoteFiles } from "@/server/notes/files";
import { listFolders } from "@/server/notes/folders";
import { listPins } from "@/server/pins";
import { planGate } from "@/server/billing/plan-gate";

import { NotesListFilters } from "./notes-list-filters";
import {
  countDeleted,
  getDeletedNotes,
  getNotesForList,
  getOrgMembersForFilter,
  NOTE_SORTS,
  type NoteSort,
} from "./queries";

export const metadata: Metadata = { title: "Files" };

/**
 * Files (at /notes): the club's notes and uploaded files in one list, filed
 * in shared folders. "New" starts a blank note or a template, turns a Word
 * document or Google Doc into a note (previewed first), uploads a file, or
 * makes a folder.
 */
export default async function NotesPage({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]/notes">) {
  const { orgSlug } = await params;
  const planLock = await planGate(orgSlug, "files");
  if (planLock) return planLock;
  const query = await searchParams;
  const { organization: org, user, role } = await getOrgContextBySlug(orgSlug);
  // `tab` narrows the list to one kind; without it, notes and files show together.
  const kind = query.tab === "files" || query.tab === "notes" ? query.tab : "all";
  const isAdmin = can({ role }, "settings.view");

  const str = (v: unknown) => (typeof v === "string" && v !== "all" ? v : undefined);
  const visibility = str(query.visibility) as "PRIVATE" | "ORGANIZATION" | undefined;
  const author = str(query.author);
  const inTrash = query.folder === "trash";
  const folderId = inTrash ? undefined : str(query.folder);
  const q = str(query.q);
  const sort = (NOTE_SORTS as readonly string[]).includes(String(query.sort))
    ? (query.sort as NoteSort)
    : "edited";

  const data = await withOrgTx(org.id, async ({ db }) => ({
    notes: await getNotesForList(db, org.id, user.id, {
      visibility,
      authorId: author,
      folderId,
      q,
      sort,
    }),
    files: await listNoteFiles(db, org.id, { folderId, q }),
    memberships: await getOrgMembersForFilter(db, org.id),
    folders: await listFolders(db, org.id, user.id),
    pins: await listPins(db, org.id, org.slug, user.id),
    trash: inTrash
      ? {
          notes: await getDeletedNotes(db, org.id, user.id, isAdmin),
          files: await listDeletedNoteFiles(db, org.id, user.id, isAdmin),
        }
      : null,
    trashCount: await countDeleted(db, org.id, user.id, isAdmin),
    totals: {
      notes: await db.note.count({
        where: {
          organizationId: org.id,
          deletedAt: null,
          OR: [{ visibility: "ORGANIZATION" }, { authorId: user.id }],
        },
      }),
      files: await db.orgFile.count({ where: { organizationId: org.id, deletedAt: null } }),
      unfiled:
        (await db.note.count({
          where: {
            organizationId: org.id,
            deletedAt: null,
            folderId: null,
            OR: [{ visibility: "ORGANIZATION" }, { authorId: user.id }],
          },
        })) +
        (await db.orgFile.count({
          where: { organizationId: org.id, deletedAt: null, folderId: null },
        })),
    },
  })).catch(handleAuthErrorInPage);

  const members = data.memberships.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
  }));
  // The notes query applies these filters itself; files get the same ones here.
  const files = data.files.filter(
    (f) => (!visibility || f.visibility === visibility) && (!author || f.uploadedBy.id === author),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Files"
        actions={
          <NotesNewMenu
            orgId={org.id}
            orgSlug={orgSlug}
            folders={data.folders.map((f) => ({ id: f.id, name: f.name }))}
            currentFolderId={folderId && folderId !== "none" ? folderId : null}
          />
        }
      />
      <NotesLibrary
        orgId={org.id}
        orgSlug={orgSlug}
        kind={kind}
        folders={data.folders.map((f) => ({
          id: f.id,
          name: f.name,
          color: f.color,
          noteCount: f.noteCount,
          fileCount: f.fileCount,
          canEdit: isAdmin || f.createdById === user.id,
        }))}
        notes={data.notes.map((n) => ({
          id: n.id,
          title: n.title,
          snippet: n.contentText.trim().slice(0, 400),
          visibility: n.visibility,
          updatedAt: n.updatedAt,
          createdAt: n.createdAt,
          authorName: n.author.name ?? n.author.email,
          eventTitle: n.event?.title ?? null,
          folderId: n.folderId,
          canMove: isAdmin || n.authorId === user.id,
        }))}
        files={files.map((f) => ({
          id: f.id,
          name: f.name,
          contentType: f.contentType,
          sizeBytes: f.sizeBytes,
          visibility: f.visibility,
          createdAt: f.createdAt,
          uploaderName: f.uploadedBy.name ?? "A member",
          excerpt: f.excerpt,
          folderId: f.folderId,
          canMove: isAdmin || f.uploadedBy.id === user.id,
        }))}
        pinnedHrefs={data.pins.map((p) => p.href)}
        totals={{ ...data.totals, trash: data.trashCount }}
        trash={
          data.trash && {
            notes: data.trash.notes.map((n) => ({
              id: n.id,
              title: n.title,
              visibility: n.visibility,
              deletedAt: n.deletedAt!,
              authorName: n.author.name ?? n.author.email,
            })),
            files: data.trash.files,
          }
        }
        filters={<NotesListFilters members={members} />}
      />
    </div>
  );
}
