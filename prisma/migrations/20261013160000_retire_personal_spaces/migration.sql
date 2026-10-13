-- Retire the free personal RSVP spaces (docs/features/rsvp.md, "Part of
-- every club"). RSVP pages are part of every club, the Free plan included,
-- so there is one way in: sign up, then join or start a club. Every
-- PERSONAL organization (20261012190000_rsvp_free_spaces) becomes an
-- ordinary club on the Free plan, owned by the person who made it, so its
-- event pages, guests and links keep working. Runs after
-- 20261013150000_org_plan, which added Organization.plan.
--
-- Migrations run as the owner, which app.organization_kind_guard and
-- app.organization_guard exempt (they bind app_user and app_service only),
-- so kind and personalOwnerId can change here.

-- 1. The owner is an OWNER member (made with the space; restored if not).
INSERT INTO "Membership" ("id", "userId", "organizationId", "role")
SELECT 'm' || substr(md5(random()::text || o."id" || clock_timestamp()::text), 1, 24),
       o."personalOwnerId", o."id", 'OWNER'
  FROM "Organization" o
 WHERE o."kind" = 'PERSONAL' AND o."personalOwnerId" IS NOT NULL
ON CONFLICT ("userId", "organizationId") DO UPDATE SET "role" = 'OWNER';

-- 2. A club's name: a space was named after its person ("Maya Patel", the
--    email's local part, or "My events"); as a club it is "Maya Patel's
--    events". A name the person changed is kept.
UPDATE "Organization" o
   SET "name" = left(
         coalesce(nullif(btrim(u."name"), ''), split_part(u."email", '@', 1)) || '''s events',
         80)
  FROM "User" u
 WHERE o."kind" = 'PERSONAL' AND u."id" = o."personalOwnerId"
   AND (btrim(o."name") = ''
        OR o."name" = 'My events'
        OR o."name" = left(btrim(coalesce(u."name", '')), 80)
        OR o."name" = left(split_part(u."email", '@', 1), 80))
   AND char_length(coalesce(nullif(btrim(u."name"), ''), split_part(u."email", '@', 1))) >= 2;

UPDATE "Organization" SET "name" = 'My events'
 WHERE "kind" = 'PERSONAL' AND btrim("name") = '';

-- 3. Every space is a club now, on the Free plan.
UPDATE "Organization"
   SET "kind" = 'CLUB', "personalOwnerId" = NULL, "plan" = 'FREE'
 WHERE "kind" = 'PERSONAL';

-- 4. What only the personal spaces used.
DROP TRIGGER IF EXISTS organization_kind_guard ON "Organization";
DROP FUNCTION IF EXISTS app.organization_kind_guard();
DROP FUNCTION IF EXISTS app.move_personal_event(text, text);
DROP FUNCTION IF EXISTS app.purge_personal_rsvp_guests(integer);

ALTER TABLE "Organization" DROP CONSTRAINT IF EXISTS "Organization_personal_owner";
ALTER TABLE "Organization" DROP CONSTRAINT IF EXISTS "Organization_personalOwnerId_fkey";
DROP INDEX IF EXISTS "Organization_personalOwnerId_key";
ALTER TABLE "Organization" DROP COLUMN "personalOwnerId";

-- Only the free guest list purge stamped it.
ALTER TABLE "Event" DROP COLUMN "rsvpGuestsPurgedAt";

-- 5. Nothing makes a personal space again: kind stays (every org is a
--    CLUB), and the database refuses anything else.
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_kind_club" CHECK ("kind" = 'CLUB');
