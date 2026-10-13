import { can } from "@/lib/auth/permissions";
import {
  FEATURE_LABELS,
  PLAN_FEATURES,
  PLAN_LIMITS,
  PLAN_NAMES,
  PLAN_ORDER,
  type PlanFeature,
} from "@/lib/billing/features";
import { CLUB_PLANS, dollars } from "@/lib/billing/plans";
import { getOrgContextBySlug } from "@/server/db/context";

import { SettingsNoAccess } from "../settings-no-access";
import { PlanCards, type PlanCard } from "./plan-cards";

/** What each plan's card says it adds over the one before it. */
function addedBy(plan: (typeof PLAN_ORDER)[number]): string[] {
  const added = (Object.keys(PLAN_FEATURES) as PlanFeature[])
    .filter((f) => PLAN_FEATURES[f] === plan)
    .map((f) => FEATURE_LABELS[f]);
  const limits = PLAN_LIMITS[plan];
  if (limits.storageGb > 0) added.push(`${limits.storageGb} GB of club storage`);
  if (limits.dataConnections > 0) added.push(`Up to ${limits.dataConnections} data connections`);
  return added;
}

const CARDS: PlanCard[] = [
  {
    plan: "FREE",
    name: PLAN_NAMES.FREE,
    price: "$0",
    per: "always",
    who: "RSVP pages and a simple task list for your club.",
    intro: "Includes",
    features: addedBy("FREE"),
  },
  {
    plan: "CLUB",
    name: PLAN_NAMES.CLUB,
    price: dollars(CLUB_PLANS.club.perMemberPerSemester),
    per: "per member / semester",
    who: "For active clubs with an officer team.",
    intro: "Everything in Free, plus",
    features: addedBy("CLUB"),
  },
  {
    plan: "SOCIETY",
    name: PLAN_NAMES.SOCIETY,
    price: dollars(CLUB_PLANS.society.perMemberPerSemester),
    per: "per member / semester",
    who: "For growing clubs that want every feature.",
    intro: "Everything in Club, plus",
    features: addedBy("SOCIETY"),
  },
];

/**
 * Admin panel > Plan: the club's plan and the three to choose from. The
 * OWNER switches (also enforced in the database: app.organization_guard);
 * admins can look. Billing isn't connected yet, so a switch takes effect
 * at once; when it is, an upgrade goes through /checkout instead.
 */
export default async function PlanSettingsPage({
  params,
}: PageProps<"/app/[orgSlug]/settings/plan">) {
  const { orgSlug } = await params;
  const { organization, role } = await getOrgContextBySlug(orgSlug);
  if (!can({ role }, "settings.view")) {
    return <SettingsNoAccess title="Plan" who="owners and admins" />;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-1.5">
        <h1 className="page-title">Plan</h1>
        <p className="text-muted-foreground text-sm">
          {organization.name} is on the{" "}
          <strong className="text-foreground">{PLAN_NAMES[organization.plan]}</strong> plan.
          Switching never deletes anything: what a plan doesn&apos;t include is locked, and comes
          back when you switch again.
        </p>
      </div>
      <PlanCards
        orgId={organization.id}
        current={organization.plan}
        cards={CARDS}
        canSwitch={can({ role }, "org.plan.write")}
      />
      <p className="text-muted-foreground text-xs">
        Billing isn&apos;t connected yet, so a switch takes effect right away and nothing is
        charged.
      </p>
    </div>
  );
}
