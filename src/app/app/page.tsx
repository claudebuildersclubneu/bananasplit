import { redirect } from "next/navigation";

import { getActiveOrgId } from "@/lib/active-org-cookie";
import { requireUser } from "@/lib/auth/session";
import { withUserTx } from "@/server/db/context";
import { needsProfileSetup } from "@/server/onboarding/profile";
import { personalHomeHref } from "@/server/personal/space";

/**
 * /app: profile setup first if it isn't finished, then the space used last
 * (the active-org cookie: a club or Personal), else Personal, which is made
 * here if the account doesn't have one yet (docs/features/personal-and-clubs.md).
 */
export default async function AppIndexPage() {
  const user = await requireUser();
  if (await needsProfileSetup(user.id)) redirect("/onboarding");
  const activeOrgId = await getActiveOrgId();

  const slug = activeOrgId
    ? await withUserTx(user.id, async ({ db }) => {
        const active = await db.membership.findFirst({
          where: {
            userId: user.id,
            organizationId: activeOrgId,
            organization: { deletedAt: null },
          },
          select: { organization: { select: { slug: true } } },
        });
        return active?.organization.slug ?? null;
      })
    : null;

  redirect(slug ? `/app/${slug}` : await personalHomeHref(user.id));
}
