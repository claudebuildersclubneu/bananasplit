"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { ProjectStatus } from "@/generated/prisma/enums";
import { can } from "@/lib/auth/permissions";
import { dueDateKey, fromDateKey, isDateKey } from "@/lib/tasks/dates";
import {
  canArchiveProject,
  canChangeProjectLead,
  canCreateProject,
  canDeleteProject,
  canEditProject,
  PROJECT_ARCHIVE_DENIED,
  PROJECT_CREATE_DENIED,
  PROJECT_DELETE_DENIED,
  PROJECT_EDIT_DENIED,
  PROJECT_LEAD_DENIED,
  type ProjectActor,
} from "@/lib/tasks/projects";
import { HEX_RE } from "@/lib/theme/hex";
import { withOrgAction, type OrgContext } from "@/server/db/context";
import { chartPalette, nextColor } from "@/server/tasks/catalog";
import { projectOptionSelect, type ProjectOption } from "@/server/tasks/queries";

/**
 * Projects on the task board (src/lib/tasks/projects.ts has the rules).
 *
 * Creating and editing a project is every member's while the club's
 * `memberCanCreateProjects` is on (the default; the Project INSERT policy
 * reads the same flag), otherwise owners and admins only, and a project's
 * lead always keeps their own up to date. Archiving, unarchiving, deleting
 * and handing the lead on belong to owners, admins and the lead (the
 * Project DELETE policy and app.project_lead_guard agree). The Project
 * UPDATE policy is otherwise any member's (members keep a project's status
 * and dates current), so these checks are the only thing between a member
 * and archiving somebody else's project: they live here, not only in the UI.
 */

const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);

const dateKey = z.string().refine(isDateKey, "Pick a valid date.").nullable().optional();

const fields = {
  name: z.string().trim().min(1, "Name is required").max(100, "Keep the name under 100 characters"),
  description: z.string().trim().max(2000).nullable().optional(),
  color: z
    .string()
    .regex(HEX_RE, "Pick a colour.")
    .transform((c) => c.toLowerCase())
    .nullable()
    .optional(),
  leadId: id.nullable().optional(),
  status: z.enum(ProjectStatus).optional(),
  startDate: dateKey,
  targetDate: dateKey,
};

const createSchema = z.object(fields);
const updateSchema = z.object({ ...fields, name: fields.name.optional() });

type Result = { error: string } | { project: ProjectOption };

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

async function actorOf(ctx: OrgContext): Promise<ProjectActor> {
  const settings = await ctx.db.orgSettings.findUnique({
    where: { organizationId: ctx.organizationId },
    select: { memberCanCreateProjects: true },
  });
  return {
    userId: ctx.userId,
    isAdmin: can(ctx, "tasks.manageAll"),
    membersCanCreate: settings?.memberCanCreateProjects ?? true,
  };
}

async function assertLead(ctx: OrgContext, leadId: string | null | undefined) {
  if (!leadId) return null;
  const member = await ctx.db.membership.findFirst({
    where: { organizationId: ctx.organizationId, userId: leadId },
    select: { id: true },
  });
  return member ? null : "The lead has to be a member of this club.";
}

function datesError(start: string | null, target: string | null): string | null {
  return start && target && target < start ? "The target date can't be before the start." : null;
}

const toDate = (key: string | null | undefined) =>
  key === undefined ? undefined : key ? fromDateKey(key) : null;

const createProjectTx = withOrgAction(async (ctx, input: unknown): Promise<Result> => {
  const actor = await actorOf(ctx);
  if (!canCreateProject(actor)) return { error: PROJECT_CREATE_DENIED };
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;
  const leadError = await assertLead(ctx, d.leadId);
  if (leadError) return { error: leadError };
  const dates = datesError(d.startDate ?? null, d.targetDate ?? null);
  if (dates) return { error: dates };

  let color = d.color ?? null;
  if (!color) {
    const used = await ctx.db.project.findMany({
      where: { organizationId: ctx.organizationId, archivedAt: null },
      select: { color: true },
    });
    color = nextColor(
      await chartPalette(ctx.db, ctx.organizationId),
      used.map((p) => p.color),
    );
  }
  const project = await ctx.db.project.create({
    data: {
      organizationId: ctx.organizationId,
      name: d.name,
      description: d.description || null,
      color,
      leadId: d.leadId ?? null,
      status: d.status ?? ProjectStatus.ACTIVE,
      startDate: toDate(d.startDate) ?? null,
      targetDate: toDate(d.targetDate) ?? null,
    },
    select: projectOptionSelect,
  });
  return { project };
});

