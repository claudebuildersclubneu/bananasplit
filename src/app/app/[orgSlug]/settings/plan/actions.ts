"use server";

import { requirePermission } from "@/lib/auth/permissions";
import { isClubPlanChoice } from "@/lib/billing/features";
import { changeOrgPlan } from "@/server/billing/change-plan";
import { withOrgAction } from "@/server/db/context";

/**
 * Admin panel > Plan: the OWNER picks Club or Society for the club, during
 * its trial or after it (a paused club: this is the one write it allows).
 * Billing isn't connected yet, so the switch takes effect at once (and is
 * audit-logged); once it is, an upgrade goes through checkout instead and
 * this keeps the downgrades. Back to a trial, or to Free (Personal's plan),
 * is never a choice: the database refuses both too
 * (app.organization_space_guard).
 */

export interface PlanResult {
  error?: string;
}

export const switchPlan = withOrgAction(
  async (ctx, plan: unknown): Promise<PlanResult> => {
    requirePermission(ctx, "org.plan.write");
    if (!isClubPlanChoice(plan)) return { error: "Choose Club or Society." };
    await changeOrgPlan(ctx.db, ctx.organizationId, plan);
    return {};
  },
  { whenPaused: "allow" },
);
