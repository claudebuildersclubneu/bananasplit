import { OrgKind, Role } from "@/generated/prisma/client";
import { getUserIdentity } from "@/lib/auth/email-verification";
import type { SessionUser } from "@/lib/auth/session";
import { isValidTimeZone } from "@/lib/timezones";
import { writeOrgAuditLog } from "@/server/audit";
import { withSystemOrgTx, withUserTx } from "@/server/db/context";
import { sqlStateOf } from "@/server/db/errors";
import { newOrgId } from "@/server/settings/org-creation";

import { generateRsvpCode } from "./service";

/**
 * Free RSVP pages without a club (docs/features/rsvp.md, "Free pages").
 * Someone who only wants an event page gets a personal space: an
 * Organization of kind PERSONAL that is theirs alone (personalOwnerId), made
 * the first time they create an event at /rsvp/new. It holds their events
 * and guest lists, so the RSVP pages, jobs and row security work exactly as
 * they do for a club, but it is never listed as a club: no sidebar, no team,
 * no invites. Its guest lists are cleared 30 days after each event
 * (PERSONAL_GUEST_DAYS); "Save to a club" moves an event into a club the
 * person runs, where they are kept.
 */

/** How long a free event keeps its guest list after it ends. */
export const PERSONAL_GUEST_DAYS = 30;

export interface PersonalSpace {
  id: string;
  slug: string;
  name: string;
  timezone: string;
}

const SPACE_SELECT = { id: true, slug: true, name: true, timezone: true } as const;

/** The user's personal space, or null before their first free event. */
export async function getPersonalSpace(userId: string): Promise<PersonalSpace | null> {
  return withUserTx(userId, ({ db }) =>
    db.organization.findFirst({
      where: { personalOwnerId: userId, kind: OrgKind.PERSONAL, deletedAt: null },
      select: SPACE_SELECT,
    }),
  );
}

/** What a space is called: the person, since the page says "Hosted by" them. */
export function spaceName(user: { name: string | null; email: string }): string {
  const name = user.name?.trim() || user.email.split("@")[0] || "";
  return name.length >= 2 ? name.slice(0, 80) : "My events";
}

export type EnsureSpaceResult =
  { ok: true; space: PersonalSpace } | { ok: false; error: string; unverified?: boolean };

/**
 * The user's space, made on first use. Needs a verified email, like a
 * club: a public page goes out under Bananasplit's name. One per person
 * (the unique personalOwnerId); a double submit finds the first one.
 */
export async function ensurePersonalSpace(
  user: SessionUser,
  timezone: string,
): Promise<EnsureSpaceResult> {
  const found = await getPersonalSpace(user.id);
  if (found) return { ok: true, space: found };

  const identity = await getUserIdentity(user.id);
  if (!identity) return { ok: false, error: "Sign in again to continue." };
  if (!identity.emailVerified) {
    return {
      ok: false,
      unverified: true,
      error: "Confirm your email first: open the link we sent you, then come back.",
    };
  }

  const orgId = newOrgId();
  const name = spaceName({ name: user.name, email: identity.email });
  const tz = isValidTimeZone(timezone) ? timezone : "America/New_York";
  try {
    const space = await withSystemOrgTx(orgId, { userId: user.id }, async ({ db }) => {
      const org = await db.organization.create({
        data: {
          id: orgId,
          name,
          // Never shown: /app/{slug} sends a personal space to /rsvp.
          slug: `me-${generateRsvpCode(10)}`,
          timezone: tz,
          kind: OrgKind.PERSONAL,
          personalOwnerId: user.id,
        },
        select: SPACE_SELECT,
      });
      await db.membership.create({
        data: { organizationId: orgId, userId: user.id, role: Role.OWNER },
      });
      await writeOrgAuditLog(db, {
        organizationId: orgId,
        action: "org.created",
        targetType: "Organization",
        targetId: orgId,
        diff: { name, kind: "PERSONAL", timezone: tz },
      });
      return org;
    });
    return { ok: true, space };
  } catch (error) {
    // Made a moment ago by a second click.
    if (sqlStateOf(error) === "23505") {
      const again = await getPersonalSpace(user.id);
      if (again) return { ok: true, space: again };
    }
    throw error;
  }
}

/** The clubs where the user can take a free event in: owner or admin. */
export async function clubsUserRuns(
  userId: string,
): Promise<{ id: string; name: string; slug: string }[]> {
  return withUserTx(userId, async ({ db }) =>
    (
      await db.membership.findMany({
        where: {
          userId,
          role: { in: [Role.OWNER, Role.ADMIN] },
          organization: { kind: OrgKind.CLUB, deletedAt: null },
        },
        select: { organization: { select: { id: true, name: true, slug: true } } },
        orderBy: { organization: { name: "asc" } },
      })
    ).map((m) => m.organization),
  );
}

/**
 * Moves one of the user's free events into a club they run
 * (app.move_personal_event), keeping its link, guests and bring list.
 * False when the event isn't theirs or the club isn't one they run.
 */
export async function movePersonalEvent(
  userId: string,
  eventId: string,
  toOrgId: string,
): Promise<boolean> {
  return withUserTx(userId, async ({ db }) => {
    const rows = await db.$queryRaw<{ ok: boolean }[]>`
      SELECT app.move_personal_event(${eventId}, ${toOrgId}) AS ok`;
    return rows[0]?.ok === true;
  });
}
