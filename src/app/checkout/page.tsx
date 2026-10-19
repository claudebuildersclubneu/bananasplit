import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { handleAuthErrorInPage } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/session";
import { isClubPlanId } from "@/lib/billing/plans";
import { formatSemesterDate, nextSemesterStart } from "@/lib/billing/semester";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { getOnboardingProfile } from "@/server/onboarding/profile";

import { checkoutAvailable } from "./availability";
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
 * Checkout (the design's "04 · Checkout (Stripe)"), in Moonstone: subscribe a
 * club to Team (?plan=club) or Team Advanced (?plan=society, the default),
 * or yourself to Personal Plus (?plan=plus). The query values are the old
 * plan names, kept so existing links work. ?org=<slug> picks the club when
 * the user belongs to it, else their first club; the seats start at its
 * member count. Billing isn't connected yet: the form never submits (see
 * CheckoutForm).
 */
export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  // The card fields are a visual stand-in for Stripe's Payment Element. On
  // the production deployment the page doesn't exist until billing is
  // connected, so nobody types a real card number into our own inputs.
  if (!checkoutAvailable()) notFound();
  const user = await requireUser();
  const params = await searchParams;
  const plan: CheckoutPlan =
    params.plan === "plus" ? "plus" : isClubPlanId(params.plan) ? params.plan : "society";
  const orgParam = typeof params.org === "string" ? params.org : null;

  // Personal Plus is for the person, not a club: no seats to count.
  if (plan === "plus") {
    return (
      <CheckoutForm
        plan={plan}
        clubName=""
        initialMembers={1}
        email={user.email}
        backHref="/#pricing"
        backLabel="Bananasplit, back to pricing"
        {...renewal()}
      />
    );
  }

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
