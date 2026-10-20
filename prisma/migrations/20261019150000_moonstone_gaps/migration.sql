-- Moonstone's five database gaps.
--
--   Task          + startDate (a calendar date, NULL when unset): where an
--                   epic's or a story's bar starts on the Roadmap. Without
--                   one the Roadmap keeps its rule (made, or its earliest
--                   dated work).
--   Label         tag names are unique per org ignoring case: a unique
--                 index on ("organizationId", lower("name")). Existing
--                 duplicates are merged into the oldest first (their tasks
--                 move to it).
--   Project       a project's lead may delete it (OWNER/ADMIN still may).
--                 Since that makes the lead a privilege, app_user may change
--                 who leads an existing project only as an OWNER/ADMIN or as
--                 its current lead (handing it over, or clearing it when
--                 leaving): app.project_lead_guard. Whoever creates a
--                 project still picks its first lead.
--   Note          + headerText, footerText (at most 200 characters each,
--                 NULL for the default): Document mode's header and footer
--                 bands, on the paper view and in the PDF.
--   app.member_availability_shared(user)
--                 whether a member has shared their availability at all
--                 (they saved it once), under app.member_busy_hours's rule
--                 for who may ask (NULL otherwise), so the people
--                 directory's "Free now" skips members who never filled it
--                 in.

-- ---- Task.startDate ----------------------------------------------------------
-- AlterTable
ALTER TABLE "Task" ADD COLUMN "startDate" DATE;

-- ---- Label: unique names, ignoring case ------------------------------------
-- Merge duplicates first: the lowest id (cuids grow with time) keeps the
-- name, every task tagged with a duplicate is tagged with it, and the
-- duplicates go (their TaskLabel rows cascade).
CREATE TEMPORARY TABLE label_dupes AS
SELECT l."id", l."organizationId", k."id" AS keep
  FROM "Label" l
  JOIN LATERAL (
    SELECT k."id" FROM "Label" k
     WHERE k."organizationId" = l."organizationId" AND lower(k."name") = lower(l."name")
     ORDER BY k."id" LIMIT 1
  ) k ON k."id" <> l."id";

INSERT INTO "TaskLabel" ("organizationId", "taskId", "labelId")
SELECT tl."organizationId", tl."taskId", d.keep
  FROM "TaskLabel" tl JOIN label_dupes d ON d."id" = tl."labelId"
ON CONFLICT DO NOTHING;

DELETE FROM "Label" l USING label_dupes d WHERE l."id" = d."id";
DROP TABLE label_dupes;

-- Not in schema.prisma (Prisma has no expression indexes); createTag
-- (src/app/app/[orgSlug]/settings/labels/actions.ts) catches its 23505 and
-- reuses the tag that won.
CREATE UNIQUE INDEX "Label_organizationId_lower_name_key" ON "Label" ("organizationId", lower("name"));

-- ---- Project: the lead deletes ---------------------------------------------
DROP POLICY app_user_delete ON "Project";
CREATE POLICY app_user_delete ON "Project" FOR DELETE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id())
         AND ((SELECT app.is_org_admin()) OR "leadId" = (SELECT app.user_id())));

-- Who leads an existing project changes only by an OWNER/ADMIN or its
-- current lead, on the member path, so nobody makes themselves lead to
-- delete a project. The service path is not limited.
-- SECURITY INVOKER: it reads nothing but the row.
CREATE OR REPLACE FUNCTION app.project_lead_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF current_user <> 'app_user' OR NEW."leadId" IS NOT DISTINCT FROM OLD."leadId" THEN
    RETURN NEW;
  END IF;
  IF app.is_org_admin() OR OLD."leadId" = app.user_id() THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Project: only an owner, an admin or the lead changes who leads it' USING ERRCODE = '42501';
END $$;
REVOKE ALL ON FUNCTION app.project_lead_guard() FROM PUBLIC;
CREATE TRIGGER project_lead_guard BEFORE UPDATE OF "leadId" ON "Project"
  FOR EACH ROW EXECUTE FUNCTION app.project_lead_guard();

-- ---- Note: header and footer text ------------------------------------------
-- AlterTable
ALTER TABLE "Note" ADD COLUMN "headerText" TEXT,
ADD COLUMN "footerText" TEXT;

ALTER TABLE "Note" ADD CONSTRAINT "Note_headerText_check"
  CHECK ("headerText" IS NULL OR char_length("headerText") <= 200);
ALTER TABLE "Note" ADD CONSTRAINT "Note_footerText_check"
  CHECK ("footerText" IS NULL OR char_length("footerText") <= 200);

-- ---- Availability: shared at all? ------------------------------------------
-- A UserAvailability row exists once its owner saved their availability;
-- nobody else learns more than that. NULL when the caller may not see the
-- member's busy hours (app.member_busy_hours decides).
CREATE OR REPLACE FUNCTION app.member_availability_shared(p_user text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public."UserAvailability" a WHERE a."userId" = p_user)
   WHERE app.member_busy_hours(p_user) IS NOT NULL
$$;
REVOKE ALL ON FUNCTION app.member_availability_shared(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.member_availability_shared(text) TO app_user;
