// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => {
  class DatabaseInputError extends Error {}
  return {
    DatabaseInputError,
    user: vi.fn(),
    resolve: vi.fn(),
    rate: vi.fn(),
    importDb: vi.fn(),
  };
});

vi.mock("@/lib/auth/session", () => ({ requireUser: m.user }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: m.rate,
  rateLimitKey: (...parts: string[]) => parts.join(":"),
  retryAfterText: () => "in an hour",
}));
vi.mock("@/server/db/context", () => ({
  withUserTx: (_userId: string, fn: (ctx: unknown) => unknown) =>
    fn({ db: { $queryRaw: m.resolve } }),
  withOrgTx: (_orgId: string, fn: (ctx: unknown) => unknown) =>
    fn({ db: {}, userId: "u1", role: "OWNER" }),
}));
vi.mock("@/server/databases/custom", () => ({
  DatabaseInputError: m.DatabaseInputError,
  importDatabase: m.importDb,
}));

import { POST } from "./route";

const params = { params: Promise.resolve({ orgSlug: "chess-club" }) };

function post(file: Blob | null, headers: Record<string, string> = {}, name = "Roster") {
  const body = new FormData();
  if (file) body.set("file", file, "roster.csv");
  body.set("name", name);
  return POST(
    new Request("http://localhost/app/chess-club/databases/import", {
      method: "POST",
      headers: { origin: "http://localhost", ...headers },
      body,
    }),
    params,
  );
}

const csv = (text: string) => new Blob([text], { type: "text/csv" });

beforeEach(() => {
  vi.clearAllMocks();
  m.user.mockResolvedValue({ id: "u1" });
  m.resolve.mockResolvedValue([{ organizationId: "org_1" }]);
  m.rate.mockResolvedValue({ allowed: true });
  m.importDb.mockResolvedValue({ key: "roster", rows: 2, fields: 2, skippedCells: 0 });
});

describe("POST /app/{orgSlug}/databases/import", () => {
  it("makes the database from the file and says what it imported", async () => {
    // Bigger than a Server Action may take (1 MB), well under the 4 MB cap.
    const big = `Name,Notes\n${"Maya,hello there\n".repeat(100_000)}`;
    const res = await post(csv(big));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ key: "roster", rows: 2, fields: 2, skippedCells: 0 });
    expect(m.importDb).toHaveBeenCalledWith(
      { db: {}, organizationId: "org_1", userId: "u1", role: "OWNER" },
      { name: "Roster", csv: big },
    );
  });

  it("refuses cross-site posts, strangers, unknown clubs and too many imports", async () => {
    expect((await post(csv("a\n1"), { origin: "https://evil.example" })).status).toBe(403);

    m.user.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    expect((await post(csv("a\n1"))).status).toBe(401);

    m.resolve.mockResolvedValueOnce([]);
    expect((await post(csv("a\n1"))).status).toBe(404);

    m.rate.mockResolvedValueOnce({ allowed: false });
    expect((await post(csv("a\n1"))).status).toBe(429);
    expect(m.importDb).not.toHaveBeenCalled();
  });

  it("turns away files over 4 MB, missing files and files that aren't CSV", async () => {
    const tooBig = await post(csv("x".repeat(4 * 1024 * 1024 + 1)));
    expect(tooBig.status).toBe(413);
    expect((await tooBig.json()).error).toMatch(/over 4 MB/);

    expect((await post(null)).status).toBe(400);

    const binary = await post(new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00])]));
    expect(binary.status).toBe(400);
    expect((await binary.json()).error).toMatch(/CSV/);
    expect(m.importDb).not.toHaveBeenCalled();
  });

  it("passes on what was wrong with the file, and hides anything unexpected", async () => {
    m.importDb.mockRejectedValueOnce(
      new m.DatabaseInputError("The file needs a header row and at least one row of data."),
    );
    const bad = await post(csv("just a header"));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatch(/header row/);

    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    m.importDb.mockRejectedValueOnce(new Error("connection reset"));
    const broken = await post(csv("a\n1"));
    expect(broken.status).toBe(500);
    expect((await broken.json()).error).toBe("The import failed. Nothing was saved.");
    log.mockRestore();
  });
});
