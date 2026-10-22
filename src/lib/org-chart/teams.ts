import { effectiveParents } from "./layout";

/**
 * Teams on the org chart. Pure and client-safe.
 *
 * Named teams (the usual way now): the chart keeps its own list of teams
 * (OrgChartVersion.teams) and each position may say which one it's on
 * (OrgChartPosition.teamId). A position with no team of its own is on its
 * manager's team, and so on up; positions with no team anywhere above
 * them (the president, say) are "Leadership". So the head of finance who
 * reports to the president is on Finance when Finance is their team, not
 * pulled into Leadership for reporting to the top.
 *
 * Until a chart names any team, they are derived from its shape: the
 * chart's top-level branches.
 *
 * - One top position (the usual chart): every report of it that leads
 *   someone starts a team with its whole branch ("VP Growth" leads
 *   "Growth"). The top position, its advisors and its reports who lead
 *   nobody form "Leadership".
 * - Several top positions: each one with its branch is a team; top
 *   positions that lead nobody share "Leadership".
 *
 * A member holding several positions belongs to the team of the highest
 * one (fewest managers above, then rank), as titlesFor picks titles.
 * Teams are numbered in chart order and take the chart colour slots
 * 1..5 in that order (slot = var(--chart-N)).
 */

export const LEADERSHIP_TEAM = "Leadership";
export const NO_TEAM = "Not on the chart";

export interface TeamPositionInput {
  id: string;
  /** The named team this position is on (OrgChartPosition.teamId). */
  teamId?: string | null;
  reportsToId: string | null;
  isAdvisor: boolean;
  rank: string;
  title: string;
  userId: string | null;
}

export interface ChartTeam {
  /** Stable within a version: the lead position's id, or "leadership". */
  key: string;
  name: string;
  /** 1..5: the chart colour slot (var(--chart-{slot})). */
  slot: number;
  /** The position that heads the team (null for a shared Leadership). */
  leadId: string | null;
  positionIds: string[];
}

export interface ChartTeams {
  teams: ChartTeam[];
  /** Position id -> team key. */
  teamOfPosition: Map<string, string>;
  /** Member id -> team key (their highest position's team). */
  teamOfUser: Map<string, string>;
}

const LEAD_PREFIX =
  /^(?:(?:senior|sr\.?|executive|exec\.?|co-?)\s+)*(?:vice[\s-]+president|vice[\s-]+chair|svp|evp|vp|head|director|dir\.?|chair(?:person)?|lead|manager|captain|coordinator|officer)\b\s*(?:of|for|,|:|-|–|—)?\s*/i;
const LEAD_SUFFIX = /\s+(?:lead|leader|chair|chairperson|head|director|manager|captain|coordinator|team)$/i;

