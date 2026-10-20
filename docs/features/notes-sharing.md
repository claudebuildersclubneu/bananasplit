# Notes: sharing and tables

A note has an author and a **Share** button, as a shared document does. The
author can add club members as **viewers** or **editors**, and choose what
everyone else in the club gets: nothing, read access, or edit access.

## For an org

### Who can do what

| Who                                              | Sees it       | Edits it          | Shares it, deletes it |
| ------------------------------------------------ | ------------- | ----------------- | --------------------- |
| The author                                       | yes           | yes               | yes                   |
| An editor (added by name)                        | yes           | yes               | no                    |
| A viewer (added by name)                         | yes           | no                | no                    |
| Anyone else, **Everyone in the club can edit**   | yes           | yes               | no                    |
| Anyone else, **Everyone in the club can view**   | yes           | no                | no                    |
| Anyone else, **Only people added**               | no            | no                | no                    |
| An owner or admin, on a club note (view or edit) | yes           | yes               | yes                   |
| An owner or admin, on a note that is only shared | only if added | only as an editor | no                    |

- **Only people added** is the old "Only me": the note is private to its
  author and whoever they add. Owners and admins don't see a private note
  unless it's shared with them.
- **Only the author makes a club note private.** An admin can change a club
  note between view and edit, and add or remove people, but turning it
  private would lock them out too, so that stays the author's call.
- Editors change the body, title, linked event and folder. They can't change
  who has access or move the note to the trash.
- Anyone a note is shared with can take themselves off it (**Remove me** in
  the Share dialog).
- New notes start as before: **Only people added** (with nobody added yet),
  except imports and uploads, which ask.
- Only members of the club can be added. Someone who leaves the club loses
  every note shared with them; their shares are deleted.

### What people see

- **Share** (for the author and, on club notes, admins) shows the access at a
  glance: "Only you", "Shared with 3", "Club can view", "Club can edit".
  Everyone else sees the same summary on the button, and "View only" when
  they can't edit.
- **Files** marks private notes that are shared (a people icon instead of
  the lock, and "Shared with 3" or "Shared with you"), and the Filter menu
  has **Shared with me**.
- Adding someone sends them a notification (and an email, if they get
  those: **Someone shares a note with me** in their notification settings)
  with a link to the note.

### Live editing

With live collaboration on (`docs/features/collaboration.md`), every change
to who has access closes the note's live sessions after it saves. Everyone
reconnects at once with a token for what they may do now: a viewer who
became an editor can type, an editor who became a viewer watches, and
someone who lost access sees "This note is no longer available to you".

## Tables in notes

The toolbar's **Table** button opens a size picker: hover the grid (up to
8 × 8), or type any size up to 50 rows by 20 columns, and choose whether the
first row is a header. In the slash menu, `/table` inserts a 3 × 3 table and
`/4x6` (any rows × columns) inserts that size.

While the cursor is in a table, a second row of the toolbar shows its size
and the table tools: add a row above or below, add a column left or right,
delete the row or column, toggle a header row or header column, merge or
split cells (drag across cells to select several), and delete the table.
Tab in the last cell adds a row. Wide tables scroll sideways instead of
squeezing their columns.

## The note page (Moonstone 13.1-13.4)

One editor, two modes, switched at the top of the page (**Page | Document**,
saved to `Note.layout`; switching never changes the content).

- **Layout.** The notes tree on the left (Favorites are the pages you
  pinned; every page you can see, nested, with expand and collapse; drag a
  page onto another to put it inside, or onto "Pages" for the top level;
  Templates), the editor in the middle, and a rail on the right for
  comments, version history and suggestions (collapsible; a sheet on
  phones). The top bar has breadcrumbs, who else is in the note, the mode
  switch, Share, comments and history.
