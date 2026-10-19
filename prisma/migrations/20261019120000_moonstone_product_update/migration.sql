-- The Moonstone product update: the database layer for plans, storage,
-- the weekly pulse, project details, epics and stories, tags made inline,
-- nested pages, comments and versions on notes, and people search.
--
--   OrgPlan          + PERSONAL_PLUS. A Personal space is FREE or
--                    PERSONAL_PLUS and moves between the two; a club is
--                    never on either (app.organization_space_guard and the
--                    Organization_personal_plan check). Display names are
--                    the app's: FREE "Personal Free", PERSONAL_PLUS
--                    "Personal Plus", CLUB "Team", SOCIETY "Team Advanced".
--   Organization     + storageUsedBytes: OrgFile (trashed files count until
--                    they are deleted for good), Receipt and NoteVersion
--                    bytes, kept by app.storage_used_track and backfilled
--                    here. The app roles never write it: their UPDATE on
--                    Organization becomes a column grant without it, and
--                    app.organization_storage_guard refuses a non-zero value
--                    on INSERT (app_service creates orgs).
--   OrgSettings      + the weekly pulse (day 0-6 as weeklyUpdateDay, hour
--                    0-23, audience, email, in-app) and memberCanCreate-
--                    Projects / memberCanCreateTags, which the Project and
--                    Label INSERT policies read. OWNER/ADMIN write them, as
--                    every other setting.
--   Project          + color (#rrggbb), leadId (a member: assert_org_member;
--                    seeded from the retired triage owner where they are
--                    still a member), status, startDate, targetDate,
--                    updatedAt (from createdAt). The retired intake columns
--                    (isIntake, triageUserId, defaultDueInDays,
--                    triagePositionKey) are dropped.
--   Task             + type EPIC | STORY | TASK. An EPIC has no parent, a
--                    STORY's parent is an EPIC, a TASK's an EPIC or a STORY
--                    (app.task_hierarchy_guard). Every task that has
--                    subtasks today becomes a STORY.
--   Label            + createdById (who made a tag inline).
--   Note             + parentId (nested pages; composite foreign key in the
--                    org, never its own ancestor: app.note_cycle_guard, and a
--                    note app_user can see: app.note_parent_visible), icon,
--                    layout, paperSize.
--   NoteComment      new: comment threads on a note.
--   NoteVersion      new: autosave snapshots and named versions of a note.
--   PulseIssue       new: one week's pulse for a club.
--   NotificationType + WEEKLY_PULSE.
--   pg_trgm          trigram GIN indexes on "User"(name) and
--                    "Membership"(title) for people search.
--
-- Values added to an existing enum (OrgPlan, NotificationType) can't be
-- used in the transaction that adds them, so nothing below compares with
-- them except inside function bodies (planned when first called, after
-- commit) and the Organization_personal_plan check, which compares plan as
-- text.

-- pg_trgm is a trusted extension: the migration owner (not a superuser on
-- Supabase or in the RLS suite) may create it. Its objects are extension
-- members, which app.security_manifest() skips. In public, where the
-- runtime roles resolve gin_trgm_ops and similarity() by name; a database
-- that already has it elsewhere stops here, loudly, instead of creating
-- indexes the app's queries can't use.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
DO $$
BEGIN
  IF (SELECT e.extnamespace FROM pg_extension e WHERE e.extname = 'pg_trgm') <> 'public'::regnamespace THEN
    RAISE EXCEPTION 'pg_trgm is installed outside schema public; move it (ALTER EXTENSION pg_trgm SET SCHEMA public) and re-run';
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'DONE');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('EPIC', 'STORY', 'TASK');

-- CreateEnum
CREATE TYPE "PulseAudience" AS ENUM ('EVERYONE', 'OFFICERS');

