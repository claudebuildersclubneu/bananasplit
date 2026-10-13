-- Personal spaces and club trials (docs/features/personal-and-clubs.md).
-- Supersedes the Free club plan of 20261013150000_org_plan and undoes
-- 20261013160000_retire_personal_spaces:
--
-- 1. Every account has one Personal space: an Organization of kind PERSONAL
--    owned by one person (personalOwnerId, unique), plan FREE, with exactly
--    one member (its owner). No second member, no invitation, no join code,
--    for any role (app.personal_space_guard).
-- 2. Clubs (kind CLUB) are on TRIAL (30 days of everything from creation,
--    trialEndsAt), CLUB or SOCIETY. FREE means Personal and nothing else.
--    Only the owner moves a club off its trial (app.organization_guard), and
--    nobody on the app roles can put a club back on a trial, move its end,
--    or change kind or personalOwnerId (app.organization_space_guard).
--
-- Migrations run as the owner, which the guards on Organization exempt.

-- ---------------------------------------------------------------------------
-- Plan TRIAL. The enum is rebuilt (a value added with ADD VALUE can't be used
-- in the same transaction), in its new order.
-- ---------------------------------------------------------------------------

ALTER TABLE "Organization" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TYPE "OrgPlan" RENAME TO "OrgPlan_old";
CREATE TYPE "OrgPlan" AS ENUM ('FREE', 'TRIAL', 'CLUB', 'SOCIETY');
ALTER TABLE "Organization" ALTER COLUMN "plan" TYPE "OrgPlan" USING ("plan"::text::"OrgPlan");
DROP TYPE "OrgPlan_old";
ALTER TABLE "Organization" ALTER COLUMN "plan" SET DEFAULT 'TRIAL';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "personalOwnerId" TEXT,
ADD COLUMN "trialEndsAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_personalOwnerId_key" ON "Organization"("personalOwnerId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_personalOwnerId_fkey" FOREIGN KEY ("personalOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Organization" DROP CONSTRAINT IF EXISTS "Organization_kind_club";

-- ---------------------------------------------------------------------------
-- Data, before the checks.
-- ---------------------------------------------------------------------------

-- a. One-member Free clubs (yesterday's converted personal spaces) are
--    Personal again, owned by their one OWNER. A person with more than one
--    keeps the oldest as Personal; the others stay clubs, on a trial (b).
WITH candidates AS (
  SELECT o."id", m."userId",
         row_number() OVER (PARTITION BY m."userId" ORDER BY o."createdAt", o."id") AS n
    FROM "Organization" o
    JOIN "Membership" m ON m."organizationId" = o."id" AND m."role" = 'OWNER'
   WHERE o."kind" = 'CLUB' AND o."plan" = 'FREE'
     AND (SELECT count(*) FROM "Membership" x WHERE x."organizationId" = o."id") = 1
)
UPDATE "Organization" o
   SET "kind" = 'PERSONAL', "personalOwnerId" = c."userId", "trialEndsAt" = NULL
  FROM candidates c
 WHERE c."id" = o."id" AND c.n = 1;

-- A Personal space has no invitations or join code.
DELETE FROM "Invitation" i USING "Organization" o
 WHERE i."organizationId" = o."id" AND o."kind" = 'PERSONAL';
DELETE FROM "OrgJoinCode" j USING "Organization" o
 WHERE j."organizationId" = o."id" AND o."kind" = 'PERSONAL';

-- b. Every other Free club starts a 30-day trial today.
UPDATE "Organization"
   SET "plan" = 'TRIAL', "trialEndsAt" = app.utc_now() + interval '30 days'
 WHERE "kind" = 'CLUB' AND "plan" = 'FREE';

-- c. Every onboarded person without a Personal space gets one: "Maya's
--    space" (or "Personal"), a slug nobody reads (me-xxxxxxxxxx), their
--    time zone, and them as its OWNER.
--    One statement: each statement here commits on its own.
WITH src AS (
  SELECT u."id" AS "userId",
         'c' || substr(md5(random()::text || u."id" || clock_timestamp()::text), 1, 24) AS "orgId",
         'me-' || substr(md5(random()::text || u."id" || 'slug' || clock_timestamp()::text), 1, 10) AS "slug",
         CASE
           WHEN char_length(split_part(btrim(coalesce(u."name", '')), ' ', 1)) >= 1
             THEN left(split_part(btrim(u."name"), ' ', 1), 70) || '''s space'
           ELSE 'Personal'
         END AS "name",
         CASE
           WHEN u."timezone" IS NOT NULL
                AND EXISTS (SELECT 1 FROM pg_timezone_names t WHERE t.name = u."timezone")
             THEN u."timezone"
           ELSE 'America/New_York'
         END AS "timezone"
    FROM "User" u
   WHERE u."onboardedAt" IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM "Organization" o WHERE o."personalOwnerId" = u."id")
), made AS (
  INSERT INTO "Organization" ("id", "name", "slug", "timezone", "kind", "personalOwnerId", "plan")
  SELECT "orgId", "name", "slug", "timezone", 'PERSONAL', "userId", 'FREE' FROM src
  RETURNING "id", "personalOwnerId"
)
INSERT INTO "Membership" ("id", "userId", "organizationId", "role")
SELECT 'm' || substr(md5(random()::text || "id" || clock_timestamp()::text), 1, 24),
       "personalOwnerId", "id", 'OWNER'
  FROM made;

-- ---------------------------------------------------------------------------
-- Checks.
-- ---------------------------------------------------------------------------

-- A Personal space has exactly one owner; a club has none.
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_personal_owner"
  CHECK (("kind" = 'PERSONAL') = ("personalOwnerId" IS NOT NULL));
-- FREE is Personal's plan, and only Personal's.
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_personal_plan"
  CHECK (("kind" = 'PERSONAL') = ("plan" = 'FREE'));
-- A trial ends.
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_trial_ends"
  CHECK ("plan" <> 'TRIAL' OR "trialEndsAt" IS NOT NULL);

-- ---------------------------------------------------------------------------
-- app.organization_space_guard: kind, owner, plan and trial.
--   INSERT, every role: a Personal space takes plan FREE when it was left at
--   the column default (TRIAL); a trial without an end ends in 30 days.
--   INSERT, app roles: a club starts on its trial, ending within 30 days.
--   UPDATE, app roles: kind, personalOwnerId and trialEndsAt never change;
--   plan never moves to TRIAL or FREE (OWNER-only otherwise:
--   app.organization_guard).
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
  IF NEW."plan" IS DISTINCT FROM OLD."plan" AND NEW."plan" IN ('TRIAL', 'FREE') THEN
    RAISE EXCEPTION 'a club moves to Club or Society' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.organization_space_guard() FROM PUBLIC;

CREATE TRIGGER organization_space_guard BEFORE INSERT OR UPDATE ON "Organization"
  FOR EACH ROW EXECUTE FUNCTION app.organization_space_guard();

-- plan stays OWNER-only (20261013150000_org_plan); unchanged, restated so
-- this migration reads on its own.
CREATE OR REPLACE FUNCTION app.organization_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  k text;
BEGIN
  IF current_user NOT IN ('app_user', 'app_service') THEN
    RETURN NEW;
  END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id" THEN
    RAISE EXCEPTION 'Organization.id is immutable' USING ERRCODE = '42501';
  END IF;
  FOREACH k IN ARRAY ARRAY['slug', 'deletedAt', 'deleteScheduledFor', 'plan'] LOOP
    IF (to_jsonb(NEW) -> k) IS DISTINCT FROM (to_jsonb(OLD) -> k)
       AND NOT app.user_has_role(app.user_id(), OLD."id", 'OWNER') THEN
      RAISE EXCEPTION 'only an OWNER can change Organization.%', k USING ERRCODE = '42501';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------------------
-- app.personal_space_guard: a Personal space is its owner's alone. Every
-- role, the owner (migrations) included: its one Membership is the owner's
-- OWNER row, and it never has an Invitation or a join code.
-- SECURITY DEFINER: it reads the org and its memberships past RLS (the
-- caller may be on the service path for another org's context); it is a
-- trigger function, so nothing can call it directly.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.personal_space_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_kind "OrgKind";
  v_owner text;
BEGIN
  SELECT o."kind", o."personalOwnerId" INTO v_kind, v_owner
    FROM public."Organization" o WHERE o."id" = NEW."organizationId";
  IF v_kind IS DISTINCT FROM 'PERSONAL' THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'Membership' THEN
    IF NEW."userId" = v_owner AND NEW."role" = 'OWNER'
       AND NOT EXISTS (SELECT 1 FROM public."Membership" m WHERE m."organizationId" = NEW."organizationId") THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'a Personal space has one member' USING ERRCODE = '23514';
  END IF;
  RAISE EXCEPTION 'a Personal space takes no invitations' USING ERRCODE = '23514';
END $$;
REVOKE ALL ON FUNCTION app.personal_space_guard() FROM PUBLIC;

CREATE TRIGGER personal_space_guard BEFORE INSERT ON "Membership"
  FOR EACH ROW EXECUTE FUNCTION app.personal_space_guard();
CREATE TRIGGER personal_space_guard BEFORE INSERT ON "Invitation"
  FOR EACH ROW EXECUTE FUNCTION app.personal_space_guard();
CREATE TRIGGER personal_space_guard BEFORE INSERT ON "OrgJoinCode"
  FOR EACH ROW EXECUTE FUNCTION app.personal_space_guard();
