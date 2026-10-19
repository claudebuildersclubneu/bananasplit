"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/permissions";
import { canCreateTags, cleanTagName, MAX_TAG_NAME, TAG_CREATE_DENIED } from "@/lib/tasks/tags";
import { HEX_RE } from "@/lib/theme/hex";
import { writeOrgAuditLog } from "@/server/audit";
import { withOrgAction, type OrgContext } from "@/server/db/context";
import { chartPalette, nextColor } from "@/server/tasks/catalog";

/** Every tag action belongs to tags (withOrgAction's space check: the "labels" feature). */
const tagsAction: typeof withOrgAction = (handler, options) =>
  withOrgAction(handler, { onRefused: "return", ...options, feature: "labels" });

/**
 * Tags (stored as Label), on app_user through withOrgAction.
 *
 * - createTag: anyone, from any tag field, while the club's
 *   `memberCanCreateTags` is on (the default; the Label INSERT policy reads
 *   the same flag and pins createdById to the maker); otherwise owners and
 *   admins. A name that already exists in any case is reused, never doubled.
 * - Rename, recolour, merge and delete: owners and admins (Settings > Tags).
 * - setCreationRules: the "Who can create tags / projects" switches.
 */

export interface TagOption {
  id: string;
  name: string;
  color: string;
}

const DENIED = "Only owners and admins can manage tags.";

const nameSchema = z
  .string()
  .transform(cleanTagName)
  .pipe(z.string().min(1, "Name the tag.").max(MAX_TAG_NAME));
const colorSchema = z
  .string()
  .regex(HEX_RE, "Pick a colour.")
  .transform((c) => c.toLowerCase());
const idSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);

const createSchema = z.object({ name: nameSchema, color: colorSchema.optional() });
const updateSchema = z.object({ name: nameSchema.optional(), color: colorSchema.optional() });

const tagSelect = { id: true, name: true, color: true } as const;

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