-- CreateEnum
CREATE TYPE "NoteLayout" AS ENUM ('PAGE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "PaperSize" AS ENUM ('LETTER', 'A4');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'WEEKLY_PULSE';

-- AlterEnum (next to FREE: the Personal plans come first)
ALTER TYPE "OrgPlan" ADD VALUE 'PERSONAL_PLUS' AFTER 'FREE';

-- AlterTable
ALTER TABLE "Label" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "icon" TEXT,
ADD COLUMN     "layout" "NoteLayout" NOT NULL DEFAULT 'PAGE',
ADD COLUMN     "paperSize" "PaperSize" NOT NULL DEFAULT 'LETTER',
ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "OrgSettings" ADD COLUMN     "memberCanCreateProjects" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "memberCanCreateTags" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pulseAudience" "PulseAudience" NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN     "pulseDay" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "pulseEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pulseEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pulseHourLocal" INTEGER NOT NULL DEFAULT 17,
ADD COLUMN     "pulseInApp" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "storageUsedBytes" BIGINT NOT NULL DEFAULT 0;

-- AlterTable: the new Project columns first, so the lead can be carried
-- over from the triage owner before the intake columns go.
ALTER TABLE "Project" ADD COLUMN     "color" TEXT,
ADD COLUMN     "leadId" TEXT,
ADD COLUMN     "startDate" DATE,
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "targetDate" DATE,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Project" SET "updatedAt" = "createdAt";
-- The person who triaged a project's requests now leads it, while they are
-- still a member of its org (a lead must be one).
UPDATE "Project" p SET "leadId" = p."triageUserId"
 WHERE p."triageUserId" IS NOT NULL
   AND EXISTS (SELECT 1 FROM "Membership" m
                WHERE m."userId" = p."triageUserId" AND m."organizationId" = p."organizationId");

-- The member check named triageUserId; it names the lead now (below).
DROP TRIGGER org_member_refs ON "Project";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_triageUserId_fkey";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "defaultDueInDays",
DROP COLUMN "isIntake",
DROP COLUMN "triagePositionKey",
DROP COLUMN "triageUserId";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "type" "TaskType" NOT NULL DEFAULT 'TASK';

-- CreateTable
CREATE TABLE "PulseIssue" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "data" JSONB NOT NULL,
    "note" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PulseIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteComment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "authorId" TEXT,
    "threadId" TEXT,
    "body" TEXT NOT NULL,
    "anchorText" TEXT,
    "anchor" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteVersion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "name" TEXT,
    "createdById" TEXT,
    "contentJson" JSONB NOT NULL,
    "yjsState" BYTEA,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PulseIssue_organizationId_weekStart_key" ON "PulseIssue"("organizationId", "weekStart");

-- CreateIndex
CREATE INDEX "NoteComment_organizationId_noteId_createdAt_idx" ON "NoteComment"("organizationId", "noteId", "createdAt");

-- CreateIndex
CREATE INDEX "NoteComment_noteId_threadId_idx" ON "NoteComment"("noteId", "threadId");

-- CreateIndex
CREATE UNIQUE INDEX "NoteComment_noteId_id_key" ON "NoteComment"("noteId", "id");

-- CreateIndex
CREATE INDEX "NoteVersion_organizationId_noteId_createdAt_idx" ON "NoteVersion"("organizationId", "noteId", "createdAt");

-- CreateIndex
CREATE INDEX "Membership_title_idx" ON "Membership" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Note_organizationId_parentId_idx" ON "Note"("organizationId", "parentId");

-- CreateIndex
CREATE INDEX "User_name_idx" ON "User" USING GIN ("name" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseIssue" ADD CONSTRAINT "PulseIssue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey. Hand-edited: deleting the parent sets only "parentId" to
-- NULL (PostgreSQL 15+). A plain SET NULL would null organizationId too,
-- which is NOT NULL, and every parent delete would fail.
ALTER TABLE "Note" ADD CONSTRAINT "Note_organizationId_parentId_fkey" FOREIGN KEY ("organizationId", "parentId") REFERENCES "Note"("organizationId", "id") ON DELETE SET NULL ("parentId") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_organizationId_noteId_fkey" FOREIGN KEY ("organizationId", "noteId") REFERENCES "Note"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_noteId_threadId_fkey" FOREIGN KEY ("noteId", "threadId") REFERENCES "NoteComment"("noteId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteVersion" ADD CONSTRAINT "NoteVersion_organizationId_noteId_fkey" FOREIGN KEY ("organizationId", "noteId") REFERENCES "Note"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteVersion" ADD CONSTRAINT "NoteVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- ---------------------------------------------------------------------------
-- Hand-written: checks, data, helpers, triggers, RLS, grants and the
-- security manifest.
-- ---------------------------------------------------------------------------

-- ---- Checks ------------------------------------------------------------------
-- FREE and PERSONAL_PLUS are Personal's plans, and only Personal's. As text:
-- PERSONAL_PLUS can't be used as an OrgPlan until this transaction commits.
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_personal_plan";
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_personal_plan"
  CHECK (("kind" = 'PERSONAL') = ("plan"::text IN ('FREE', 'PERSONAL_PLUS')));
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_storageUsedBytes_check"
  CHECK ("storageUsedBytes" >= 0);

ALTER TABLE "OrgSettings" ADD CONSTRAINT "OrgSettings_pulseDay_check"
  CHECK ("pulseDay" BETWEEN 0 AND 6);
ALTER TABLE "OrgSettings" ADD CONSTRAINT "OrgSettings_pulseHourLocal_check"
  CHECK ("pulseHourLocal" BETWEEN 0 AND 23);

-- Strict #rrggbb, the app's HEX_RE (src/lib/theme/hex.ts).
ALTER TABLE "Project" ADD CONSTRAINT "Project_color_check"
  CHECK ("color" IS NULL OR "color" ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE "Note" ADD CONSTRAINT "Note_icon_check"
  CHECK ("icon" IS NULL OR char_length("icon") <= 32);

ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_body_check"
  CHECK (char_length("body") BETWEEN 1 AND 5000);
-- A reply names its thread's root, never itself; whoever resolved a thread
-- did so at some time (resolvedById goes NULL when their account does).
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_thread_check"
  CHECK ("threadId" IS NULL OR "threadId" <> "id");
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_resolved_check"
  CHECK ("resolvedById" IS NULL OR "resolvedAt" IS NOT NULL);

ALTER TABLE "PulseIssue" ADD CONSTRAINT "PulseIssue_note_check"
  CHECK ("note" IS NULL OR char_length("note") <= 1000);

-- Sizes feed Organization.storageUsedBytes: never negative.
ALTER TABLE "OrgFile" ADD CONSTRAINT "OrgFile_sizeBytes_check" CHECK ("sizeBytes" >= 0);
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_sizeBytes_check" CHECK ("sizeBytes" >= 0);
ALTER TABLE "NoteVersion" ADD CONSTRAINT "NoteVersion_sizeBytes_check" CHECK ("sizeBytes" >= 0);

-- ---- Task types: data --------------------------------------------------------
-- Every task with subtasks (live or trashed) becomes a STORY; its subtasks
-- stay TASKs. The app only ever nested one level, so that is the whole job.
UPDATE "Task" t SET "type" = 'STORY'
 WHERE EXISTS (SELECT 1 FROM "Task" c WHERE c."parentTaskId" = t."id");
-- A two-level chain (never made by the app, possible only by hand): its
-- top becomes the EPIC.
UPDATE "Task" t SET "type" = 'EPIC'
 WHERE t."parentTaskId" IS NULL
   AND EXISTS (SELECT 1 FROM "Task" c WHERE c."parentTaskId" = t."id" AND c."type" = 'STORY');
-- Anything still out of shape (a deeper chain) stops the migration rather
-- than being guessed at.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Task" c JOIN "Task" p ON p."id" = c."parentTaskId"
     WHERE NOT ((c."type" = 'STORY' AND p."type" = 'EPIC')
                OR (c."type" = 'TASK' AND p."type" IN ('EPIC', 'STORY')))
  ) THEN
    RAISE EXCEPTION 'Task: subtasks nested deeper than an epic, a story and a task; flatten them by hand first';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Plans: app.organization_space_guard, restated from
-- 20261013170000_personal_spaces_and_trials with the Personal plans.
--   INSERT, every role: a Personal space left at the column default (TRIAL)
--   takes FREE; a trial without an end ends in 30 days. (Unchanged.)
--   INSERT, app roles: a club starts on its trial, ending within 30 days
--   (unchanged); a Personal space starts on FREE (new: the check now admits
--   PERSONAL_PLUS, which is bought, not created).
--   UPDATE, app roles: kind, personalOwnerId and trialEndsAt never change
--   (unchanged). plan: a Personal space moves only between FREE and
--   PERSONAL_PLUS; a club never to TRIAL, FREE or PERSONAL_PLUS. OWNER-only
--   otherwise (app.organization_guard, unchanged).
-- SECURITY INVOKER: it reads nothing but the row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.organization_space_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."kind" = 'PERSONAL' AND NEW."plan" = 'TRIAL' THEN
      NEW."plan" := 'FREE';
      NEW."trialEndsAt" := NULL;
    END IF;
    IF NEW."plan" = 'TRIAL' AND NEW."trialEndsAt" IS NULL THEN
      NEW."trialEndsAt" := app.utc_now() + interval '30 days';
    END IF;
    IF current_user IN ('app_user', 'app_service') THEN
      IF NEW."kind" = 'CLUB' AND NEW."plan" <> 'TRIAL' THEN
        RAISE EXCEPTION 'a new club starts on its trial' USING ERRCODE = '42501';
      END IF;
      IF NEW."kind" = 'PERSONAL' AND NEW."plan" <> 'FREE' THEN
        RAISE EXCEPTION 'a new Personal space starts on Personal Free' USING ERRCODE = '42501';
      END IF;
      IF NEW."plan" = 'TRIAL' AND NEW."trialEndsAt" > app.utc_now() + interval '30 days 1 hour' THEN
        RAISE EXCEPTION 'a trial is 30 days' USING ERRCODE = '42501';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF current_user NOT IN ('app_user', 'app_service') THEN
    RETURN NEW;
  END IF;
  IF NEW."kind" IS DISTINCT FROM OLD."kind"
     OR NEW."personalOwnerId" IS DISTINCT FROM OLD."personalOwnerId" THEN
    RAISE EXCEPTION 'Organization.kind and personalOwnerId are immutable' USING ERRCODE = '42501';
  END IF;
  IF NEW."trialEndsAt" IS DISTINCT FROM OLD."trialEndsAt" THEN
    RAISE EXCEPTION 'Organization.trialEndsAt is immutable' USING ERRCODE = '42501';
  END IF;
  IF NEW."plan" IS DISTINCT FROM OLD."plan" THEN
    IF NEW."kind" = 'PERSONAL' THEN
      IF NEW."plan" NOT IN ('FREE', 'PERSONAL_PLUS') THEN
        RAISE EXCEPTION 'a Personal space moves between Personal Free and Personal Plus' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW."plan" IN ('TRIAL', 'FREE', 'PERSONAL_PLUS') THEN
      RAISE EXCEPTION 'a club moves to Team or Team Advanced' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.organization_space_guard() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Storage: Organization.storageUsedBytes.
-- ---------------------------------------------------------------------------

-- Adds a row's sizeBytes to its org on INSERT, takes it off on DELETE, and
-- moves the difference on UPDATE of sizeBytes or organizationId (a row that
-- changes org, as a note's versions do when the note does). OrgFile counts
-- until the row is deleted for good: trashing a file (deletedAt) changes
-- nothing. Never below zero.
-- SECURITY DEFINER: the writer (app_user uploading, app_service pruning
-- versions) has no UPDATE on the column; it is a trigger function, so
-- nothing can call it directly. When the org itself is being deleted, its
-- row is already gone and the UPDATE touches nothing.
CREATE OR REPLACE FUNCTION app.storage_used_track() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_old bigint := 0;
  v_new bigint := 0;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    v_old := coalesce(OLD."sizeBytes", 0);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new := coalesce(NEW."sizeBytes", 0);
  END IF;
  IF TG_OP = 'UPDATE' AND NEW."organizationId" = OLD."organizationId" THEN
    IF v_new <> v_old THEN
      UPDATE public."Organization"
         SET "storageUsedBytes" = greatest("storageUsedBytes" + (v_new - v_old), 0)
       WHERE "id" = NEW."organizationId";
    END IF;
    RETURN NULL;
  END IF;
  IF v_old <> 0 THEN
    UPDATE public."Organization"
       SET "storageUsedBytes" = greatest("storageUsedBytes" - v_old, 0)
     WHERE "id" = OLD."organizationId";
  END IF;
  IF v_new <> 0 THEN
    UPDATE public."Organization"
       SET "storageUsedBytes" = "storageUsedBytes" + v_new
     WHERE "id" = NEW."organizationId";
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION app.storage_used_track() FROM PUBLIC;

CREATE TRIGGER storage_used AFTER INSERT OR DELETE OR UPDATE OF "sizeBytes", "organizationId" ON "OrgFile"
  FOR EACH ROW EXECUTE FUNCTION app.storage_used_track();
CREATE TRIGGER storage_used AFTER INSERT OR DELETE OR UPDATE OF "sizeBytes", "organizationId" ON "Receipt"
  FOR EACH ROW EXECUTE FUNCTION app.storage_used_track();
-- A version's sizeBytes is set by its BEFORE trigger (below) when the body
-- changes, which a column list on sizeBytes alone wouldn't notice.
CREATE TRIGGER storage_used AFTER INSERT OR DELETE OR UPDATE OF "sizeBytes", "organizationId", "contentJson", "yjsState" ON "NoteVersion"
  FOR EACH ROW EXECUTE FUNCTION app.storage_used_track();

-- An uploaded file's size is what was uploaded: the app roles never change
-- it afterwards (the uploader and admins may rename, move and trash it).
CREATE TRIGGER immutable_size BEFORE UPDATE OF "sizeBytes" ON "OrgFile"
  FOR EACH ROW EXECUTE FUNCTION app.immutable_columns('sizeBytes');

-- A version's size is its bytes, counted here so no writer can claim
-- another number: the Yjs state plus the JSON body as text.
CREATE OR REPLACE FUNCTION app.note_version_size() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  NEW."sizeBytes" := coalesce(octet_length(NEW."yjsState"), 0) + octet_length(NEW."contentJson"::text);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.note_version_size() FROM PUBLIC;
CREATE TRIGGER note_version_size BEFORE INSERT OR UPDATE OF "contentJson", "yjsState", "sizeBytes" ON "NoteVersion"
  FOR EACH ROW EXECUTE FUNCTION app.note_version_size();

-- The app roles never set the counter: a new org starts at zero (the
-- service path creates orgs, with INSERT on every column), and nobody
-- changes it (there is no UPDATE grant on the column either; this is the
-- second lock). The definer trigger above runs as the owner, which this
-- lets through.
CREATE OR REPLACE FUNCTION app.organization_storage_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('app_user', 'app_service') THEN
    RETURN NEW;
  END IF;
  IF (TG_OP = 'INSERT' AND NEW."storageUsedBytes" <> 0)
     OR (TG_OP = 'UPDATE' AND NEW."storageUsedBytes" IS DISTINCT FROM OLD."storageUsedBytes") THEN
    RAISE EXCEPTION 'Organization.storageUsedBytes is kept by the database' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.organization_storage_guard() FROM PUBLIC;
CREATE TRIGGER organization_storage_guard BEFORE INSERT OR UPDATE OF "storageUsedBytes" ON "Organization"
  FOR EACH ROW EXECUTE FUNCTION app.organization_storage_guard();

-- Organization UPDATE for the app roles: every column but the counter. The
-- table-level grant would cover a new column automatically; this one
-- doesn't, so a column added later needs its own grant here.
REVOKE UPDATE ON "Organization" FROM app_user, app_service;
GRANT UPDATE ("id", "name", "slug", "timezone", "logo", "deletedAt", "deleteScheduledFor",
              "activeOrgChartVersionId", "kind", "personalOwnerId", "plan", "trialEndsAt", "createdAt")
  ON "Organization" TO app_user, app_service;

-- Backfill, after the triggers exist (the tables are locked by this
-- migration's ALTERs, so nothing lands in between).
UPDATE "Organization" o SET "storageUsedBytes" = s.total
  FROM (
    SELECT x."organizationId", sum(x.b)::bigint AS total
      FROM (SELECT f."organizationId", f."sizeBytes"::bigint AS b FROM "OrgFile" f
            UNION ALL
            SELECT r."organizationId", r."sizeBytes"::bigint FROM "Receipt" r
            UNION ALL
            SELECT v."organizationId", v."sizeBytes"::bigint FROM "NoteVersion" v) x
     GROUP BY x."organizationId"
  ) s
 WHERE s."organizationId" = o."id" AND o."storageUsedBytes" IS DISTINCT FROM s.total;

-- ---------------------------------------------------------------------------
-- Projects and tags: who creates them, and who leads.
-- ---------------------------------------------------------------------------

-- A project's lead is a member of its org (checked when it changes; a lead
-- who leaves is cleared by untieDepartingMember, as the triage owner was).
CREATE TRIGGER org_member_refs BEFORE INSERT OR UPDATE ON "Project"
  FOR EACH ROW EXECUTE FUNCTION app.assert_org_member('leadId');

-- OWNER/ADMIN create projects; every member does too while the org's
-- memberCanCreateProjects is on (OrgSettings is readable by members, so the
-- policy reads it as the caller). UPDATE stays every member's (the manifest
-- allowlist says why), DELETE OWNER/ADMIN's.
DROP POLICY app_user_insert ON "Project";
CREATE POLICY app_user_insert ON "Project" FOR INSERT TO app_user
  WITH CHECK ("organizationId" = (SELECT app.member_org_id())
              AND ((SELECT app.is_org_admin())
                   OR EXISTS (SELECT 1 FROM "OrgSettings" s
                               WHERE s."organizationId" = "Project"."organizationId"
                                 AND s."memberCanCreateProjects")));

-- Tags: OWNER/ADMIN create them as before (createdById themselves or
-- NULL); every member may create one inline while memberCanCreateTags is
-- on, recording themselves as createdById. Renaming and deleting stay
-- OWNER/ADMIN's. createdById never changes for the app roles.
DROP POLICY app_user_insert ON "Label";
CREATE POLICY app_user_insert ON "Label" FOR INSERT TO app_user
  WITH CHECK ("organizationId" = (SELECT app.member_org_id())
              AND (((SELECT app.is_org_admin())
                    AND ("createdById" IS NULL OR "createdById" = (SELECT app.user_id())))
                   OR ("createdById" = (SELECT app.user_id())
                       AND EXISTS (SELECT 1 FROM "OrgSettings" s
                                    WHERE s."organizationId" = "Label"."organizationId"
                                      AND s."memberCanCreateTags"))));
CREATE TRIGGER immutable_cols BEFORE UPDATE OF "createdById" ON "Label"
  FOR EACH ROW EXECUTE FUNCTION app.immutable_columns('createdById');

-- ---------------------------------------------------------------------------
-- Task hierarchy: app.task_hierarchy_guard.
--   EPIC   no parent
--   STORY  no parent, or an EPIC
--   TASK   no parent, an EPIC or a STORY
-- Checked after each INSERT or UPDATE of type or parentTaskId, every role:
-- the row against its parent, and, when its type changed, its children
-- against it (so a STORY with tasks can't become a TASK, nor an EPIC with
-- stories a STORY). Trashed rows count: restoring one never needs a check.
-- AFTER, so a statement that moves several rows is judged on where they
-- all end up. The parent is read FOR SHARE, which waits for (and then
-- sees) a concurrent change of its type, whose own children check in turn
-- sees this row once it commits.
-- SECURITY DEFINER: the parent or a child may be a private task the writer
-- can't read; the check must see it anyway (and says nothing about it). A
-- trigger function: nothing can call it directly.
-- Next to task_visibility_inherit, which keeps a subtask's visibility equal
-- to its parent's.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.task_hierarchy_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_parent "TaskType";
  v_ok boolean;
BEGIN
  IF NEW."parentTaskId" IS NOT NULL THEN
    IF NEW."parentTaskId" = NEW."id" THEN
      RAISE EXCEPTION 'Task: a task can''t be its own parent' USING ERRCODE = '23514';
    END IF;
    SELECT p."type" INTO v_parent FROM public."Task" p WHERE p."id" = NEW."parentTaskId" FOR SHARE;
    v_ok := CASE NEW."type"
              WHEN 'STORY' THEN v_parent = 'EPIC'
              WHEN 'TASK' THEN v_parent IN ('EPIC', 'STORY')
              ELSE false
            END;
    IF v_ok IS NOT TRUE THEN
      RAISE EXCEPTION 'Task: % can''t sit under %', lower(NEW."type"::text), coalesce(lower(v_parent::text), 'that parent')
        USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW."type" IS DISTINCT FROM OLD."type" THEN
    v_ok := NOT EXISTS (
      SELECT 1 FROM public."Task" c
       WHERE c."parentTaskId" = NEW."id"
         AND NOT (CASE c."type"
                    WHEN 'STORY' THEN NEW."type" = 'EPIC'
                    WHEN 'TASK' THEN NEW."type" IN ('EPIC', 'STORY')
                    ELSE false
                  END));
    IF NOT v_ok THEN
      RAISE EXCEPTION 'Task: its subtasks can''t sit under a %', lower(NEW."type"::text) USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION app.task_hierarchy_guard() FROM PUBLIC;
CREATE TRIGGER task_hierarchy_guard AFTER INSERT OR UPDATE OF "type", "parentTaskId" ON "Task"
  FOR EACH ROW EXECUTE FUNCTION app.task_hierarchy_guard();

-- ---------------------------------------------------------------------------
-- Notes: who may edit one, nested pages.
-- ---------------------------------------------------------------------------

-- Whether the caller may edit one note: the USING clause of the Note
-- UPDATE policy (20261014130000_note_sharing), for the NoteComment and
-- NoteVersion policies. Its author; an EDITOR share; on a club note, every
-- member when memberCanEdit, else owners and admins. Runs as the table
-- owner, like can_view_note, so those policies don't recurse into Note's;
-- answers only about app.user_id() in its member org.
CREATE OR REPLACE FUNCTION app.can_edit_note(p_note text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT coalesce((
    SELECT n."authorId" = app.user_id()
           OR (n."visibility" = 'ORGANIZATION' AND (n."memberCanEdit" OR app.is_org_admin()))
           OR app.note_share_role(n."id") = 'EDITOR'
      FROM public."Note" n
     WHERE n."id" = p_note AND n."organizationId" = app.member_org_id()
  ), false)
$$;
REVOKE ALL ON FUNCTION app.can_edit_note(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.can_edit_note(text) TO app_user;

-- Nested pages never loop: a note is never its own ancestor. Walks up from
-- the new parent (UNION stops on any loop already there). One re-parent at
-- a time per org (advisory lock), so two moves that each look fine can't
-- close a loop together; each statement in here takes a fresh snapshot
-- after the lock, so the second sees the first. Every role.
-- SECURITY DEFINER: an ancestor may be a note the writer can't see.
CREATE OR REPLACE FUNCTION app.note_cycle_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW."parentId" IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW."parentId" = NEW."id" THEN
    RAISE EXCEPTION 'Note: a page can''t sit inside itself' USING ERRCODE = '23514';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('note-tree:' || NEW."organizationId", 0));
  IF EXISTS (
    WITH RECURSIVE up (id) AS (
      SELECT NEW."parentId"
      UNION
      SELECT n."parentId" FROM public."Note" n JOIN up ON n."id" = up.id
       WHERE n."parentId" IS NOT NULL
    )
    SELECT 1 FROM up WHERE up.id = NEW."id"
  ) THEN
    RAISE EXCEPTION 'Note: a page can''t sit inside one of its own subpages' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.note_cycle_guard() FROM PUBLIC;
CREATE TRIGGER note_cycle_guard BEFORE INSERT OR UPDATE OF "parentId", "organizationId" ON "Note"
  FOR EACH ROW EXECUTE FUNCTION app.note_cycle_guard();

-- On the member path, a page goes only inside a note the caller can see
-- (it exists in the org either way: the composite foreign key). Who may
-- move the page itself is the Note UPDATE policy's call (normal edit
-- rights). The service path is not limited.
CREATE OR REPLACE FUNCTION app.note_parent_visible() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF current_user <> 'app_user' OR NEW."parentId" IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW."parentId" IS NOT DISTINCT FROM OLD."parentId" THEN
    RETURN NEW;
  END IF;
  IF NOT app.can_view_note(NEW."parentId") THEN
    RAISE EXCEPTION 'invalid reference: Note.parentId' USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.note_parent_visible() FROM PUBLIC;
CREATE TRIGGER note_parent_visible BEFORE INSERT OR UPDATE OF "parentId" ON "Note"
  FOR EACH ROW EXECUTE FUNCTION app.note_parent_visible();

-- ---------------------------------------------------------------------------
-- NoteComment
-- ---------------------------------------------------------------------------

-- Every role: a reply's thread is a root (one level of replies; the
-- composite foreign key keeps it on the same note).
-- app_user: a comment is made unresolved. Afterwards the author changes
-- its body, anchorText and anchor; resolving or reopening (resolvedAt,
-- resolvedById) is for whoever may edit the note (app.can_edit_note), as
-- themselves. Nothing else changes (updatedAt aside, which the app
-- stamps), so a non-author changes only resolvedAt and resolvedById. The
-- service path is not limited.
CREATE OR REPLACE FUNCTION app.note_comment_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_changed text[];
BEGIN
  IF NEW."threadId" IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW."threadId" IS DISTINCT FROM OLD."threadId")
     AND EXISTS (SELECT 1 FROM public."NoteComment" r
                  WHERE r."id" = NEW."threadId" AND r."threadId" IS NOT NULL) THEN
    RAISE EXCEPTION 'NoteComment: reply to the thread''s first comment' USING ERRCODE = '23514';
  END IF;
  IF current_user <> 'app_user' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW."resolvedAt" IS NOT NULL OR NEW."resolvedById" IS NOT NULL THEN
      RAISE EXCEPTION 'NoteComment: a new comment is unresolved' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  SELECT coalesce(array_agg(n.k), '{}') INTO v_changed
    FROM jsonb_each(to_jsonb(NEW)) AS n(k, v)
   WHERE n.k <> 'updatedAt' AND n.v IS DISTINCT FROM (to_jsonb(OLD) -> n.k);

  IF v_changed && ARRAY['resolvedAt', 'resolvedById'] THEN
    IF NOT app.can_edit_note(OLD."noteId") THEN
      RAISE EXCEPTION 'NoteComment: only someone who can edit the note resolves a thread' USING ERRCODE = '42501';
    END IF;
    IF NOT ((NEW."resolvedAt" IS NULL AND NEW."resolvedById" IS NULL)
            OR (NEW."resolvedAt" IS NOT NULL AND NEW."resolvedById" = app.user_id())) THEN
      RAISE EXCEPTION 'NoteComment: resolve as yourself, or reopen' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF NOT (v_changed <@ ARRAY['resolvedAt', 'resolvedById']) THEN
    IF OLD."authorId" IS DISTINCT FROM app.user_id() THEN
      RAISE EXCEPTION 'NoteComment: only its author edits a comment' USING ERRCODE = '42501';
    END IF;
    IF NOT (v_changed <@ ARRAY['resolvedAt', 'resolvedById', 'body', 'anchorText', 'anchor']) THEN
      RAISE EXCEPTION 'NoteComment: a comment''s author changes its body and anchor only' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.note_comment_guard() FROM PUBLIC;
CREATE TRIGGER note_comment_guard BEFORE INSERT OR UPDATE ON "NoteComment"
  FOR EACH ROW EXECUTE FUNCTION app.note_comment_guard();

-- A comment stays on its note, with its author, in its thread.
CREATE TRIGGER immutable_cols BEFORE UPDATE OF "noteId", "authorId", "threadId" ON "NoteComment"
  FOR EACH ROW EXECUTE FUNCTION app.immutable_columns('noteId', 'authorId', 'threadId');

-- Whoever can see the note reads its comments and adds their own; the
-- author (body) or whoever may edit the note (resolving) updates, the guard
-- above deciding which columns; the author or whoever may share the note
-- deletes (a root takes its replies with it).
ALTER TABLE "NoteComment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_user_select ON "NoteComment" FOR SELECT TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND app.can_view_note("noteId"));
CREATE POLICY app_user_insert ON "NoteComment" FOR INSERT TO app_user
  WITH CHECK ("organizationId" = (SELECT app.member_org_id())
              AND app.can_view_note("noteId")
              AND "authorId" = (SELECT app.user_id()));
CREATE POLICY app_user_update ON "NoteComment" FOR UPDATE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id())
         AND ("authorId" = (SELECT app.user_id()) OR app.can_edit_note("noteId")))
  WITH CHECK ("organizationId" = (SELECT app.member_org_id()) AND app.can_view_note("noteId"));
