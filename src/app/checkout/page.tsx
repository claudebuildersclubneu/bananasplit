import type { Metadata } from "next";

import { handleAuthErrorInPage } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/session";
import { formatSemesterDate, nextSemesterStart } from "@/lib/billing/semester";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { getOnboardingProfile } from "@/server/onboarding/profile";

import { CheckoutForm, type CheckoutPlan } from "./checkout-form";

export const metadata: Metadata = { title: "Subscribe · Bananasplit" };

/** The seat count shown when the user has no club yet (the design's sample). */
const DEFAULT_MEMBERS = 40;

/** The renewal line's date, read at request time (outside the render body). */
function renewal() {
  const next = nextSemesterStart(new Date());
  return { renewsOn: formatSemesterDate(next.date), renewsFor: next.season };
}

/**
 * Checkout (the design's "04 · Checkout (Stripe)"): subscribe a club to the
 * Club or Society plan. ?plan=club|society (Society otherwise), ?org=<slug>.
 * The club is that org when the user belongs to it, else their first club;
 * the seats start at its member count. Billing isn't connected yet: the form
 * never submits (see CheckoutForm).
 */
export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const user = await requireUser();
  const params = await searchParams;
  const plan: CheckoutPlan = params.plan === "club" ? "club" : "society";
  const orgParam = typeof params.org === "string" ? params.org : null;

  // Only the user's own orgs: a slug they don't belong to falls back to
  // their first club rather than a 404.
  const memberships = (await getOnboardingProfile(user.id))?.memberships ?? [];
  const club = memberships.find((m) => m.slug === orgParam) ?? memberships[0] ?? null;

  let members = DEFAULT_MEMBERS;
  if (club) {
    const { organization } = await getOrgContextBySlug(club.slug);
    const count = await withOrgTx(organization.id, ({ db }) =>
      db.membership.count({ where: { organizationId: organization.id } }),
    ).catch(handleAuthErrorInPage);
    members = Math.max(1, count);
  }

  return (
    <CheckoutForm
      plan={plan}
      clubName={club?.name ?? "your club"}
      initialMembers={members}
      email={user.email}
      backHref={club ? `/app/${club.slug}/settings/general` : "/"}
      backLabel={club ? "Bananasplit, back to club settings" : "Bananasplit, back to home"}
      {...renewal()}
    />
  );
}
