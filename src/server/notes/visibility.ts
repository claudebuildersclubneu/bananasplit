import { Prisma } from "@/generated/prisma/client";

/**
 * The notes a member may see, as a query filter: club notes, their own, and
 * the ones shared with them (src/lib/notes/access.ts). RLS on "Note" already
 * hides the rest; every list and search still says it, so the planner can
 * use the indexes and a mistake in one layer isn't a leak.
 */
export function noteVisibleWhere(userId: string): Prisma.NoteWhereInput {
  return {
    OR: [{ visibility: "ORGANIZATION" }, { authorId: userId }, { shares: { some: { userId } } }],
  };
}

/**
 * The same, for raw SQL over "Note", aliased `n` or not aliased at all. Two
 * written-out fragments rather than a spliced alias: every value is bound.
 */
export function noteVisibleSql(alias: "n" | "Note", userId: string): Prisma.Sql {
  return alias === "n"
    ? Prisma.sql`(n."visibility" = 'ORGANIZATION'
        OR n."authorId" = ${userId}
        OR EXISTS (SELECT 1 FROM "NoteShare" s WHERE s."noteId" = n."id" AND s."userId" = ${userId}))`
    : Prisma.sql`("Note"."visibility" = 'ORGANIZATION'
        OR "Note"."authorId" = ${userId}
        OR EXISTS (SELECT 1 FROM "NoteShare" s WHERE s."noteId" = "Note"."id" AND s."userId" = ${userId}))`;
}