CREATE POLICY app_user_delete ON "NoteComment" FOR DELETE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id())
         AND ("authorId" = (SELECT app.user_id()) OR app.can_share_note("noteId")));
CREATE POLICY app_service_select ON "NoteComment" FOR SELECT TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_insert ON "NoteComment" FOR INSERT TO app_service
  WITH CHECK ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_update ON "NoteComment" FOR UPDATE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()))
  WITH CHECK ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_delete ON "NoteComment" FOR DELETE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));

REVOKE ALL ON "NoteComment" FROM PUBLIC, app_user, app_service, app_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON "NoteComment" TO app_user, app_service;

-- ---------------------------------------------------------------------------
-- NoteVersion
-- ---------------------------------------------------------------------------

-- A version stays on its note and keeps who saved it.
CREATE TRIGGER immutable_cols BEFORE UPDATE OF "noteId", "createdById" ON "NoteVersion"
  FOR EACH ROW EXECUTE FUNCTION app.immutable_columns('noteId', 'createdById');

-- Whoever can see the note reads its versions; whoever may edit it saves
-- one as themselves and renames one (app_user's UPDATE is a column grant on
-- name alone); whoever may share it deletes. The service path (autosave
-- snapshots, pruning) is org-scoped.
ALTER TABLE "NoteVersion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_user_select ON "NoteVersion" FOR SELECT TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND app.can_view_note("noteId"));
CREATE POLICY app_user_insert ON "NoteVersion" FOR INSERT TO app_user
  WITH CHECK ("organizationId" = (SELECT app.member_org_id())
              AND app.can_edit_note("noteId")
              AND "createdById" = (SELECT app.user_id()));
