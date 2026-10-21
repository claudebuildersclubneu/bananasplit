-- Org chart teams, named instead of derived (src/lib/org-chart/teams.ts):
-- each chart version keeps its list of teams, and each position may say
-- which one it's on. A direct report of the president on the Finance team
-- is on Finance, not pulled into Leadership. Both tables' existing
-- table-level grants and org policies cover the new columns.
ALTER TABLE "OrgChartVersion" ADD COLUMN "teams" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "OrgChartPosition" ADD COLUMN "teamId" TEXT;
ALTER TABLE "OrgChartPosition" ADD CONSTRAINT "OrgChartPosition_teamId_length"
  CHECK ("teamId" IS NULL OR char_length("teamId") BETWEEN 1 AND 40);
