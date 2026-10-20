"use server";

import { requirePermission } from "@/lib/auth/permissions";
import { isStartedStep } from "@/lib/overview/getting-started";
import { writeOrgAuditLog } from "@/server/audit";
import { withOrgAction } from "@/server/db/context";

/**
 * Checks a "Get your club started" step off as not needed, or puts it back
 * (OWNER/ADMIN; RLS lets only them update OrgSettings). Steps the club has
 * actually done stay done whatever is stored here.
 */
export const setStartedStepSkipped = withOrgAction(
  async (ctx, step: unknown, skipped: unknown): Promise<{ ok: boolean; error?: string }> => {
    requirePermission(ctx, "settings.general.write");
    if (!isStartedStep(step) || typeof skipped !== "boolean") {
      return { ok: false, error: "That step isn't on the list." };
    }
    const row = await ctx.db.orgSettings.findUnique({
      where: { organizationId: ctx.organizationId },
      select: { startedSkipped: true },
    });
    const current = new Set(row?.startedSkipped ?? []);
    if (skipped) current.add(step);
    else current.delete(step);
    await ctx.db.orgSettings.update({
      where: { organizationId: ctx.organizationId },
      data: { startedSkipped: [...current] },
      select: { organizationId: true },
    });
    await writeOrgAuditLog(ctx.db, {
      organizationId: ctx.organizationId,
      action: "settings.started.updated",
      targetType: "OrgSettings",
      targetId: ctx.organizationId,
      diff: { step, skipped },
    });
    return { ok: true };
  },
  { onRefused: "return" },
);