CREATE POLICY app_user_update ON "NoteVersion" FOR UPDATE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND app.can_edit_note("noteId"))
  WITH CHECK ("organizationId" = (SELECT app.member_org_id()) AND app.can_edit_note("noteId"));
CREATE POLICY app_user_delete ON "NoteVersion" FOR DELETE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND app.can_share_note("noteId"));
CREATE POLICY app_service_select ON "NoteVersion" FOR SELECT TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_insert ON "NoteVersion" FOR INSERT TO app_service
  WITH CHECK ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_update ON "NoteVersion" FOR UPDATE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()))
  WITH CHECK ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_delete ON "NoteVersion" FOR DELETE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));

REVOKE ALL ON "NoteVersion" FROM PUBLIC, app_user, app_service, app_auth;
GRANT SELECT, INSERT, DELETE ON "NoteVersion" TO app_user;
GRANT UPDATE ("name") ON "NoteVersion" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "NoteVersion" TO app_service;

-- ---------------------------------------------------------------------------
-- PulseIssue
-- ---------------------------------------------------------------------------

-- Members of the org read its issues; OWNER/ADMIN add or change the note
-- (app_user's UPDATE is a column grant on note alone); nothing else on the
-- member path. The pulse job (service path) writes, sends and prunes them.
ALTER TABLE "PulseIssue" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_user_select ON "PulseIssue" FOR SELECT TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()));
CREATE POLICY app_user_update ON "PulseIssue" FOR UPDATE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()))
  WITH CHECK ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()));
