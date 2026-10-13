-- Free RSVP pages and the features Luma doesn't have (docs/features/rsvp.md).
--
-- 1. Personal spaces. Anyone with an account makes event pages at /rsvp
--    without starting a club: their events live in a PERSONAL organization
--    that is theirs alone (Organization.personalOwnerId), never listed as a
--    club. A free event's guest list is cleared 30 days after it ends
--    (app.purge_personal_rsvp_guests); "Save to a club" moves the event, its
--    guests and its link into a club the person runs
--    (app.move_personal_event), where the list is kept.
-- 2. Split the cost: a price per guest or a total shared by everyone going,
--    paid to the host's Venmo, Cash App, PayPal or Zelle; guests say they
--    paid, hosts confirm.
-- 3. A bring list (RsvpItem, RsvpItemClaim).
-- 4. Invite links (inviteCode, invitedById) and QR tickets (ticketCode,
--    app.rsvp_ticket).

-- CreateEnum
CREATE TYPE "OrgKind" AS ENUM ('CLUB', 'PERSONAL');

-- CreateEnum
CREATE TYPE "RsvpCostMode" AS ENUM ('NONE', 'EACH', 'SPLIT');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "kind" "OrgKind" NOT NULL DEFAULT 'CLUB',
ADD COLUMN     "personalOwnerId" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "rsvpCostCents" INTEGER,
ADD COLUMN     "rsvpCostMode" "RsvpCostMode" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "rsvpCostNote" TEXT,
ADD COLUMN     "rsvpGuestsPurgedAt" TIMESTAMP(3),
ADD COLUMN     "rsvpPayTo" JSONB;

-- AlterTable: the two codes are filled for existing sign-ups, then required.
ALTER TABLE "EventRegistration" ADD COLUMN     "attendanceId" TEXT,
ADD COLUMN     "inviteCode" TEXT,
ADD COLUMN     "invitedById" TEXT,
ADD COLUMN     "paidCents" INTEGER,
ADD COLUMN     "paidClaimedAt" TIMESTAMP(3),
ADD COLUMN     "paidConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "ticketCode" TEXT;

UPDATE "EventRegistration"
   SET "inviteCode" = substr(md5(random()::text || "id"), 1, 8),
       "ticketCode" = substr(md5(random()::text || "id" || clock_timestamp()::text), 1, 12);

ALTER TABLE "EventRegistration" ALTER COLUMN "inviteCode" SET NOT NULL,
ALTER COLUMN "ticketCode" SET NOT NULL;

-- CreateTable
CREATE TABLE "RsvpItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "slots" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RsvpItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RsvpItemClaim" (
    "organizationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RsvpItemClaim_pkey" PRIMARY KEY ("itemId","registrationId")
);

