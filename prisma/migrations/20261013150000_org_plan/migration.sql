-- Club plans (src/lib/billing/features.ts). FREE: RSVP pages and a simple
-- task list; CLUB and SOCIETY: the paid plans on the pricing page. New
-- clubs start on FREE; every club that exists today moves to SOCIETY, so
-- nobody loses a feature they already use.

-- CreateEnum
CREATE TYPE "OrgPlan" AS ENUM ('FREE', 'CLUB', 'SOCIETY');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "plan" "OrgPlan" NOT NULL DEFAULT 'FREE';

-- ---------------------------------------------------------------------------
-- Hand-written: existing clubs, and who may change the plan.
-- ---------------------------------------------------------------------------

UPDATE "Organization" SET "plan" = 'SOCIETY';

-- plan joins slug, deletedAt and deleteScheduledFor as an OWNER-only column.
-- Same function as 0B's, with 'plan' added to the list; still SECURITY
-- INVOKER and binding app_user and app_service only (the owner, i.e.
-- migrations and a future billing webhook run as a definer, is exempt).
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
