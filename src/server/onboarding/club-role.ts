import { Prisma } from "@/generated/prisma/client";
import { blockedHoursPerWeek, parseAvailability } from "@/lib/availability";
import { writeOrgAuditLog } from "@/server/audit";
import { invalidate } from "@/server/cache/invalidate";
import { tags } from "@/server/cache/tags";
import { withSystemOrgTx, withUserTx } from "@/server/db/context";

/**
 * "Your role in <club>": the one small club step after joining a club (a
 * code, an invite link or an emailed invite; docs/features/personal-and-clubs.md).
 *
 * Membership.title is normally set by OWNER/ADMIN only (RLS P2-02). The new
 * member may set their OWN title here, once, right after joining: the
 * write runs on the service path for that user and is limited in the query
 * to the caller's own membership, joined within JOIN_WINDOW_MS. That is the
 * same power joining already had (the title used to ride along from the
 * profile's "preferred title"); afterwards only admins change it.
 */

/** How long after joining the member may still pick their own title. */
export const JOIN_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface JoinedClub {
  organizationId: string;
  name: string;
  slug: string;
  logo: Prisma.JsonValue | null;
  title: string | null;
  /** Still inside the window where the member may pick their own title. */
  canSetTitle: boolean;
  /** The member's own weekly busy hours (0 = nothing marked yet). */
  blockedHours: number;
  /** The club shows members each other's busy hours (OrgSettings.showMemberAvailability). */
  sharesAvailability: boolean;
}

/** The club the user just joined, by slug; null when they aren't a member of a live club. */
export async function getJoinedClub(
  userId: string,
  slug: string,
  now = new Date(),
): Promise<JoinedClub | null> {
  const club = await withUserTx(userId, async ({ db }) => {
    const membership = await db.membership.findFirst({
      where: { userId, organization: { slug, kind: "CLUB", deletedAt: null } },
      select: {
        title: true,
        joinedAt: true,
        organization: { select: { id: true, name: true, slug: true, logo: true } },
      },
    });
    if (!membership) return null;
    const availability = await db.userAvailability.findUnique({
      where: { userId },
      select: { rules: true },
    });
    return {
      organizationId: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      logo: membership.organization.logo,
      title: membership.title,
      canSetTitle: now.getTime() - membership.joinedAt.getTime() < JOIN_WINDOW_MS,
      blockedHours: blockedHoursPerWeek(parseAvailability(availability?.rules)),
    };
  });
  if (!club) return null;
  // Read on the service path: the member's own club, just checked above.
  const settings = await withSystemOrgTx(club.organizationId, { userId }, ({ db }) =>
    db.orgSettings.findUnique({
      where: { organizationId: club.organizationId },
      select: { showMemberAvailability: true },
    }),
  );
  // No settings row yet: the column's default (shared).
  return { ...club, sharesAvailability: settings?.showMemberAvailability ?? true };
}

/**
 * Sets the caller's own title in a club they joined within JOIN_WINDOW_MS.
 * `title` is already validated (clubRoleSchema). False when there is no
 * such membership (not a member, or joined too long ago).
 */
export async function setOwnClubTitle(
  userId: string,
  organizationId: string,
  title: string | null,
  now = new Date(),
): Promise<boolean> {
  const updated = await withSystemOrgTx(organizationId, { userId }, async ({ db }) => {
    const res = await db.membership.updateMany({
      where: {
        userId,
        organizationId,
        joinedAt: { gt: new Date(now.getTime() - JOIN_WINDOW_MS) },
        organization: { kind: "CLUB", deletedAt: null },
      },
      data: { title },
    });
    if (res.count === 0) return false;
    await writeOrgAuditLog(db, {
      organizationId,
      action: "membership.own_title_set",
      targetType: "Membership",
      targetId: userId,
      diff: { title },
    });
    return true;
  });
  if (updated) invalidate([tags.members(organizationId)]);
  return updated;
}
