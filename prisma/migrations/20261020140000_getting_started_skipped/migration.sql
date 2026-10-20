-- "Get your club started" on the Overview: the steps a club checked off
-- as not needed (src/lib/overview/getting-started.ts). Progress itself is
-- derived from what the club has; only these choices are stored. Owners
-- and admins write it through the table's existing UPDATE policy.
ALTER TABLE "OrgSettings" ADD COLUMN "startedSkipped" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
