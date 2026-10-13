import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Files (/notes) and member emails: everything the page hands its client
 * components reaches the browser, so an email may appear there only when
 * the viewer may see emails (OWNER/ADMIN, or Settings › Privacy's "Members
 * see each other's emails"), the rule Settings › Members follows. The
 * queries are faked here the way the real ones behave: they select an email
 * only when asked to.
 */

const { getOrgContextBySlugMock, notesMock, membersMock, deletedMock } = vi.hoisted(() => ({
  getOrgContextBySlugMock: vi.fn(),
  notesMock: vi.fn(),
  membersMock: vi.fn(),
  deletedMock: vi.fn(),
}));

vi.mock("@/server/db/context", () => ({
  getOrgContextBySlug: getOrgContextBySlugMock,
  withOrgTx: (_orgId: string, fn: (ctx: { db: unknown }) => unknown) =>
    Promise.resolve(
      fn({ db: { note: { count: async () => 0 }, orgFile: { count: async () => 0 } } }),
    ),
}));
vi.mock("@/server/notes/files", () => ({
  listNoteFiles: async () => [],
  listDeletedNoteFiles: async () => [],
}));
vi.mock("@/server/notes/folders", () => ({ listFolders: async () => [] }));
vi.mock("@/components/notes/notes-library", () => ({ NotesLibrary: () => null }));
vi.mock("@/components/notes/notes-new-menu", () => ({ NotesNewMenu: () => null }));
vi.mock("./queries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./queries")>()),
  getNotesForList: notesMock,
  getOrgMembersForFilter: membersMock,
  getDeletedNotes: deletedMock,
  countDeleted: async () => 0,
}));

const { NotesLibrary } = await import("@/components/notes/notes-library");
const { default: NotesPage } = await import("./page");

const people = [
  { id: "u_ada", name: "Ada Lovelace", email: "ada@example.edu" },
  { id: "u_anon", name: null, email: "anon@example.edu" },
];
const author = (emails: boolean) => ({
  id: "u_anon",
  name: null,
  ...(emails ? { email: "anon@example.edu" } : {}),
});

beforeEach(() => {
  vi.clearAllMocks();
  membersMock.mockImplementation(async (_db, _org, { emails = false } = {}) =>
    people.map((p) => ({
      userId: p.id,
      user: { name: p.name, ...(emails ? { email: p.email } : {}) },
    })),
  );
  notesMock.mockImplementation(async (_db, _org, _user, _filters, { emails = false } = {}) => [
    {
      id: "n_1",
      title: "Minutes",
      snippet: "Agenda",
      visibility: "ORGANIZATION",
      updatedAt: new Date("2026-10-01T12:00:00Z"),
      createdAt: new Date("2026-10-01T12:00:00Z"),
      authorId: "u_anon",
      folderId: null,
      author: author(emails),
      event: null,
    },
  ]);
  deletedMock.mockImplementation(async (_db, _org, _user, _isAdmin, { emails = false } = {}) => [
    {
      id: "n_2",
      title: "Old minutes",
      visibility: "ORGANIZATION",
      deletedAt: new Date("2026-10-02T12:00:00Z"),
      author: { name: null, ...(emails ? { email: "anon@example.edu" } : {}) },
    },
  ]);
});

function viewAs(role: string, showMemberEmailsToMembers: boolean) {
  getOrgContextBySlugMock.mockResolvedValue({
    user: { id: "u_viewer", email: "viewer@example.edu", name: "Viewer" },
    organization: { id: "org_cbc", slug: "cbc", name: "Claude Builders Club" },
    role,
    settings: { showMemberEmailsToMembers },
    pins: [],
  });
}

interface LibraryProps {
  notes: { authorName: string }[];
  trash: { notes: { authorName: string }[] } | null;
  filters: ReactElement<{ members: { userId: string; name: string }[] }>;
}

/** The props the page gives the (client) library, for the trash view so every list is there. */
async function render(): Promise<LibraryProps> {
  const page = await NotesPage({
    params: Promise.resolve({ orgSlug: "cbc" }),
    searchParams: Promise.resolve({ folder: "trash" }),
  } as unknown as PageProps<"/app/[orgSlug]/notes">);
  const children = [(page.props as { children: unknown }).children].flat() as ReactElement[];
  const library = children.find((c) => c?.type === NotesLibrary);
  return library!.props as LibraryProps;
}

const sent = (p: LibraryProps) =>
  JSON.stringify({ members: p.filters.props.members, notes: p.notes, trash: p.trash });

describe("Files page: member emails follow the club's privacy setting", () => {
  it("a member of a club that hides emails gets names only, and 'A member' for the nameless", async () => {
    viewAs("MEMBER", false);
    const props = await render();

    expect(membersMock).toHaveBeenCalledWith(expect.anything(), "org_cbc", { emails: false });
    expect(notesMock.mock.calls[0][4]).toEqual({ emails: false });
    expect(deletedMock.mock.calls[0][4]).toEqual({ emails: false });
    expect(props.filters.props.members).toEqual([
      { userId: "u_ada", name: "Ada Lovelace" },
      { userId: "u_anon", name: "A member" },
    ]);
    expect(props.notes[0].authorName).toBe("A member");
    expect(props.trash?.notes[0].authorName).toBe("A member");
    expect(sent(props)).not.toContain("@example.edu");
  });

  it("a member of a club that shows emails sees a nameless member's email", async () => {
    viewAs("MEMBER", true);
    const props = await render();

    expect(membersMock).toHaveBeenCalledWith(expect.anything(), "org_cbc", { emails: true });
    expect(props.filters.props.members[1]).toEqual({ userId: "u_anon", name: "anon@example.edu" });
    expect(props.notes[0].authorName).toBe("anon@example.edu");
    // Named members are still sent by name only.
    expect(sent(props)).not.toContain("ada@example.edu");
  });

  it("an admin sees emails whatever the setting", async () => {
    viewAs("ADMIN", false);
    const props = await render();

    expect(membersMock).toHaveBeenCalledWith(expect.anything(), "org_cbc", { emails: true });
    expect(props.notes[0].authorName).toBe("anon@example.edu");
  });

  it("a treasurer reads as a member", async () => {
    viewAs("TREASURER", false);
    expect(sent(await render())).not.toContain("@example.edu");
  });
});
