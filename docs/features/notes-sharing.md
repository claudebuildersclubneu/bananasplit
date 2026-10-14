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

## How it's stored

| What                  | Where                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| General access        | `Note.visibility` (`PRIVATE` / `ORGANIZATION`) and `Note.memberCanEdit` (club notes every member edits)          |
| People added by name  | `NoteShare` (`noteId`, `userId`, `role` `VIEWER` or `EDITOR`, `createdById`)                                     |
| The rules, in the app | `src/lib/notes/access.ts` (`isNoteVisibleTo`, `canEditNote`, `canShareNote`)                                     |
| The actions           | `src/app/app/[orgSlug]/notes/actions.ts` (`updateNoteAccess`, `shareNote`, `updateNoteShare`, `removeNoteShare`) |
| List and search       | `src/server/notes/visibility.ts` (`noteVisibleWhere`, `noteVisibleSql`)                                          |

The database enforces the same rules with row-level security
(`20261013130000_note_sharing`):

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
