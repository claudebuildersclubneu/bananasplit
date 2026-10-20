-- Everyone gets the new Overview: Up next first, then the rest laid out in
-- full rows (src/lib/overview/widgets.ts DEFAULT_LAYOUT). Saved boards were
-- the old order, so they go back to the default; anyone can customize
-- again from there.
UPDATE "MemberPrefs" SET "overviewWidgets" = NULL WHERE "overviewWidgets" IS NOT NULL;

-- Settings › Tags is gone, and with it the switch that kept new tags to
-- owners and admins: anyone makes a tag while adding a task. Clubs that had
-- turned it off would have no way back, so it is on everywhere (the Label
-- INSERT policy still reads it).
UPDATE "OrgSettings" SET "memberCanCreateTags" = true WHERE NOT "memberCanCreateTags";
