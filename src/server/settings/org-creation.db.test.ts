// Side-effecting import first: the runtime role URLs come from .env.
import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Open org creation in production allows one org per person per 30 days.
 * Against the real database: a creation that fails part-way must not use
 * that allowance up, and one that succeeds must. Skipped when the database
 * is not reachable, like the other *.db.test.ts files.
 */

const { audit } = vi.hoisted(() => ({ audit: { failNext: false } }));
// The data layer imports the session helpers, which need Next's own build.
vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn() }));
// A creation that fails after the insert: the audit write throws once.
vi.mock("@/server/audit", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/server/audit")>();
  return {
    ...real,
    writeOrgAuditLog: async (...args: Parameters<typeof real.writeOrgAuditLog>) => {
      if (audit.failNext) {
        audit.failNext = false;
        throw new Error("audit write failed");
      }
      return real.writeOrgAuditLog(...args);
    },
  };
});
// The per-day limits count attempts in shared buckets (the platform-wide one
// too), so they stay out of this test; the 30-day allowance is what's tested.
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  checkRateLimit: async () => ({ allowed: true }),
}));

import { rateLimitKey } from "@/lib/rate-limit";
import { authDb, disconnectAll } from "@/server/db/clients";
import { disconnectOwnerDb, ownerDb } from "@/test/owner-db";

import { createOrganization } from "./org-creation";

const tag = randomBytes(4).toString("hex");
const slugs = [`founding-${tag}-a`, `founding-${tag}-b`, `founding-${tag}-c`];
let founder: { id: string; email: string; name: string } | null = null;
let reachable = true;

beforeAll(async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("PLATFORM_ORG_CREATION_ENABLED", "true");
  vi.stubEnv("ORG_CREATION_MODE", "open");
  try {
    const row = await authDb.user.create({
      data: {
        email: `founder-${tag}@example.edu`,
        name: "Founder",
        emailVerified: new Date(),
        onboardedAt: new Date(),
      },
      select: { id: true, email: true, name: true },
    });
    founder = { id: row.id, email: row.email, name: row.name ?? "Founder" };
  } catch {
    reachable = false;
  }
});

afterAll(async () => {
  vi.unstubAllEnvs();
  if (reachable) {
    await ownerDb.organization.deleteMany({ where: { slug: { in: slugs } } });
    await ownerDb.orgSlugHistory.deleteMany({ where: { slug: { in: slugs } } });
    if (founder) {
      await ownerDb.rateLimitBucket.deleteMany({
        where: { key: rateLimitKey("org-create-open", founder.id) },
      });
      await ownerDb.user.deleteMany({ where: { id: founder.id } });
    }
  }
  await disconnectAll();
  await disconnectOwnerDb();
});

describe("the 30-day org allowance against the local database", () => {
  it("is spent by an org that is created, not by a creation that failed", async () => {
    if (!reachable || !founder) return;
    const input = (slug: string) => ({ name: `Founding ${tag}`, slug, timezone: "UTC" });

    audit.failNext = true;
    await expect(createOrganization(founder, input(slugs[0]))).rejects.toThrow(
      "audit write failed",
    );
    expect(await ownerDb.organization.count({ where: { slug: slugs[0] } })).toBe(0);

    // The failed attempt rolled its hit back with the insert.
    expect(await createOrganization(founder, input(slugs[1]))).toMatchObject({
      ok: true,
      slug: slugs[1],
    });

    expect(await createOrganization(founder, input(slugs[2]))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/one organization every 30 days/),
    });
    expect(await ownerDb.organization.count({ where: { slug: slugs[2] } })).toBe(0);
  });
});