-- CreateIndex
CREATE INDEX "RsvpItem_organizationId_eventId_position_idx" ON "RsvpItem"("organizationId", "eventId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "RsvpItem_organizationId_id_key" ON "RsvpItem"("organizationId", "id");

-- CreateIndex
CREATE INDEX "RsvpItemClaim_organizationId_registrationId_idx" ON "RsvpItemClaim"("organizationId", "registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_ticketCode_key" ON "EventRegistration"("ticketCode");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_attendanceId_key" ON "EventRegistration"("attendanceId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_inviteCode_key" ON "EventRegistration"("eventId", "inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_personalOwnerId_key" ON "Organization"("personalOwnerId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_personalOwnerId_fkey" FOREIGN KEY ("personalOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "EventRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RsvpItem" ADD CONSTRAINT "RsvpItem_organizationId_eventId_fkey" FOREIGN KEY ("organizationId", "eventId") REFERENCES "Event"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RsvpItemClaim" ADD CONSTRAINT "RsvpItemClaim_organizationId_itemId_fkey" FOREIGN KEY ("organizationId", "itemId") REFERENCES "RsvpItem"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RsvpItemClaim" ADD CONSTRAINT "RsvpItemClaim_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Hand-written: checks, the kind guard, RLS, grants and the functions.
-- ---------------------------------------------------------------------------

-- A personal space has exactly one owner; a club has none.
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_personal_owner"
  CHECK (("kind" = 'PERSONAL') = ("personalOwnerId" IS NOT NULL));

ALTER TABLE "Event" ADD CONSTRAINT "Event_rsvpCost_range"
  CHECK ("rsvpCostCents" IS NULL OR ("rsvpCostCents" >= 0 AND "rsvpCostCents" <= 10000000));
ALTER TABLE "Event" ADD CONSTRAINT "Event_rsvpCost_needs_amount"
  CHECK ("rsvpCostMode" = 'NONE' OR "rsvpCostCents" IS NOT NULL);
ALTER TABLE "Event" ADD CONSTRAINT "Event_rsvpCostNote_length"
  CHECK ("rsvpCostNote" IS NULL OR char_length("rsvpCostNote") <= 120);
ALTER TABLE "Event" ADD CONSTRAINT "Event_rsvpPayTo_shape"
  CHECK ("rsvpPayTo" IS NULL OR (jsonb_typeof("rsvpPayTo") = 'object' AND pg_column_size("rsvpPayTo") <= 2048));

ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_inviteCode_format"
  CHECK ("inviteCode" ~ '^[a-z0-9]{6,12}$');
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_ticketCode_format"
  CHECK ("ticketCode" ~ '^[a-z0-9]{12}$');
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_paidCents_range"
  CHECK ("paidCents" IS NULL OR ("paidCents" >= 0 AND "paidCents" <= 10000000));
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_not_self_invited"
  CHECK ("invitedById" IS NULL OR "invitedById" <> "id");

ALTER TABLE "RsvpItem" ADD CONSTRAINT "RsvpItem_label_length"
  CHECK (char_length(btrim("label")) >= 1 AND char_length("label") <= 80);
ALTER TABLE "RsvpItem" ADD CONSTRAINT "RsvpItem_slots_range"
  CHECK ("slots" >= 1 AND "slots" <= 50);

-- kind and personalOwnerId are fixed when the org is made. Same shape as
-- organization_guard: binds the runtime roles, not the owner (migrations,
-- the definer functions below).
CREATE OR REPLACE FUNCTION app.organization_kind_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('app_user', 'app_service') THEN
    RETURN NEW;
  END IF;
  IF NEW."kind" IS DISTINCT FROM OLD."kind"
     OR NEW."personalOwnerId" IS DISTINCT FROM OLD."personalOwnerId" THEN
    RAISE EXCEPTION 'Organization.kind and personalOwnerId are immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.organization_kind_guard() FROM PUBLIC;

CREATE TRIGGER organization_kind_guard BEFORE UPDATE ON "Organization"
  FOR EACH ROW EXECUTE FUNCTION app.organization_kind_guard();

-- The bring list follows EventRegistration: owners and admins in the suite,
-- the public page (claims) on the service path for its own event's org.
ALTER TABLE "RsvpItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RsvpItemClaim" ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_user_select ON "RsvpItem" FOR SELECT TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()));
CREATE POLICY app_user_insert ON "RsvpItem" FOR INSERT TO app_user
  WITH CHECK ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()));
CREATE POLICY app_user_update ON "RsvpItem" FOR UPDATE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()))
  WITH CHECK ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()));
CREATE POLICY app_user_delete ON "RsvpItem" FOR DELETE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()));
CREATE POLICY app_service_select ON "RsvpItem" FOR SELECT TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_insert ON "RsvpItem" FOR INSERT TO app_service
  WITH CHECK ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_update ON "RsvpItem" FOR UPDATE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()))
  WITH CHECK ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_delete ON "RsvpItem" FOR DELETE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));

CREATE POLICY app_user_select ON "RsvpItemClaim" FOR SELECT TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()));
CREATE POLICY app_user_insert ON "RsvpItemClaim" FOR INSERT TO app_user
  WITH CHECK ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()));
CREATE POLICY app_user_delete ON "RsvpItemClaim" FOR DELETE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()));
CREATE POLICY app_service_select ON "RsvpItemClaim" FOR SELECT TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_insert ON "RsvpItemClaim" FOR INSERT TO app_service
  WITH CHECK ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_delete ON "RsvpItemClaim" FOR DELETE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));

REVOKE ALL ON "RsvpItem", "RsvpItemClaim" FROM PUBLIC, app_user, app_service, app_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON "RsvpItem" TO app_user, app_service;
GRANT SELECT, INSERT, DELETE ON "RsvpItemClaim" TO app_user, app_service;

-- A claim's item and sign-up are on the same event. RLS keeps both in one
-- org; this keeps a guest from claiming another event's item.
CREATE OR REPLACE FUNCTION app.rsvp_claim_same_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public."RsvpItem" i
      JOIN public."EventRegistration" r ON r."eventId" = i."eventId" AND r."organizationId" = i."organizationId"
     WHERE i."id" = NEW."itemId" AND r."id" = NEW."registrationId"
       AND i."organizationId" = NEW."organizationId"
  ) THEN
    RAISE EXCEPTION 'RsvpItemClaim: the item and the sign-up must be on the same event' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.rsvp_claim_same_event() FROM PUBLIC;

CREATE TRIGGER same_event BEFORE INSERT ON "RsvpItemClaim"
  FOR EACH ROW EXECUTE FUNCTION app.rsvp_claim_same_event();