/** The club's tag with this name, ignoring case (excluding one id, for renames). */
function sameName(ctx: OrgContext, name: string, exceptId?: string) {
  return ctx.db.label.findFirst({
    where: {
      organizationId: ctx.organizationId,
      name: { equals: name, mode: "insensitive" },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: tagSelect,
  });
}

async function membersCanCreateTags(ctx: OrgContext): Promise<boolean> {
  const settings = await ctx.db.orgSettings.findUnique({
    where: { organizationId: ctx.organizationId },
    select: { memberCanCreateTags: true },
  });
  return settings?.memberCanCreateTags ?? true;
}

const isAdmin = (ctx: OrgContext) => can(ctx, "labels.write");

type CreateResult = { error: string } | { tag: TagOption; created: boolean };

/** Makes a tag (or hands back the one that already has the name). */
export const createTag = tagsAction(async (ctx, input: unknown): Promise<CreateResult> => {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const existing = await sameName(ctx, parsed.data.name);
  if (existing) return { tag: existing, created: false };

  const admin = isAdmin(ctx);
  if (!canCreateTags({ isAdmin: admin, membersCanCreate: await membersCanCreateTags(ctx) })) {
    return { error: TAG_CREATE_DENIED };
  }
  let color = parsed.data.color;
  if (!color) {
    const used = await ctx.db.label.findMany({
      where: { organizationId: ctx.organizationId },
      select: { color: true },
    });
    color = nextColor(
      await chartPalette(ctx.db, ctx.organizationId),
      used.map((l) => l.color),
    );
  }
  const tag = await ctx.db.label.create({
    data: {
      organizationId: ctx.organizationId,
      name: parsed.data.name,
      color,
      createdById: ctx.userId,
    },
    select: tagSelect,
  });
  if (admin) {
    await writeOrgAuditLog(ctx.db, {
      organizationId: ctx.organizationId,
      action: "label.created",
      targetType: "Label",
      targetId: tag.id,
      diff: { name: tag.name },
    });
  }
  return { tag, created: true };
});

/** Rename and/or recolour (owners and admins). */
export const updateLabel = tagsAction(
  async (ctx, labelId: string, input: unknown): Promise<{ error?: string }> => {
    if (!isAdmin(ctx)) return { error: DENIED };
    const id = idSchema.safeParse(labelId);
    if (!id.success) return { error: "Tag not found." };
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    const { name, color } = parsed.data;
    if (name) {
      const clash = await sameName(ctx, name, id.data);
      if (clash) return { error: `There's already a tag called “${clash.name}”. Merge them instead.` };
    }
    const { count } = await ctx.db.label.updateMany({
      where: { id: id.data, organizationId: ctx.organizationId },
      data: { ...(name ? { name } : {}), ...(color ? { color } : {}) },
    });
    if (count === 0) return { error: "Tag not found." };
    if (name) {
      await writeOrgAuditLog(ctx.db, {
        organizationId: ctx.organizationId,
        action: "label.renamed",
        targetType: "Label",
        targetId: id.data,
        diff: { name },
      });
    }
    return {};
  },
);

/**
 * Merge one tag into another (owners and admins): every task tagged with
 * the first is tagged with the second, then the first is deleted.
 */
export const mergeLabels = tagsAction(
  async (ctx, sourceId: string, targetId: string): Promise<{ error?: string; moved?: number }> => {
    if (!isAdmin(ctx)) return { error: DENIED };
    const source = idSchema.safeParse(sourceId);
    const target = idSchema.safeParse(targetId);
    if (!source.success || !target.success) return { error: "Tag not found." };
    if (source.data === target.data) return { error: "Pick a different tag to merge into." };
    const both = await ctx.db.label.findMany({
      where: { organizationId: ctx.organizationId, id: { in: [source.data, target.data] } },
      select: { id: true, name: true },
    });
    if (both.length !== 2) return { error: "Tag not found." };
    const tagged = await ctx.db.taskLabel.findMany({
      where: { organizationId: ctx.organizationId, labelId: source.data },
      select: { taskId: true },
    });
    if (tagged.length > 0) {
      await ctx.db.taskLabel.createMany({
        data: tagged.map((t) => ({
          organizationId: ctx.organizationId,
          taskId: t.taskId,
          labelId: target.data,
        })),
        skipDuplicates: true,
      });
    }
    await ctx.db.taskLabel.deleteMany({
      where: { organizationId: ctx.organizationId, labelId: source.data },
    });
    await ctx.db.label.deleteMany({ where: { id: source.data, organizationId: ctx.organizationId } });
    await writeOrgAuditLog(ctx.db, {
      organizationId: ctx.organizationId,
      action: "label.merged",
      targetType: "Label",
      targetId: target.data,
      diff: { from: both.find((l) => l.id === source.data)?.name ?? null },
    });
    return { moved: tagged.length };
  },
);

export const deleteLabel = tagsAction(
  async (ctx, labelId: string): Promise<{ error?: string }> => {
    if (!isAdmin(ctx)) return { error: DENIED };
    const id = idSchema.safeParse(labelId);
    if (!id.success) return { error: "Tag not found." };
    await ctx.db.taskLabel.deleteMany({
      where: { labelId: id.data, organizationId: ctx.organizationId },
    });
    const { count } = await ctx.db.label.deleteMany({
      where: { id: id.data, organizationId: ctx.organizationId },
    });
    if (count > 0) {
      await writeOrgAuditLog(ctx.db, {
        organizationId: ctx.organizationId,
        action: "label.deleted",
        targetType: "Label",
        targetId: id.data,
      });
    }
    return {};
  },
);

const rulesSchema = z.object({
  memberCanCreateTags: z.boolean().optional(),
  memberCanCreateProjects: z.boolean().optional(),
});

/** Who can create tags and projects: everyone (the default) or owners and admins. */
const setCreationRulesTx = withOrgAction(
  async (ctx, input: unknown): Promise<{ error?: string }> => {
    if (!can(ctx, "settings.general.write")) return { error: DENIED };
    const parsed = rulesSchema.safeParse(input);
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    await ctx.db.orgSettings.upsert({
      where: { organizationId: ctx.organizationId },
      create: { organizationId: ctx.organizationId, ...parsed.data },
      update: parsed.data,
    });
    await writeOrgAuditLog(ctx.db, {
      organizationId: ctx.organizationId,
      action: "settings.creation_rules",
      targetType: "OrgSettings",
      targetId: ctx.organizationId,
      diff: parsed.data,
    });
    return {};
  },
);

export async function setCreationRules(orgId: string, input: unknown) {
  const result = await setCreationRulesTx(orgId, input);
  if (!result.error) refresh();
  return result;
}
