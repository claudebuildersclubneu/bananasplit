import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/clients", () => ({ authDb: {} }));

const { checkSessionVersion } = await import("./session-version");

/**
 * Ending sessions after a password change: a token keeps working only while
 * its version matches the account's, and a database error never signs
 * anyone out.
 */
describe("checkSessionVersion", () => {
  const load = (version: number | null) => async () => version;

  it("keeps a session whose version matches", async () => {
    expect(await checkSessionVersion({ id: "u1", sv: 2 }, load(2))).toBe("keep");
  });

  it("ends a session from before a password change", async () => {
    expect(await checkSessionVersion({ id: "u1", sv: 0 }, load(1))).toBe("end");
  });

  it("ends a session whose user is gone", async () => {
    expect(await checkSessionVersion({ id: "u1", sv: 0 }, load(null))).toBe("end");
  });

  it("reads a token from before versions existed as version 0", async () => {
    expect(await checkSessionVersion({ id: "u1" }, load(0))).toBe("keep");
    expect(await checkSessionVersion({ id: "u1" }, load(1))).toBe("end");
  });

  it("keeps the session when the database can't be reached", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = async () => {
      throw new Error("connection refused");
    };
    expect(await checkSessionVersion({ id: "u1", sv: 0 }, failing)).toBe("keep");
    error.mockRestore();
  });

  it("leaves a token without a user id alone", async () => {
    expect(await checkSessionVersion({}, load(5))).toBe("keep");
  });
});
