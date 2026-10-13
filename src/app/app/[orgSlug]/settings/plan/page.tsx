import { redirect } from "next/navigation";

import { can } from "@/lib/auth/permissions";
import {
  FEATURE_LABELS,
  PLAN_FEATURES,
  PLAN_LIMITS,
  PLAN_NAMES,
  type PlanFeature,
  type PricedPlan,
} from "@/lib/billing/features";
import { CLUB_PLANS, dollars } from "@/lib/billing/plans";
import { spaceStatus, trialDaysLeft } from "@/lib/billing/space";
import { getOrgContextBySlug } from "@/server/db/context";

import { SettingsNoAccess } from "../settings-no-access";
import { PlanCards, type PlanCard } from "./plan-cards";

/** What a plan's card lists: the features of `plans`, and the last one's limits. */
function addedBy(plans: readonly PricedPlan[]): string[] {
  const added = (Object.keys(PLAN_FEATURES) as PlanFeature[])
    .filter((f) => (plans as readonly string[]).includes(PLAN_FEATURES[f]))
    .map((f) => FEATURE_LABELS[f]);
  const limits = PLAN_LIMITS[plans[plans.length - 1]!];
  if (limits.storageGb > 0) added.push(`${limits.storageGb} GB of club storage`);
  if (limits.dataConnections > 0) added.push(`Up to ${limits.dataConnections} data connections`);
  return added;
}

const CARDS: PlanCard[] = [
  {
    plan: "CLUB",
    name: PLAN_NAMES.CLUB,
    price: dollars(CLUB_PLANS.club.perMemberPerSemester),
    per: "per member / semester",
    who: "For active clubs with an officer team.",
    intro: "Includes",
    // Club has everything Personal does (FREE) too; the card lists both.
    features: addedBy(["FREE", "CLUB"]),
  },
  {
    plan: "SOCIETY",
    name: PLAN_NAMES.SOCIETY,
    price: dollars(CLUB_PLANS.society.perMemberPerSemester),
    per: "per member / semester",
    who: "For growing clubs that want every feature.",
    intro: "Everything in Club, plus",
    features: addedBy(["SOCIETY"]),
  },
];

/**
 * Admin panel > Plan: the club's trial, and Club or Society to choose
 * (docs/features/personal-and-clubs.md). The OWNER chooses (also enforced
 * in the database: app.organization_guard); admins can look. A paused club
 * (trial over, no plan yet) is sent here by its banner: choosing a plan is
 * the one change it accepts. Billing isn't connected yet, so a choice takes
 * effect at once; when it is, it goes through checkout instead
 * (changeOrgPlan is the seam). A Personal space has no plan to choose.
 */
export default async function PlanSettingsPage({
  params,
}: PageProps<"/app/[orgSlug]/settings/plan">) {
  const { orgSlug } = await params;
  const { organization, role } = await getOrgContextBySlug(orgSlug);
  if (organization.kind === "PERSONAL") redirect(`/app/${organization.slug}/settings`);
  if (!can({ role }, "settings.view")) {
    return <SettingsNoAccess title="Plan" who="owners and admins" />;
  }
  const status = spaceStatus(organization);
  const days = trialDaysLeft(organization);
  const canSwitch = can({ role }, "org.plan.write");

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-1.5">
        <h1 className="page-title">{status === "paused" ? "Choose a plan" : "Plan"}</h1>
        <p className="text-muted-foreground text-sm">
          {status === "trial" && days !== null ? (
            <>
              {organization.name} is on its free trial, with everything included:{" "}
              <strong className="text-foreground">
                {days} {days === 1 ? "day" : "days"} left
              </strong>
              . Choose Club or Society before it ends to keep going without a pause.
            </>
          ) : status === "paused" ? (
            <>
              The free trial has ended, so {organization.name} is paused: everything is still here
              and everyone can read it, but nothing can be added or changed until{" "}
              {canSwitch ? "you choose" : "the owner chooses"} a plan.
            </>
          ) : (
            <>
              {organization.name} is on the{" "}
              <strong className="text-foreground">{PLAN_NAMES[organization.plan]}</strong> plan.
              Switching never deletes anything: what a plan leaves out is locked, and comes back
              when you switch again.
            </>
          )}
        </p>
        <p className="text-muted-foreground text-sm">Members who join never pay.</p>
      </div>
      <PlanCards
        orgId={organization.id}
        current={organization.plan}
        cards={CARDS}
        canSwitch={canSwitch}
      />
      <p className="text-muted-foreground text-xs">
        Billing isn&apos;t connected yet, so a choice takes effect right away and nothing is
        charged.
      </p>
    </div>
  );
}
