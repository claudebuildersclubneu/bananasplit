/**
 * Who may do what to a project (pure; the server actions in
 * src/app/app/[orgSlug]/tasks/projects-actions.ts call these, and the UI
 * uses the same functions to decide what to offer).
 *
 * - Create and edit (name, colour, lead, status, dates): every member while
 *   the club's `memberCanCreateProjects` is on (the default), otherwise
 *   owners and admins. A project's lead can always edit their own project.
 * - Archive and unarchive: owners, admins and the project's lead.
 * - Delete: owners and admins (the Project DELETE policy is OWNER/ADMIN).
 */

export interface ProjectActor {
  userId: string;
  /** OWNER or ADMIN (tasks.manageAll). */
  isAdmin: boolean;
  /** OrgSettings.memberCanCreateProjects (true when the club has no settings row). */
  membersCanCreate: boolean;
}

export interface ProjectSubject {
  leadId: string | null;
}

export const PROJECT_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "DONE", label: "Done" },
] as const;

export type ProjectStatusValue = (typeof PROJECT_STATUSES)[number]["value"];

export function projectStatusLabel(status: string): string {
  return PROJECT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function canCreateProject(actor: ProjectActor): boolean {
  return actor.isAdmin || actor.membersCanCreate;
}

export function canEditProject(actor: ProjectActor, project: ProjectSubject): boolean {
  return canCreateProject(actor) || (project.leadId !== null && project.leadId === actor.userId);
}

export function canArchiveProject(actor: ProjectActor, project: ProjectSubject): boolean {
  return actor.isAdmin || (project.leadId !== null && project.leadId === actor.userId);
}

export function canDeleteProject(actor: ProjectActor): boolean {
  return actor.isAdmin;
}

export const PROJECT_CREATE_DENIED = "Only an owner or admin can create projects in this club.";
export const PROJECT_EDIT_DENIED = "Only an owner, an admin or the project's lead can change it.";
export const PROJECT_ARCHIVE_DENIED =
  "Only an owner, an admin or the project's lead can archive it.";
export const PROJECT_DELETE_DENIED = "Only an owner or admin can delete a project.";

/**
 * What a viewer may make on the spot in Tasks (TasksProvider's `can`): the
 * club's two creation switches, which owners and admins always pass.
 */
export function creationRights(
  isAdmin: boolean,
  settings: { memberCanCreateProjects?: boolean; memberCanCreateTags?: boolean } | null | undefined,
): { createProjects: boolean; createTags: boolean } {
  return {
    createProjects: isAdmin || (settings?.memberCanCreateProjects ?? true),
    createTags: isAdmin || (settings?.memberCanCreateTags ?? true),
  };
}