/** "VP Ops & Programs" -> "Ops & Programs", "Build lead" -> "Build", "Head of Tech" -> "Tech". */
export function teamNameFromTitle(title: string): string {
  const clean = title.replace(/\s+/g, " ").trim();
  if (!clean) return "Team";
  const stripped = clean.replace(LEAD_PREFIX, "").replace(LEAD_SUFFIX, "").trim();
  if (!stripped) return clean;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function byRank(a: TeamPositionInput, b: TeamPositionInput): number {
  if (a.rank !== b.rank) return a.rank < b.rank ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** A team the chart names (OrgChartVersion.teams). */
export interface NamedTeam {
  id: string;
  name: string;
}

export function chartTeams(positions: readonly TeamPositionInput[], named: readonly NamedTeam[] = []): ChartTeams {
  const known = new Set(named.map((t) => t.id));
  const derived = derivedTeams(positions);
  if (positions.some((p) => p.teamId && known.has(p.teamId))) return namedTeams(positions, named, derived);
  return derived;
}

/** Teams from the chart's shape alone: its top-level branches. */
function derivedTeams(positions: readonly TeamPositionInput[]): ChartTeams {
  const sorted = [...positions].sort(byRank);
  const parents = effectiveParents(sorted);
  const children = new Map<string, TeamPositionInput[]>();
  for (const p of sorted) {
    const parent = parents.get(p.id);
    if (parent) children.set(parent, [...(children.get(parent) ?? []), p]);
  }
  const leadsSomeone = (id: string) => (children.get(id) ?? []).some((c) => !c.isAdvisor);
  const subtree = (id: string): string[] => {
    const out: string[] = [];
    const stack = [id];
    const seen = new Set<string>();
    while (stack.length) {
      const cur = stack.pop() as string;
      if (seen.has(cur)) continue;
      seen.add(cur);
      out.push(cur);
      for (const c of [...(children.get(cur) ?? [])].reverse()) stack.push(c.id);
    }
    return out;
  };

  const roots = sorted.filter((p) => !parents.get(p.id));
  const mainRoots = roots.filter((p) => !p.isAdvisor);
  const draft: Omit<ChartTeam, "slot">[] = [];
  const leadership: string[] = [];

  if (mainRoots.length === 1) {
    const root = mainRoots[0];
    leadership.push(root.id);
    for (const child of children.get(root.id) ?? []) {
      if (!child.isAdvisor && leadsSomeone(child.id)) {
        draft.push({ key: child.id, name: teamNameFromTitle(child.title), leadId: child.id, positionIds: subtree(child.id) });
      } else {
        leadership.push(...subtree(child.id));
      }
    }
  } else {
    for (const root of mainRoots) {
      if (leadsSomeone(root.id)) {
        draft.push({ key: root.id, name: teamNameFromTitle(root.title), leadId: root.id, positionIds: subtree(root.id) });
      } else {
        leadership.push(...subtree(root.id));
      }
    }
  }
  // Top-level advisors (no manager): with the leadership.
  for (const r of roots) if (r.isAdvisor) leadership.push(...subtree(r.id));

  const ordered: Omit<ChartTeam, "slot">[] = [
    ...(leadership.length
      ? [{ key: "leadership", name: LEADERSHIP_TEAM, leadId: mainRoots.length === 1 ? mainRoots[0].id : null, positionIds: leadership }]
      : []),
    ...draft,
  ];
  const teams: ChartTeam[] = ordered.map((t, i) => ({ ...t, slot: (i % 5) + 1 }));

  const teamOfPosition = new Map<string, string>();
  for (const t of teams) for (const id of t.positionIds) if (!teamOfPosition.has(id)) teamOfPosition.set(id, t.key);

  const depth = (id: string) => {
    let d = 0;
    const seen = new Set<string>();
    let cur = parents.get(id) ?? null;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      d++;
      cur = parents.get(cur) ?? null;
    }
    return d;
  };
  const best = new Map<string, { team: string; depth: number; rank: string }>();
  for (const p of sorted) {
    if (!p.userId) continue;
    const team = teamOfPosition.get(p.id);
    if (!team) continue;
    const d = depth(p.id);
    const cur = best.get(p.userId);
    if (!cur || d < cur.depth || (d === cur.depth && p.rank < cur.rank)) best.set(p.userId, { team, depth: d, rank: p.rank });
  }
  return { teams, teamOfPosition, teamOfUser: new Map([...best].map(([u, v]) => [u, v.team])) };
}

/**
 * Teams the chart names: each position's own team, else its manager's. A
 * branch with no named team anywhere above it keeps the team its shape
 * gives it (derivedTeams), so naming Finance doesn't fold Growth into
 * Leadership.
 */
function namedTeams(
  positions: readonly TeamPositionInput[],
  named: readonly NamedTeam[],
  derived: ChartTeams,
): ChartTeams {
  const sorted = [...positions].sort(byRank);
  const parents = effectiveParents(sorted);
  const byId = new Map(sorted.map((p) => [p.id, p]));
  const known = new Set(named.map((t) => t.id));
  const LEAD = "leadership";

  const depthOf = new Map<string, number>();
  const depth = (id: string) => {
    const cached = depthOf.get(id);
    if (cached !== undefined) return cached;
    let d = 0;
    const seen = new Set<string>();
    let cur = parents.get(id) ?? null;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      d++;
      cur = parents.get(cur) ?? null;
    }
    depthOf.set(id, d);
    return d;
  };

  const teamOfPosition = new Map<string, string>();
  for (const p of sorted) {
    let team: string | null = null;
    const seen = new Set<string>();
    let cur: TeamPositionInput | undefined = p;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      if (cur.teamId && known.has(cur.teamId)) {
        team = cur.teamId;
        break;
      }
      const parent = parents.get(cur.id);
      cur = parent ? byId.get(parent) : undefined;
    }
    teamOfPosition.set(p.id, team ?? derived.teamOfPosition.get(p.id) ?? LEAD);
  }

  const on = (key: string) => sorted.filter((p) => teamOfPosition.get(p.id) === key);
  const leadOf = (list: TeamPositionInput[]) =>
    list.length === 0 ? null : [...list].sort((a, b) => depth(a.id) - depth(b.id) || byRank(a, b))[0].id;
  const ordered: Omit<ChartTeam, "slot">[] = [];
  // Leadership and the shape's teams that still have someone, then the named ones.
  for (const t of derived.teams) {
    const list = on(t.key);
    if (list.length > 0) ordered.push({ key: t.key, name: t.name, leadId: leadOf(list), positionIds: list.map((p) => p.id) });
  }
  for (const t of named) {
    const list = on(t.id);
    if (list.length > 0) ordered.push({ key: t.id, name: t.name, leadId: leadOf(list), positionIds: list.map((p) => p.id) });
  }
  const teams: ChartTeam[] = ordered.map((t, i) => ({ ...t, slot: (i % 5) + 1 }));

  const best = new Map<string, { team: string; depth: number; rank: string }>();
  for (const p of sorted) {
    if (!p.userId) continue;
    const team = teamOfPosition.get(p.id) as string;
    const d = depth(p.id);
    const cur = best.get(p.userId);
    if (!cur || d < cur.depth || (d === cur.depth && p.rank < cur.rank)) best.set(p.userId, { team, depth: d, rank: p.rank });
  }
  return { teams, teamOfPosition, teamOfUser: new Map([...best].map(([u, v]) => [u, v.team])) };
}

/** A version's stored teams (OrgChartVersion.teams, JSON), cleaned. */
export function parseNamedTeams(value: unknown): NamedTeam[] {
  if (!Array.isArray(value)) return [];
  const out: NamedTeam[] = [];
  const seen = new Set<string>();
  for (const t of value) {
    if (!t || typeof t !== "object") continue;
    const { id, name } = t as { id?: unknown; name?: unknown };
    if (typeof id !== "string" || typeof name !== "string" || !id || !name.trim() || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: name.trim() });
  }
  return out;
}