- **Page mode** (like Notion): the title and body sit on a sheet (a card
  surface); the add-icon button shows when you're at the title. Hover a block for **+** (a new block with
  the slash menu open) and a grip (drag to move; click for Turn into,
  Duplicate, Move up/down, Delete block). The slash menu has text,
  headings, lists, checklists, toggles, callouts, quotes, code, tables,
  dividers, images and files (uploaded to the club's files, so they count
  toward storage), **@** people and dates, **[[** links to pages, a new page
  inside this one, live **task chips** (a real task on the board, checked
  off from the note), database and poll cards, columns and page breaks.
  Each page has an icon (`Note.icon`), breadcrumbs, its subpages and its
  backlinks ("Linked from") at the bottom.
- **Document mode** (like Google Docs): the note on paper (Letter or A4,
  `Note.paperSize`, from the "…" menu) with a ruler, one-inch margins,
  visual page breaks, the title and club in the header and page numbers in
  the footer. The PDF prints on the same paper with the same bands, and a
  page break block starts a new page in both. Comments sit in the margin
  beside their passage. **Header and footer…** in the "…" menu sets the
  note's own header and footer text (`Note.headerText`, `Note.footerText`,
  200 characters at most; empty for the default title and club / title).
  The page number stays on the right of the footer, and the PDF uses the
  same text (`bandHeader` / `bandFooter` in `src/lib/notes/paper.ts`).
- **Comments** (both modes): select text and choose **Comment** in the
  floating capsule (or comment on the whole note). Threads have replies,
  **@mentions** (the people named are told, with the existing "Someone
  @mentions me" notification; a reply tells the thread's earlier
  commenters with "Someone comments"), resolve and reopen. A thread is
  anchored with Yjs relative positions in a live note and by its quoted
  text (with the words around it) otherwise; a passage that was deleted
  leaves the thread in the list, marked as changed. Who may do what: anyone
  who can see the note comments; a comment's author edits it; whoever can
  edit the note resolves; the author of a comment or whoever can share the
  note deletes it.
- **Version history:** an autosave snapshot of the body as it was before
  an editing session (at most one every ten minutes, on the autosave and
  live paths alike) and named versions. Open one to preview it, compare it
  with the note now (words added and removed) or restore it (the body it
  replaces is kept as a snapshot first; in a live note the restore is an
  edit everyone merges). Snapshots are kept for the plan's note-history
  window (`spaceLimits(...).noteHistoryDays`); named versions until
  someone deletes them. Viewers read history; editors name, rename and
  restore; whoever can share the note deletes versions.
- **Suggesting** ("…" › Suggest edits): what you type shows underlined and
  what you delete struck through, as suggestions anyone who can edit the
  note accepts or rejects, one at a time or all at once (rail ›
  Suggestions). Built in-house (decision 20.12a) as two marks in the
  document, so suggestions save and merge live like text. Limits: text and
  inline chips are tracked; formatting, list and quote changes and new
  paragraphs apply directly; deleting a block with no text (an image, a
  divider) is refused while suggesting; only editors suggest.
- **Exports:** PDF, Word (.docx) and Markdown from the "…" menu. Pending
  suggestions show (insertions underlined, deletions struck through);
  images and files are links to the club's file.

## How it's stored

| What                  | Where                                                                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| General access        | `Note.visibility` (`PRIVATE` / `ORGANIZATION`) and `Note.memberCanEdit` (club notes every member edits)                                                          |
| People added by name  | `NoteShare` (`noteId`, `userId`, `role` `VIEWER` or `EDITOR`, `createdById`)                                                                                     |
| The rules, in the app | `src/lib/notes/access.ts` (`isNoteVisibleTo`, `canEditNote`, `canShareNote`)                                                                                     |
| The actions           | `src/app/app/[orgSlug]/notes/actions.ts` (`updateNoteAccess`, `shareNote`, `updateNoteShare`, `removeNoteShare`)                                                 |
| List and search       | `src/server/notes/visibility.ts` (`noteVisibleWhere`, `noteVisibleSql`)                                                                                          |
| Nested pages, layout  | `Note.parentId`, `icon`, `layout`, `paperSize`, `headerText`, `footerText`; `updateNoteSettings` (no version bump); `src/server/notes/tree.ts` (tree, backlinks) |
| Comments              | `NoteComment`; `comment-actions.ts`; anchors in `src/lib/notes/comment-anchor.ts` and `editor/comment-highlights.ts`                                             |
| Versions              | `NoteVersion`; `version-actions.ts`; snapshots and pruning in `src/server/notes/versions.ts` (service path, after commit)                                        |
| Schema                | `src/lib/notes/schema-extensions.ts` and `nodes.ts` (every block), `suggestions.ts` (suggesting marks and logic)                                                 |
| Exports               | `src/server/notes/pdf.tsx`, `src/server/notes/docx.ts`, `src/lib/notes/export/markdown.ts`; `[noteId]/pdf` and `[noteId]/export?format=docx                      | md` |

Comments and versions have their own RLS (migration
`20261019120000_moonstone_product_update`): whoever can see the note reads
and comments as themselves; `app.note_comment_guard` lets a comment's
author change its body and anchor, and whoever can edit the note
(`app.can_edit_note`) resolve it; the author or whoever can share deletes.
Editors insert versions as themselves and rename them (a column grant on
`name`); sharers delete; autosave snapshots and pruning use the service
path. `comments-versions.db.test.ts` runs these against the real policies
and `comment-version-actions.test.ts` the app's side.

The database enforces the same rules with row-level security
(`20261014130000_note_sharing`):

- `app.note_share_role(note)` is the caller's own share, read without RLS so
  the Note and NoteShare policies don't recurse into each other.
- The Note SELECT policy adds "or shared with me"; UPDATE adds EDITOR shares
  and, on a club note with `memberCanEdit`, every member.
- `app.note_sharing_guard` refuses a change to `visibility`,
  `memberCanEdit` or `deletedAt` by anyone but the author (or an owner/admin
  on a club note), whatever the UPDATE policy let through.
- NoteShare rows: whoever can see the note reads them; `app.can_share_note`
  decides who writes them (only for members of the club, recorded as the
  person sharing); anyone can delete their own.

`T19c` in `pnpm test:rls` runs these rules against the real policies, and
`src/app/app/[orgSlug]/notes/actions.test.ts` the app's side.