-- The page, event and sign-up behind a ticket's code, for /e/[slug]/t/[code]
-- (a host who scans it checks the guest in). Nothing for a page that is
-- off or an event that is gone.
CREATE OR REPLACE FUNCTION app.rsvp_ticket(p_code text)
RETURNS TABLE ("organizationId" text, "eventId" text, "registrationId" text, "slug" text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT r."organizationId", r."eventId", r."id", e."rsvpSlug"
    FROM public."EventRegistration" r
    JOIN public."Event" e ON e."id" = r."eventId" AND e."organizationId" = r."organizationId"
   WHERE r."ticketCode" = p_code AND e."deletedAt" IS NULL AND e."mergedIntoId" IS NULL
     AND e."rsvpSlug" IS NOT NULL
$$;
REVOKE ALL ON FUNCTION app.rsvp_ticket(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.rsvp_ticket(text) TO app_service;

-- "Save to a club": moves one of the caller's free events into a club they
-- own or run (OWNER or ADMIN), with its sign-ups, bring list and claims (the
-- composite foreign keys cascade the new organizationId) and its pending
-- RSVP jobs. The page keeps its code, so the shared link still works. The
-- caller is app.user_id(); false when the event isn't theirs or the club
-- isn't one they run.
CREATE OR REPLACE FUNCTION app.move_personal_event(p_event text, p_to_org text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user text := app.user_id();
  v_from text;
  v_tz text;
BEGIN
  IF v_user IS NULL OR p_event IS NULL OR p_to_org IS NULL THEN
    RETURN false;
  END IF;
  SELECT e."organizationId" INTO v_from
    FROM public."Event" e
    JOIN public."Organization" o ON o."id" = e."organizationId"
   WHERE e."id" = p_event AND e."deletedAt" IS NULL
     AND o."kind" = 'PERSONAL' AND o."personalOwnerId" = v_user
     FOR UPDATE OF e;
  IF v_from IS NULL THEN
    RETURN false;
  END IF;
  SELECT o."timezone" INTO v_tz
    FROM public."Membership" m
    JOIN public."Organization" o ON o."id" = m."organizationId"
   WHERE m."userId" = v_user AND m."organizationId" = p_to_org
     AND m."role" IN ('OWNER', 'ADMIN') AND o."kind" = 'CLUB' AND o."deletedAt" IS NULL;
  IF v_tz IS NULL THEN
    RETURN false;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('rsvp:' || p_event, 0));
  UPDATE public."Job" j
     SET "organizationId" = p_to_org
   WHERE j."organizationId" = v_from
     AND j."status" IN ('PENDING', 'RUNNING')
     AND j."kind" IN ('rsvp-email', 'rsvp-fanout')
     AND (j."payload" ->> 'eventId' = p_event
          OR j."payload" ->> 'registrationId' IN (
               SELECT r."id" FROM public."EventRegistration" r
                WHERE r."organizationId" = v_from AND r."eventId" = p_event));
  -- The person who made it hosts it in the club (they are a member there).
  UPDATE public."Event"
     SET "organizationId" = p_to_org,
         "hostUserId" = v_user,
         "term" = app.term_of("startsAt", v_tz),
         "updatedAt" = app.utc_now()
   WHERE "id" = p_event;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION app.move_personal_event(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.move_personal_event(text, text) TO app_user;

-- Free events keep their guest lists for p_days after they end; clubs keep
-- theirs. Deletes the sign-ups (claims go with them), stamps the event, and
-- turns the page off. Run daily by the maintenance job.
CREATE OR REPLACE FUNCTION app.purge_personal_rsvp_guests(p_days integer)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_n integer;
BEGIN
  IF p_days IS NULL OR p_days < 1 THEN
    RAISE EXCEPTION 'purge_personal_rsvp_guests: p_days must be at least 1' USING ERRCODE = '22023';
  END IF;
  WITH due AS (
    SELECT e."id", e."organizationId"
      FROM public."Event" e
      JOIN public."Organization" o ON o."id" = e."organizationId"
     WHERE o."kind" = 'PERSONAL'
       AND e."rsvpGuestsPurgedAt" IS NULL
       AND e."endsAt" < app.utc_now() - make_interval(days => p_days)
  ),
  gone AS (
    DELETE FROM public."EventRegistration" r USING due
     WHERE r."eventId" = due."id" AND r."organizationId" = due."organizationId"
  ),
  stamped AS (
    UPDATE public."Event" e SET "rsvpGuestsPurgedAt" = app.utc_now(), "rsvpEnabled" = false
      FROM due WHERE e."id" = due."id"
    RETURNING 1
  )
  SELECT count(*) INTO v_n FROM stamped;
  RETURN v_n;
END $$;
REVOKE ALL ON FUNCTION app.purge_personal_rsvp_guests(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.purge_personal_rsvp_guests(integer) TO app_service;
