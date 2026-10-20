"use server";

import { z } from "zod";

import { can } from "@/lib/auth/permissions";
import { canCreateTags, cleanTagName, MAX_TAG_NAME, TAG_CREATE_DENIED } from "@/lib/tasks/tags";
import { HEX_RE } from "@/lib/theme/hex";
import { writeOrgAuditLog } from "@/server/audit";
import { withOrgAction, type OrgContext } from "@/server/db/context";
import { sqlStateOf } from "@/server/db/errors";
import { chartPalette, nextColor } from "@/server/tasks/catalog";

/** Every tag action belongs to tags (withOrgAction's space check: the "labels" feature). */
const tagsAction: typeof withOrgAction = (handler, options) =>
  withOrgAction(handler, { onRefused: "return", ...options, feature: "labels" });

/**
 * Tags (stored as Label), on app_user through withOrgAction.
 *
 * createTag is the only one: anyone makes a tag from a task's tag field (or
 * `#tag` in a title) while adding or editing it. The Label INSERT policy
 * still reads OrgSettings.memberCanCreateTags, which nothing turns off any
 * more. A name that already exists in any case is reused, never doubled:
 * the unique index on ("organizationId", lower("name")) settles a race
 * between two people making the same tag, and the loser gets the winner's.
 */

export interface TagOption {
  id: string;
  name: string;
  color: string;
}

const nameSchema = z
  .string()
  .transform(cleanTagName)
  .pipe(z.string().min(1, "Name the tag.").max(MAX_TAG_NAME));
const colorSchema = z
  .string()
  .regex(HEX_RE, "Pick a colour.")
  .transform((c) => c.toLowerCase());

const createSchema = z.object({ name: nameSchema, color: colorSchema.optional() });

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
  // A savepoint, so a unique violation (someone made it a moment ago)
  // doesn't abort the action's transaction.
  await ctx.db.$executeRaw`SAVEPOINT tag_create`;
  let tag: TagOption;
  try {
    tag = await ctx.db.label.create({
      data: {
        organizationId: ctx.organizationId,
        name: parsed.data.name,
        color,
        createdById: ctx.userId,
      },
      select: tagSelect,
    });
    await ctx.db.$executeRaw`RELEASE SAVEPOINT tag_create`;
  } catch (error) {
    await ctx.db.$executeRaw`ROLLBACK TO SAVEPOINT tag_create`;
    if (sqlStateOf(error) !== "23505") throw error;
    const winner = await sameName(ctx, parsed.data.name);
    if (!winner) throw error;
    return { tag: winner, created: false };
  }
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
