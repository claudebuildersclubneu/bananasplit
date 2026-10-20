import { describe, expect, it } from "vitest";

import { chartTeams, LEADERSHIP_TEAM, teamNameFromTitle, type TeamPositionInput } from "./teams";

let n = 0;
function pos(id: string, title: string, reportsToId: string | null, extra: Partial<TeamPositionInput> = {}): TeamPositionInput {
  n += 1;
  return { id, title, reportsToId, isAdvisor: false, rank: `a${String(n).padStart(3, "0")}`, userId: null, ...extra };
}

describe("teamNameFromTitle", () => {
  it.each([
    ["VP Ops & Programs", "Ops & Programs"],
    ["VP Growth", "Growth"],
    ["Vice President, Marketing", "Marketing"],
    ["Head of Tech", "Tech"],
    ["Director of Events", "Events"],
    ["Build lead", "Build"],
    ["Sponsorship chair", "Sponsorship"],
    ["Senior VP of finance", "Finance"],
    ["Treasurer", "Treasurer"],
    ["President", "President"],
    ["  VP   Events ", "Events"],
    ["Lead", "Lead"],
    ["", "Team"],
  ])("%s -> %s", (title, team) => {
    expect(teamNameFromTitle(title)).toBe(team);
  });
});

describe("chartTeams", () => {
  // The CBC chart: President with an advisor, two VPs who lead people, and a lone Head of Finance.
  const cbc = [
    pos("social", "Head of Social & Membership", "growth", { userId: "kristine" }),
    pos("programs", "Head of Programs", "ops", { userId: "alex" }),
    pos("president", "President", null, { userId: "jackson" }),
    pos("advisor", "Founder & Advisor", "president", { userId: "mehr", isAdvisor: true }),
    pos("ops", "VP Ops & Programs", "president", { userId: "oliver" }),
    pos("designer", "Graphic Designer", "growth"),
    pos("tech", "Head of Tech", "ops", { userId: "smyan" }),
    pos("growth", "VP Growth", "president", { userId: "lucas" }),
    pos("finance", "Head of Finance", "president", { userId: "anthony" }),
  ];

  it("makes Leadership plus one team per lead under the top position, in chart order", () => {
    const { teams, teamOfUser } = chartTeams(cbc);
    expect(teams.map((t) => [t.name, t.slot])).toEqual([
      [LEADERSHIP_TEAM, 1],
      ["Ops & Programs", 2],
      ["Growth", 3],
    ]);
    const name = (user: string) => teams.find((t) => t.key === teamOfUser.get(user))?.name;
    expect(name("jackson")).toBe(LEADERSHIP_TEAM);
    expect(name("mehr")).toBe(LEADERSHIP_TEAM);
    expect(name("anthony")).toBe(LEADERSHIP_TEAM);
    expect(name("oliver")).toBe("Ops & Programs");
    expect(name("smyan")).toBe("Ops & Programs");
    expect(name("kristine")).toBe("Growth");
    expect(teams.find((t) => t.name === "Growth")?.positionIds).toContain("designer");
  });

  it("puts a member in two positions on the team of the higher one", () => {
    const chart = [...cbc, pos("ops-2", "Ops helper", "programs", { userId: "lucas" })];
    const { teams, teamOfUser } = chartTeams(chart);
    expect(teams.find((t) => t.key === teamOfUser.get("lucas"))?.name).toBe("Growth");
  });

  it("with several top positions, each one that leads people is a team", () => {
    const chart = [
      pos("a", "Head of Events", null),
      pos("a1", "Volunteer", "a", { userId: "u1" }),
      pos("b", "Treasurer", null, { userId: "u2" }),
      pos("c", "Build lead", null, { userId: "u3" }),
      pos("c1", "Builder", "c", { userId: "u4" }),
    ];
    const { teams, teamOfUser } = chartTeams(chart);
    expect(teams.map((t) => t.name)).toEqual([LEADERSHIP_TEAM, "Events", "Build"]);
    expect(teamOfUser.get("u2")).toBe("leadership");
    expect(teamOfUser.get("u4")).toBe("c");
  });

  it("handles an empty chart, a lone position, loops and dangling managers", () => {
    expect(chartTeams([]).teams).toEqual([]);
    expect(chartTeams([pos("solo", "President", null, { userId: "u" })]).teams.map((t) => t.name)).toEqual([LEADERSHIP_TEAM]);
    const loop = chartTeams([pos("x", "VP X", "y", { userId: "ux" }), pos("y", "VP Y", "x", { userId: "uy" })]);
    expect(loop.teamOfUser.size).toBe(2);
    const dangling = chartTeams([pos("d", "Lost", "missing", { userId: "ud" })]);
    expect(dangling.teamOfUser.get("ud")).toBe("leadership");
  });

  it("colour slots wrap after five teams", () => {
    const chart = [pos("root", "President", null)];
    for (let i = 0; i < 6; i++) {
      chart.push(pos(`lead${i}`, `VP ${i}`, "root"));
      chart.push(pos(`m${i}`, "Member", `lead${i}`));
    }
    expect(chartTeams(chart).teams.map((t) => t.slot)).toEqual([1, 2, 3, 4, 5, 1, 2]);
  });
});
