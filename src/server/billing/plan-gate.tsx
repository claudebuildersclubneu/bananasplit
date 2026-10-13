import "server-only";

import type { ReactNode } from "react";

import { PlanLocked } from "@/components/billing/plan-locked";
import { can } from "@/lib/auth/permissions";
import { planIncludes, type PlanFeature } from "@/lib/billing/features";
import { getOrgContextBySlug } from "@/server/db/context";

/**
 * A page's plan check, on the server, before it loads anything:
 *
 *   const locked = await planGate(orgSlug, "finance");
 *   if (locked) return locked;
 *
 * null when the club's plan includes `feature`; otherwise the upgrade
 * screen to return instead of the page. getOrgContextBySlug is cached per
 * request, so this costs nothing extra.
 */
export async function planGate(
  orgSlug: string,
  feature: PlanFeature,
  options: { title?: string } = {},
): Promise<ReactNode | null> {
  const { organization, role } = await getOrgContextBySlug(orgSlug);
  if (planIncludes(organization.plan, feature)) return null;
  return (
    <PlanLocked
      feature={feature}
      orgSlug={organization.slug}
      plan={organization.plan}
      canSeePlans={can({ role }, "settings.view")}
      title={options.title}
    />
  );
}
