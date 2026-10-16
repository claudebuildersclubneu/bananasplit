-- Each club picks the day its weekly update is due (0 Sunday … 6 Saturday).
-- An update covers the seven days ending on that day, so Sunday, the
-- default, keeps the Monday-to-Sunday weeks every existing update was
-- written for.
ALTER TABLE "OrgSettings" ADD COLUMN "weeklyUpdateDay" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OrgSettings" ADD CONSTRAINT "OrgSettings_weeklyUpdateDay_check"
  CHECK ("weeklyUpdateDay" BETWEEN 0 AND 6);

-- Requests (the intake queue) is retired: its projects become plain projects
-- and keep their tasks. triageUserId and defaultDueInDays are left as they
-- were, so a project can be turned back by hand if that's ever wanted.
UPDATE "Project" SET "isIntake" = false WHERE "isIntake" = true;
