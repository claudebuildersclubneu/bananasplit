import { describe, expect, it } from "vitest";

import { settingsNavItems, isSettingsItemActive } from "@/app/app/[orgSlug]/settings/settings-nav";

import { resolveSidebar, toConfig, visibleSidebar } from "@/lib/nav/sidebar";

import { isLinkActive, navSections } from "./nav-config";

const links = (raw: unknown = null) =>
  navSections("cbc", visibleSidebar(raw)).flatMap((s) => s.items);
const item = (label: string, all = links()) => all.find((i) => i.label === label)!;
const active = (label: string, path: string) => isLinkActive(item(label), path, links());

describe("sidebar navigation", () => {
  it("lists every section in order by default, grouped", () => {
    expect(links().map((i) => i.label)).toEqual([
      "Overview",
      "Tasks",
      "Calendar",
      "Files",
      "People",
      "Polls",
      "Databases",
      "Finance",
    ]);
    expect(navSections("cbc", visibleSidebar(null)).map((s) => s.label)).toEqual([
      null,
      "Club",
      "Data",
    ]);
    expect(item("Files").href).toBe("/app/cbc/notes");
  });

  it("keeps People active on the org chart, which is part of it now", () => {
    expect(active("People", "/app/cbc/org-chart")).toBe(true);
    expect(active("People", "/app/cbc/org-chart/versions/v1")).toBe(true);
    expect(active("People", "/app/cbc/people/u1")).toBe(true);
    expect(active("Polls", "/app/cbc/org-chart")).toBe(false);
  });

  it("reads saved sidebars that still list the retired Org Chart section", () => {
    const saved = {
      groups: [{ id: "club", label: "Club" }],
      items: [
        { id: "people", group: "club", hidden: false, label: "Members" },
        { id: "org-chart", group: "club", hidden: true, label: null },
      ],
    };
    const labels = links(saved).map((i) => i.label);
    expect(labels).toContain("Members");
    expect(labels).not.toContain("Org Chart");
  });

  it("marks a section active on its sub-pages (prefix match), Overview only on itself", () => {
    expect(active("Tasks", "/app/cbc/tasks/abc")).toBe(true);
    expect(active("Overview", "/app/cbc")).toBe(true);
    expect(active("Overview", "/app/cbc/tasks")).toBe(false);
    expect(active("Files", "/app/cbc/notesy")).toBe(false);
  });

  it("marks only the most specific section active when sections nest", () => {
    expect(active("Polls", "/app/cbc/calendar/polls/abc")).toBe(true);
    expect(active("Calendar", "/app/cbc/calendar/polls/abc")).toBe(false);
    expect(active("Calendar", "/app/cbc/calendar/sync")).toBe(true);
    expect(active("Polls", "/app/cbc/calendar")).toBe(false);
  });

  it("follows the org's sidebar: hidden, renamed, moved and reordered sections", () => {
    const groups = resolveSidebar(null);
    const club = groups.find((g) => g.id === "club")!;
    const polls = club.items.find((i) => i.id === "polls")!;
    polls.hidden = true;
    const people = club.items.find((i) => i.id === "people")!;
    people.label = "Members";
    // Move Finance to the top group, first after Overview.
    const data = groups.find((g) => g.id === "data")!;
    const finance = data.items.splice(
      data.items.findIndex((i) => i.id === "finance"),
      1,
    )[0];
    groups[0].items.splice(1, 0, finance);
    groups[2].label = "Records";
    const config = toConfig(groups);
    const labels = links(config).map((i) => i.label);
    expect(labels).not.toContain("Polls");
    expect(labels.slice(0, 3)).toEqual(["Overview", "Finance", "Tasks"]);
    expect(labels).toContain("Members");
    expect(navSections("cbc", visibleSidebar(config)).map((s) => s.label)).toEqual([
      null,
      "Club",
      "Records",
    ]);
    // Overview can't be hidden, whatever is saved.
    const tampered = {
      ...config,
      items: config.items.map((i) => (i.id === "overview" ? { ...i, hidden: true } : i)),
    };
    expect(links(tampered)[0].label).toBe("Overview");
  });
});

describe("Admin panel navigation", () => {
  const labels = (role: Parameters<typeof settingsNavItems>[1]) =>
    settingsNavItems("cbc", role).map((i) => i.label);

  it("shows each role the sections it may use", () => {
    expect(labels("OWNER")).toEqual([
      "General",
      "Sidebar",
      "Theme",
      "Labels",
      "Members",
      "Privacy",
      "Integrations",
      "Audit log",
      "Danger zone",
    ]);
    expect(labels("ADMIN")).not.toContain("Danger zone");
    expect(labels("ADMIN")).toContain("Audit log");
    expect(labels("MEMBER")).toEqual(["Members"]);
    expect(labels("TREASURER")).toEqual(["Members"]);
  });

  it("keeps Members active on the invitations page", () => {
    const members = settingsNavItems("cbc", "OWNER").find((i) => i.label === "Members")!;
    expect(isSettingsItemActive(members, "/app/cbc/settings/invitations")).toBe(true);
    expect(isSettingsItemActive(members, "/app/cbc/settings/members")).toBe(true);
    expect(isSettingsItemActive(members, "/app/cbc/settings/labels")).toBe(false);
  });
});
