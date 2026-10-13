"use server";

import { requirePermission } from "@/lib/auth/permissions";
import { isOrgPlan } from "@/lib/billing/features";
import { changeOrgPlan } from "@/server/billing/change-plan";
import { withOrgAction } from "@/server/db/context";

/**
 * Admin panel > Plan: the OWNER switches the club's plan. Billing isn't
 * connected yet, so the switch takes effect at once (and is audit-logged);
 * once it is, an upgrade goes through checkout instead and this keeps the
 * downgrades.
 */

export interface PlanResult {
  error?: string;
}

export const switchPlan = withOrgAction(async (ctx, plan: unknown): Promise<PlanResult> => {
  requirePermission(ctx, "org.plan.write");
  if (!isOrgPlan(plan)) return { error: "Choose a plan." };
  await changeOrgPlan(ctx.db, ctx.organizationId, plan);
  return {};
});
