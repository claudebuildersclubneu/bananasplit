import { Lock } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { OrgKind, OrgPlan } from "@/generated/prisma/enums";
import {
  FEATURE_LABELS,
  FEATURE_PITCH,
  PLAN_NAMES,
  planFor,
  type PlanFeature,
} from "@/lib/billing/features";

/**
 * What a page shows when the space doesn't include it (planGate, on the
 * server, so typing the URL shows this too):
 * - Personal: the feature is for clubs; start one or join one. No price.
 * - A club: the feature, one line on what it does, the plan that has it,
 *   and the way there (Admin panel > Plan for the owner and admins; a word
 *   to ask the owner for everyone else, who never sees a price).
 */
export function PlanLocked({
  feature,
  orgSlug,
  kind = "CLUB",
  plan,
  canSeePlans,
  title,
}: {
  feature: PlanFeature;
  orgSlug: string;
  kind?: OrgKind;
  /** The club's current plan. */
  plan: OrgPlan;
  /** Owners and admins: a link to Admin panel > Plan. */
  canSeePlans: boolean;
  /** The page's own title, when it differs from the feature's name. */
  title?: string;
}) {
  const base = `/app/${orgSlug}`;
  const plural = feature === "taskViews" || feature === "teamwork";

  if (kind === "PERSONAL") {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="page-title">{title ?? FEATURE_LABELS[feature]}</h1>
        <div className="bg-card space-y-3 rounded-xl border p-6">
          <p className="heading text-base">
            {FEATURE_LABELS[feature]} {plural ? "are" : "is"} for clubs.
          </p>
          <p className="text-muted-foreground max-w-prose text-sm">{FEATURE_PITCH[feature]}</p>
          <p className="text-muted-foreground max-w-prose text-sm">
            Personal is just for you. Join your club, or start one, to use this with others.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1.5">
            <Button asChild size="sm">
              <Link href="/onboarding/join">Join a club</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/onboarding/organization">Start a club</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const needs = PLAN_NAMES[planFor(feature)];
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="page-title">{title ?? FEATURE_LABELS[feature]}</h1>
      <div className="bg-card space-y-3 rounded-xl border p-6">
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
          <Lock className="size-3.5" aria-hidden="true" />
          {needs} plan
        </p>
        <p className="heading text-base">
          {FEATURE_LABELS[feature]} {plural ? "come" : "comes"} with the {needs} plan.
        </p>
        <p className="text-muted-foreground max-w-prose text-sm">{FEATURE_PITCH[feature]}</p>
        <p className="text-muted-foreground max-w-prose text-sm">
          {canSeePlans
            ? `Your club is on the ${PLAN_NAMES[plan]} plan. Nothing you already made is lost when you switch.`
            : "Your club's plan doesn't include this. Ask your club's owner if you need it."}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1.5">
          {canSeePlans && (
            <Button asChild size="sm">
              <Link href={`${base}/settings/plan`}>See plans</Link>
            </Button>
          )}
          <Button asChild size="sm" variant="ghost">
            <Link href={`${base}/calendar`}>Go to events</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
