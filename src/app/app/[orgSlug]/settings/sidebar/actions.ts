"use server";

import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth/permissions";
import { sidebarConfigSchema } from "@/lib/nav/sidebar";
import { writeOrgAuditLog } from "@/server/audit";
import { withOrgAction } from "@/server/db/context";

/** Every action here belongs to sidebar (withOrgAction's space check). */
const sidebarAction: typeof withOrgAction = (handler, options) =>
  withOrgAction(handler, { onRefused: "return", ...options, feature: "sidebar" });

/**
 * Saves the org's sidebar (OWNER/ADMIN; RLS lets only them update
 * OrgSettings). null puts the default back.
 */
export const saveSidebarAction = sidebarAction(
  async (ctx, raw: unknown): Promise<{ ok: boolean; error?: string }> => {
    requirePermission(ctx, "settings.general.write");
    let value: Prisma.InputJsonValue | typeof Prisma.DbNull = Prisma.DbNull;
    if (raw !== null) {
      const parsed = sidebarConfigSchema.safeParse(raw);
      if (!parsed.success)
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the sidebar." };
      value = parsed.data as unknown as Prisma.InputJsonValue;
    }
    await ctx.db.orgSettings.update({
      where: { organizationId: ctx.organizationId },
      data: { sidebar: value },
      select: { organizationId: true },
    });
    await writeOrgAuditLog(ctx.db, {
      organizationId: ctx.organizationId,
      action: "settings.sidebar.updated",
      targetType: "OrgSettings",
      targetId: ctx.organizationId,
      diff: { reset: raw === null },
    });
    return { ok: true };
  },
);
