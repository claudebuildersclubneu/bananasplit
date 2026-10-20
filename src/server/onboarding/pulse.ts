import { requirePermission } from "@/lib/auth/permissions";
import { pulseSettingsSchema, type PulseSettings } from "@/lib/pulse/settings";
import { writeOrgAuditLog } from "@/server/audit";
import type { OrgContext } from "@/server/db/context";

import type { StepResult } from "./org-setup";

/**
 * The weekly pulse's settings, saved from club setup (the Weekly pulse
 * step, after Teams) and from Admin panel › Weekly pulse: OrgSettings
 * pulseEnabled, pulseDay, pulseHourLocal, pulseAudience, pulseEmail and
 * pulseInApp. OWNER/ADMIN only (RLS lets only them update OrgSettings).
 */

export async function loadPulseSettings(
  ctx: Pick<OrgContext, "db" | "organizationId">,
): Promise<PulseSettings | null> {
  return ctx.db.orgSettings.findUnique({
    where: { organizationId: ctx.organizationId },
    select: {
      pulseEnabled: true,
      pulseDay: true,
      pulseHourLocal: true,
      pulseAudience: true,
      pulseEmail: true,
      pulseInApp: true,
    },
  });
}

export async function savePulseSettings(
  ctx: Pick<OrgContext, "db" | "organizationId" | "role" | "userId">,
  raw: unknown,
): Promise<StepResult> {
  requirePermission(ctx, "settings.general.write");
  const parsed = pulseSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Pick a day, a time and who gets it." };
  }
  await ctx.db.orgSettings.update({
    where: { organizationId: ctx.organizationId },
    data: { ...parsed.data, updatedById: ctx.userId },
    select: { organizationId: true },
  });
  await writeOrgAuditLog(ctx.db, {
    organizationId: ctx.organizationId,
    action: "settings.pulse.updated",
    targetType: "OrgSettings",
    targetId: ctx.organizationId,
    diff: { ...parsed.data },
  });
  return { ok: true };
}