CREATE POLICY app_service_select ON "PulseIssue" FOR SELECT TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_insert ON "PulseIssue" FOR INSERT TO app_service
  WITH CHECK ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_update ON "PulseIssue" FOR UPDATE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()))
  WITH CHECK ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_delete ON "PulseIssue" FOR DELETE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));

REVOKE ALL ON "PulseIssue" FROM PUBLIC, app_user, app_service, app_auth;
GRANT SELECT ON "PulseIssue" TO app_user;
GRANT UPDATE ("note") ON "PulseIssue" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "PulseIssue" TO app_service;

-- ---------------------------------------------------------------------------
-- The manifest's tenant-only-write allowlist gains NoteComment:INSERT,
-- NoteComment:UPDATE, NoteComment:DELETE, NoteVersion:INSERT,
-- NoteVersion:UPDATE and NoteVersion:DELETE, and Project:UPDATE's reason
-- names the lead instead of the retired triage owner (unchanged otherwise
-- from 20261014130000_note_sharing). The Project and Label INSERT policies
-- still name is_org_admin, so they need no entry; they also let members in
-- while OrgSettings.memberCanCreateProjects / memberCanCreateTags is on.
-- PulseIssue's one member write (UPDATE of note) is admin-gated.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.security_manifest()
RETURNS TABLE (check_name text, object_name text)
LANGUAGE sql STABLE SET search_path = pg_catalog, pg_temp SET jit = off
AS $$
  WITH RECURSIVE rt AS (
    SELECT r.rolname, r.oid FROM pg_roles r
     WHERE r.rolname IN ('app_user', 'app_service', 'app_auth')
  ),
  nsp AS (
    SELECT n.oid, n.nspname FROM pg_namespace n
     WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
       AND n.nspname !~ '^pg_(toast_)?temp_'
  ),
  -- Schemas a runtime role can look names up in.
  reach_nsp AS (
    SELECT nsp.oid FROM nsp
     WHERE EXISTS (SELECT 1 FROM rt WHERE has_schema_privilege(rt.oid, nsp.oid, 'USAGE'))
  ),
  -- Every object a runtime role can get to, by name or through a reachable
  -- object (see the migration header).
  reached (classid, objid) AS (
    SELECT 'pg_class'::regclass::oid, c.oid FROM pg_class c
     WHERE c.relnamespace IN (SELECT oid FROM reach_nsp)
    UNION
    SELECT 'pg_proc'::regclass::oid, p.oid FROM pg_proc p
     WHERE p.pronamespace IN (SELECT oid FROM reach_nsp)
    UNION
    SELECT 'pg_type'::regclass::oid, t.oid FROM pg_type t
     WHERE t.typnamespace IN (SELECT oid FROM reach_nsp)
    UNION
    SELECT 'pg_operator'::regclass::oid, o.oid FROM pg_operator o
     WHERE o.oprnamespace IN (SELECT oid FROM reach_nsp)
    UNION
    SELECT 'pg_cast'::regclass::oid, k.oid FROM pg_cast k
    UNION
    SELECT x.classid, x.objid
      FROM reached r
     CROSS JOIN LATERAL (
       -- what it depends on
       SELECT d.refclassid, d.refobjid FROM pg_depend d
        WHERE d.classid = r.classid AND d.objid = r.objid
          AND d.refclassid <> 'pg_namespace'::regclass
       UNION ALL
       -- its parts
       SELECT d.classid, d.objid FROM pg_depend d
        WHERE d.refclassid = r.classid AND d.refobjid = r.objid
          AND d.deptype IN ('a', 'i')
     ) x (classid, objid)
  ),
  ext AS (
    SELECT d.objid, d.classid FROM pg_depend d WHERE d.deptype = 'e'
  ),
  -- Every relation, for the checks that stay global.
  rel_all AS (
    SELECT c.oid, c.relkind, c.relrowsecurity, c.reloptions,
           format('%I.%I', n.nspname, c.relname) AS fq
      FROM pg_class c JOIN nsp n ON n.oid = c.relnamespace
     WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
       AND NOT (n.nspname = 'public' AND c.relname = '_prisma_migrations')
       AND NOT EXISTS (SELECT 1 FROM ext WHERE ext.classid = 'pg_class'::regclass AND ext.objid = c.oid)
  ),
  -- The reachable ones, for the object checks.
  rel AS (
    SELECT rel_all.* FROM rel_all
     WHERE EXISTS (SELECT 1 FROM reached
                    WHERE reached.classid = 'pg_class'::regclass AND reached.objid = rel_all.oid)
  ),
  readable AS (
    SELECT rel.oid, rt.rolname FROM rel, rt
     WHERE has_any_column_privilege(rt.oid, rel.oid, 'SELECT')
        OR has_any_column_privilege(rt.oid, rel.oid, 'INSERT')
        OR has_any_column_privilege(rt.oid, rel.oid, 'UPDATE')
        OR has_table_privilege(rt.oid, rel.oid, 'DELETE')
  ),
  cmd AS (SELECT unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) AS cmd),
  granted AS (
    SELECT rel.oid, rel.fq, rt.rolname, cmd.cmd FROM rel, rt, cmd
     WHERE rel.relkind IN ('r', 'p')
       AND CASE WHEN cmd.cmd = 'DELETE' THEN has_table_privilege(rt.oid, rel.oid, 'DELETE')
                ELSE has_any_column_privilege(rt.oid, rel.oid, cmd.cmd) END
  ),
  fn_all AS (
    SELECT p.oid, p.prosecdef, p.proconfig, p.proowner,
           format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) AS fq,
           EXISTS (SELECT 1 FROM reached
                    WHERE reached.classid = 'pg_proc'::regclass AND reached.objid = p.oid) AS reachable,
           EXISTS (SELECT 1 FROM pg_event_trigger e WHERE e.evtfoid = p.oid) AS fires_on_ddl
      FROM pg_proc p JOIN nsp n ON n.oid = p.pronamespace
     WHERE NOT EXISTS (SELECT 1 FROM ext WHERE ext.classid = 'pg_proc'::regclass AND ext.objid = p.oid)
  ),
  fn AS (
    SELECT * FROM fn_all WHERE fn_all.reachable
  )
  SELECT 'rls_disabled', fq FROM rel WHERE relkind IN ('r', 'p') AND NOT relrowsecurity
  UNION ALL
  SELECT 'view_not_invoker', rel.fq FROM rel
   WHERE rel.relkind = 'v'
     AND EXISTS (SELECT 1 FROM readable WHERE readable.oid = rel.oid)
     AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(rel.reloptions, ARRAY[]::text[])) o
                      WHERE lower(o) IN ('security_invoker=true', 'security_invoker=on',
                                         'security_invoker=1', 'security_invoker=yes'))
  UNION ALL
  SELECT 'matview_or_foreign_granted', rel.fq FROM rel
   WHERE rel.relkind IN ('m', 'f') AND EXISTS (SELECT 1 FROM readable WHERE readable.oid = rel.oid)
  UNION ALL
  SELECT 'policy_gap', g.fq || ':' || g.rolname || ':' || g.cmd FROM granted g
   WHERE NOT EXISTS (
     SELECT 1 FROM pg_policy pol
      WHERE pol.polrelid = g.oid
        AND (pol.polroles = '{0}' OR (SELECT r.oid FROM pg_roles r WHERE r.rolname = g.rolname) = ANY (pol.polroles))
        AND (pol.polcmd = '*' OR pol.polcmd = CASE g.cmd WHEN 'SELECT' THEN 'r' WHEN 'INSERT' THEN 'a'
                                                         WHEN 'UPDATE' THEN 'w' ELSE 'd' END))
  UNION ALL
  SELECT 'permissive_policy', p.schemaname || '.' || p.tablename || ':' || p.policyname FROM pg_policies p
   WHERE p.schemaname IN (SELECT nspname FROM nsp)
     AND EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                   JOIN reached ON reached.classid = 'pg_class'::regclass AND reached.objid = c.oid
                  WHERE n.nspname = p.schemaname AND c.relname = p.tablename)
     AND (((p.roles && ARRAY['app_user', 'app_service']::name[])
           AND (p.qual = 'true' OR p.with_check = 'true' OR p.cmd = 'ALL'))
       OR (p.cmd = 'ALL' AND NOT (p.roles <@ ARRAY['app_auth']::name[])))
  UNION ALL
  SELECT 'dangerous_privilege', rel_all.fq || ':' || rt.rolname || ':' || pr.priv
    FROM rel_all, rt, (VALUES ('TRUNCATE'), ('TRIGGER'), ('REFERENCES')) pr(priv)
   WHERE CASE pr.priv WHEN 'REFERENCES' THEN has_any_column_privilege(rt.oid, rel_all.oid, 'REFERENCES')
                      ELSE has_table_privilege(rt.oid, rel_all.oid, pr.priv) END
  UNION ALL
  SELECT 'public_execute', fn.fq FROM fn WHERE has_function_privilege('public', fn.oid, 'EXECUTE')
  UNION ALL
  SELECT 'definer_search_path', fn_all.fq FROM fn_all
   WHERE (fn_all.reachable OR fn_all.fires_on_ddl)
     AND fn_all.prosecdef
     AND NOT coalesce(fn_all.proconfig @> ARRAY['search_path=pg_catalog, public, pg_temp'], false)
  UNION ALL
  SELECT 'temp_privilege', rt.rolname::text FROM rt
   WHERE has_database_privilege(rt.oid, current_database(), 'TEMPORARY')
  UNION ALL
  SELECT 'schema_create', nsp.nspname || ':' || rt.rolname FROM nsp, rt
   WHERE has_schema_privilege(rt.oid, nsp.oid, 'CREATE')
  UNION ALL
  SELECT 'role_attribute', r.rolname::text FROM pg_roles r JOIN rt ON rt.oid = r.oid
   WHERE r.rolsuper OR r.rolbypassrls OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication
  UNION ALL
  SELECT 'role_membership', rt.rolname || ' in ' || g.rolname FROM pg_auth_members m
    JOIN rt ON rt.oid = m.member JOIN pg_roles g ON g.oid = m.roleid
  UNION ALL
  SELECT 'owns_objects', rt.rolname::text FROM rt
   WHERE EXISTS (SELECT 1 FROM pg_class c WHERE c.relowner = rt.oid)
      OR EXISTS (SELECT 1 FROM pg_proc p WHERE p.proowner = rt.oid)
      OR EXISTS (SELECT 1 FROM pg_type t WHERE t.typowner = rt.oid)
      OR EXISTS (SELECT 1 FROM pg_namespace n WHERE n.nspowner = rt.oid)

  UNION ALL
  -- Tenant-only writes (B9, unchanged). A policy that lets app_user INSERT,
  -- UPDATE or DELETE with nothing but an organizationId test is a tenant
  -- check, not a permission check: every member of the org may do it, and
  -- the app layer is the only thing standing in the way. That is right for
  -- the tables below, where members legitimately write; anywhere else it is
  -- a missing role predicate, and this reports it until the table is
  -- reviewed and added here in a migration. Label shipped without one:
  -- label management has always been admin-only in the app, and any member
  -- could delete every label in the org straight through the database.
  SELECT 'tenant_only_write', p.tablename || ':' || p.cmd FROM pg_policies p
   WHERE p.schemaname = 'public'
     AND p.roles && ARRAY['app_user']::name[]
     AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE')
     AND coalesce(p.qual, '') || coalesce(p.with_check, '') NOT LIKE '%is_org_admin%'
     AND coalesce(p.qual, '') || coalesce(p.with_check, '') NOT LIKE '%is_org_owner%'
     AND coalesce(p.qual, '') || coalesce(p.with_check, '') NOT LIKE '%is_finance%'
     AND (p.tablename || ':' || p.cmd) <> ALL (ARRAY[
       -- Tasks are the shared work surface: any member files, edits and
       -- closes one (the edit-authorization matrix is the app's, and the
       -- self-assign carve-out depends on it). INSERT pins createdById.
       'Task:INSERT', 'Task:UPDATE', 'Task:DELETE',
       -- Collaborators and labels on a task move with the task itself.
       'TaskAssignee:INSERT', 'TaskAssignee:UPDATE', 'TaskAssignee:DELETE',
       'TaskLabel:INSERT', 'TaskLabel:UPDATE', 'TaskLabel:DELETE',
       -- Mentions are a side effect of writing a description or a comment;
       -- INSERT pins mentionedById to the actor.
       'TaskMention:INSERT', 'TaskMention:UPDATE', 'TaskMention:DELETE',
       -- Append-only, actor pinned; there is no UPDATE or DELETE policy.
       'TaskActivity:INSERT',
       -- Author pinned on INSERT; UPDATE and DELETE are author-or-admin.
       'TaskComment:INSERT', 'Note:INSERT',
       -- Each member writes their own Sunday update (userId pinned); DELETE
       -- is admin-gated.
       'WeeklyUpdate:INSERT', 'WeeklyUpdate:UPDATE',
       -- A project's lead is cleared by the member who leaves the org
       -- (untieDepartingMember runs as them), and members keep a project's
       -- status, dates and lead current, so the UPDATE cannot be
       -- admin-only. Deleting projects is; creating them is too unless the
       -- org lets members (OrgSettings.memberCanCreateProjects).
       'Project:UPDATE',
       -- Anyone may open an availability poll (createdById pinned) and it
       -- carries its own slots; answering is pinned to the responder.
       'AvailabilityPoll:INSERT', 'AvailabilityPoll:UPDATE', 'AvailabilityPoll:DELETE',
       'PollSlot:INSERT', 'PollSlot:UPDATE', 'PollSlot:DELETE',
       'PollResponse:INSERT', 'PollResponse:UPDATE', 'PollResponse:DELETE',
       -- Creating an event invites other members, so attendee rows are
       -- written for people other than the actor.
       'EventAttendee:INSERT', 'EventAttendee:UPDATE', 'EventAttendee:DELETE',
       -- A notification is addressed to another member (the WITH CHECK
       -- requires the recipient to be one); marking one read is own-row.
       'Notification:INSERT', 'Notification:UPDATE',
       -- Own row, and a column-level grant that excludes email.
       'User:UPDATE',
       -- Own row only: a user's availability (onboarding). Nobody else reads
       -- or writes it; co-members see busy hours through
       -- app.member_busy_hours, which checks the org and its setting.
       'UserAvailability:INSERT', 'UserAvailability:UPDATE',
       'Pin:INSERT', 'Pin:UPDATE', 'Pin:DELETE',
       'RecentVisit:INSERT', 'RecentVisit:UPDATE', 'RecentVisit:DELETE',
       'MemberPrefs:INSERT', 'MemberPrefs:UPDATE', 'OrgFile:INSERT',
       'NoteFolder:INSERT',
       -- Question polls: any member asks one (createdById pinned) and votes
       -- as themselves while it is open (userId pinned, and the option must
       -- belong to the same poll). Closing, reopening and deleting a poll,
       -- and removing an option, are creator-or-admin.
       'Poll:INSERT', 'PollVote:INSERT', 'PollVote:DELETE',
       -- Club-made databases: a member adds and edits rows only where
       -- app.can_edit_database lets them (owners and admins, or members of a
       -- database that allows it), a role check the manifest can't read in
       -- the policy text. INSERT pins createdById; deleting for good is
       -- admin-only.
       'DatabaseRecord:INSERT', 'DatabaseRecord:UPDATE',
       -- Note sharing: a note's author (or an owner/admin, on a club note)
       -- shares it, which app.can_share_note decides, a role check the
       -- manifest can't read in the policy text. INSERT pins createdById
       -- and requires the person to be a member; anyone may also take
       -- themselves off a note shared with them (DELETE).
       'NoteShare:INSERT', 'NoteShare:UPDATE', 'NoteShare:DELETE',
       -- Note comments: whoever can see the note comments as themselves
       -- (app.can_view_note, authorId pinned); the author edits the body and
       -- whoever may edit the note resolves (app.can_edit_note, with
       -- app.note_comment_guard deciding the columns); the author or
       -- whoever may share the note deletes (app.can_share_note). Role
       -- checks the manifest can't read in the policy text.
       'NoteComment:INSERT', 'NoteComment:UPDATE', 'NoteComment:DELETE',
       -- Note versions: whoever may edit the note saves one as themselves
       -- and renames one (name is app_user's only UPDATE column); whoever
       -- may share the note deletes. app.can_edit_note and
       -- app.can_share_note are the role checks.
       'NoteVersion:INSERT', 'NoteVersion:UPDATE', 'NoteVersion:DELETE'
     ])
$$;
