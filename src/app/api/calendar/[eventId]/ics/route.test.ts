// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "@/lib/auth/errors";

/**
 * One event's .ics download. The event page passes its org as a hint so the
 * event is read in one transaction; without a usable hint the route falls
 * back to trying each of the user's orgs. Membership is enforced by
 * withOrgTx either way (faked here: a non-member gets NotFoundError).
 */

interface FakeOrg {
  timezone: string;
  deletedAt: Date | null;
  members: string[];
}

const { store } = vi.hoisted(() => ({
  store: {
    orgs: {} as Record<string, FakeOrg>,
    events: [] as { id: string; organizationId: string; title: string }[],
    orgTx: [] as string[],
    userTx: 0,
  },
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: async () => ({ user: { id: "u1", email: "u1@example.edu", name: "U" } }),
}));

vi.mock("@/server/db/context", () => {
  function eventRow(e: { id: string; title: string }) {
    const at = new Date("2026-10-15T22:00:00Z");
    return {
      id: e.id,
      title: e.title,
      description: null,
      location: null,
      startsAt: at,
      endsAt: new Date(at.getTime() + 3_600_000),
      allDay: false,
      updatedAt: at,
      createdAt: at,
      syncVersion: 1,
      rsvpUrl: null,
    };
  }
  return {
    withUserTx: async (
      userId: string,
      fn: (ctx: { db: unknown }) => Promise<unknown>,
    ): Promise<unknown> => {
      store.userTx += 1;
      const memberships = Object.entries(store.orgs)
        .filter(([, org]) => org.members.includes(userId))
        .map(([id, org]) => ({
          organization: { id, timezone: org.timezone, deletedAt: org.deletedAt },
        }));
      return fn({ db: { membership: { findMany: async () => memberships } } });
    },
    withOrgTx: async (
      organizationId: string,
      fn: (ctx: { db: unknown }) => Promise<unknown>,
    ): Promise<unknown> => {
      store.orgTx.push(organizationId);
      const org = store.orgs[organizationId];
      if (!org || !org.members.includes("u1")) throw new NotFoundError();
      return fn({
        db: {
          organization: {
            findUnique: async () => ({ timezone: org.timezone, deletedAt: org.deletedAt }),
          },
          event: {
            findFirst: async ({ where }: { where: { id: string; organizationId: string } }) => {
              const found = store.events.find(
                (e) => e.id === where.id && e.organizationId === where.organizationId,
              );
              return found ? eventRow(found) : null;
            },
          },
        },
      });
    },
  };
});

const { GET } = await import("./route");

function download(eventId: string, org?: string) {
  const query = org ? `?org=${org}` : "";
  return GET(new Request(`http://localhost/api/calendar/${eventId}/ics${query}`), {
    params: Promise.resolve({ eventId }),
  });
}

beforeEach(() => {
  store.orgs = {
    org_a: { timezone: "America/New_York", deletedAt: null, members: ["u1"] },
    org_b: { timezone: "Asia/Tokyo", deletedAt: null, members: ["u1"] },
    org_c: { timezone: "UTC", deletedAt: null, members: ["someone_else"] },
  };
  store.events = [
    { id: "ev_b", organizationId: "org_b", title: "Tokyo meetup" },
    { id: "ev_c", organizationId: "org_c", title: "Not yours" },
  ];
  store.orgTx = [];
  store.userTx = 0;
});

describe("one event's .ics", () => {
  it("reads the event in the hinted org alone", async () => {
    const response = await download("ev_b", "org_b");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("SUMMARY:Tokyo meetup");
    expect(store.orgTx).toEqual(["org_b"]);
    expect(store.userTx).toBe(0);
  });

  it("falls back to each of the user's orgs without a hint", async () => {
    const response = await download("ev_b");
    expect(response.status).toBe(200);
    expect(store.userTx).toBe(1);
    expect(store.orgTx).toEqual(["org_a", "org_b"]);
  });

  it("falls back when the hint is wrong, without reading the hinted org twice", async () => {
    const response = await download("ev_b", "org_a");
    expect(response.status).toBe(200);
    expect(store.orgTx).toEqual(["org_a", "org_b"]);
  });

  it("does not serve an event from an org the user is not in, hint or not", async () => {
    expect((await download("ev_c", "org_c")).status).toBe(404);
    expect((await download("ev_c")).status).toBe(404);
  });

  it("skips a deleted org", async () => {
    store.orgs.org_b.deletedAt = new Date();
    expect((await download("ev_b", "org_b")).status).toBe(404);
  });

  it("ignores a malformed hint", async () => {
    const response = await download("ev_b", "not%20an%20id");
    expect(response.status).toBe(200);
    expect(store.orgTx).toEqual(["org_a", "org_b"]);
  });
});