export async function createProject(orgId: string, input: unknown) {
  const result = await createProjectTx(orgId, input);
  if (!("error" in result)) refresh();
  return result;
}

async function loadProject(ctx: OrgContext, projectId: string) {
  if (!id.safeParse(projectId).success) return null;
  return ctx.db.project.findFirst({
    where: { id: projectId, organizationId: ctx.organizationId },
    select: { id: true, leadId: true, startDate: true, targetDate: true },
  });
}

const updateProjectTx = withOrgAction(
  async (ctx, projectId: string, input: unknown): Promise<Result> => {
    const project = await loadProject(ctx, projectId);
    if (!project) return { error: "Project not found." };
    const actor = await actorOf(ctx);
    if (!canEditProject(actor, project)) return { error: PROJECT_EDIT_DENIED };
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    const d = parsed.data;
    // Leading a project lets you delete it, so only an admin or the current
    // lead moves the lead (app.project_lead_guard says the same).
    if (
      d.leadId !== undefined &&
      d.leadId !== project.leadId &&
      !canChangeProjectLead(actor, project)
    ) {
      return { error: PROJECT_LEAD_DENIED };
    }
    const leadError = await assertLead(ctx, d.leadId);
    if (leadError) return { error: leadError };
    const start =
      d.startDate !== undefined
        ? d.startDate
        : project.startDate
          ? dueDateKey(project.startDate)
          : null;
    const target =
      d.targetDate !== undefined
        ? d.targetDate
        : project.targetDate
          ? dueDateKey(project.targetDate)
          : null;
    const dates = datesError(start ?? null, target ?? null);
    if (dates) return { error: dates };

    const updated = await ctx.db.project.update({
      where: { id: project.id, organizationId: ctx.organizationId },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.description !== undefined ? { description: d.description || null } : {}),
        ...(d.color !== undefined ? { color: d.color } : {}),
        ...(d.leadId !== undefined ? { leadId: d.leadId } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.startDate !== undefined ? { startDate: toDate(d.startDate) } : {}),
        ...(d.targetDate !== undefined ? { targetDate: toDate(d.targetDate) } : {}),
      },
      select: projectOptionSelect,
    });
    return { project: updated };
  },
);

export async function updateProject(orgId: string, projectId: string, input: unknown) {
  const result = await updateProjectTx(orgId, projectId, input);
  if (!("error" in result)) refresh();
  return result;
}

const setArchivedTx = withOrgAction(
  async (ctx, projectId: string, archived: boolean): Promise<{ error?: string }> => {
    const project = await loadProject(ctx, projectId);
    if (!project) return { error: "Project not found." };
    if (!canArchiveProject(await actorOf(ctx), project)) return { error: PROJECT_ARCHIVE_DENIED };
    await ctx.db.project.updateMany({
      where: { id: project.id, organizationId: ctx.organizationId },
      data: { archivedAt: archived ? new Date() : null },
    });
    return {};
  },
);

export async function archiveProject(orgId: string, projectId: string) {
  const result = await setArchivedTx(orgId, projectId, true);
  if (!result.error) refresh();
  return result;
}

export async function unarchiveProject(orgId: string, projectId: string) {
  const result = await setArchivedTx(orgId, projectId, false);
  if (!result.error) refresh();
  return result;
}

/** Deletes a project; its tasks stay, with no project. */
const deleteProjectTx = withOrgAction(
  async (ctx, projectId: string): Promise<{ error?: string }> => {
    const project = await loadProject(ctx, projectId);
    if (!project) return { error: "Project not found." };
    if (!canDeleteProject(await actorOf(ctx), project)) return { error: PROJECT_DELETE_DENIED };
    // Task.projectId is ON DELETE SET NULL: the tasks stay, unfiled.
    await ctx.db.project.deleteMany({
      where: { id: project.id, organizationId: ctx.organizationId },
    });
    return {};
  },
);

export async function deleteProject(orgId: string, projectId: string) {
  const result = await deleteProjectTx(orgId, projectId);
  if (!result.error) refresh();
  return result;
}
