import { describe, expect, it } from "vitest";

import {
  canArchiveProject,
  canCreateProject,
  canDeleteProject,
  canEditProject,
  creationRights,
} from "./projects";

const member = (membersCanCreate: boolean) => ({
  userId: "u1",
  isAdmin: false,
  membersCanCreate,
});
const admin = { userId: "a1", isAdmin: true, membersCanCreate: false };

describe("project rules", () => {
  it("create and edit follow the club's switch; a lead always edits their own", () => {
    expect(canCreateProject(member(true))).toBe(true);
    expect(canCreateProject(member(false))).toBe(false);
    expect(canCreateProject(admin)).toBe(true);
    expect(canEditProject(member(false), { leadId: "u1" })).toBe(true);
    expect(canEditProject(member(false), { leadId: "u2" })).toBe(false);
    expect(canEditProject(member(false), { leadId: null })).toBe(false);
  });

  it("archive is for admins and the lead, whatever the switch says", () => {
    expect(canArchiveProject(member(true), { leadId: null })).toBe(false);
    expect(canArchiveProject(member(true), { leadId: "u1" })).toBe(true);
    expect(canArchiveProject(admin, { leadId: "u2" })).toBe(true);
  });

  it("delete is for admins", () => {
    expect(canDeleteProject(member(true))).toBe(false);
    expect(canDeleteProject(admin)).toBe(true);
  });

  it("creationRights defaults to everyone when the club has no settings row", () => {
    expect(creationRights(false, null)).toEqual({ createProjects: true, createTags: true });
    expect(
      creationRights(false, { memberCanCreateProjects: false, memberCanCreateTags: false }),
    ).toEqual({ createProjects: false, createTags: false });
    expect(
      creationRights(true, { memberCanCreateProjects: false, memberCanCreateTags: false }),
    ).toEqual({ createProjects: true, createTags: true });
  });
});
