-- Public RSVP pages (docs/features/rsvp.md). An owner or admin turns on an
-- event's RSVP page; anyone with its link (/e/{rsvpSlug}) signs up with a
-- name, an email and a phone number, member or not. Settings live on Event
-- (capacity, waitlist, directions, what the page hides, its background and
-- cover); the sign-ups are EventRegistration.

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('GOING', 'WAITLIST', 'CANCELLED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "locationDetails" TEXT,
ADD COLUMN     "rsvpBackground" TEXT NOT NULL DEFAULT 'banana',
ADD COLUMN     "rsvpCapacity" INTEGER,
ADD COLUMN     "rsvpClosed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rsvpCover" JSONB,
ADD COLUMN     "rsvpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rsvpHideCount" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rsvpHideGuests" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rsvpHideLocation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rsvpSlug" TEXT,
ADD COLUMN     "rsvpWaitlist" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'GOING',
    "userId" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "reminderDaySentAt" TIMESTAMP(3),
    "reminderHourSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventRegistration_organizationId_eventId_status_createdAt_idx" ON "EventRegistration"("organizationId", "eventId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "EventRegistration_userId_idx" ON "EventRegistration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_email_key" ON "EventRegistration"("eventId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_organizationId_id_key" ON "EventRegistration"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Event_rsvpSlug_key" ON "Event"("rsvpSlug");

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_organizationId_eventId_fkey" FOREIGN KEY ("organizationId", "eventId") REFERENCES "Event"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- ---------------------------------------------------------------------------
-- Hand-written: checks, RLS, grants and the public page's lookup.
-- ---------------------------------------------------------------------------

ALTER TABLE "Event" ADD CONSTRAINT "Event_rsvpSlug_format"
  CHECK ("rsvpSlug" IS NULL OR "rsvpSlug" ~ '^[a-z0-9]{8}$');
ALTER TABLE "Event" ADD CONSTRAINT "Event_rsvpCapacity_range"
  CHECK ("rsvpCapacity" IS NULL OR ("rsvpCapacity" >= 1 AND "rsvpCapacity" <= 100000));
ALTER TABLE "Event" ADD CONSTRAINT "Event_locationDetails_length"
  CHECK ("locationDetails" IS NULL OR char_length("locationDetails") <= 1000);
ALTER TABLE "Event" ADD CONSTRAINT "Event_rsvpBackground_format"
  CHECK ("rsvpBackground" ~ '^[a-z-]{1,24}$');
-- A page that was ever turned on keeps its code, so a shared link survives
-- turning the page off and on again.
ALTER TABLE "Event" ADD CONSTRAINT "Event_rsvpEnabled_needs_slug"
  CHECK (NOT "rsvpEnabled" OR "rsvpSlug" IS NOT NULL);

ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_name_length"
  CHECK (char_length(btrim("name")) >= 1 AND char_length("name") <= 100);
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_email_format"
  CHECK (char_length("email") <= 254 AND "email" = lower("email") AND "email" LIKE '%_@_%');
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_phone_format"
  CHECK ("phone" ~ '^\+?[0-9]{7,15}$');

-- EventRegistration holds guests' emails and phone numbers. In the suite
-- only owners and admins (who run events) see or change sign-ups; members
-- see the counts on the public page like anyone else. The public page and
-- the reminder jobs run on the service path, scoped to the event's org.
ALTER TABLE "EventRegistration" ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_user_select ON "EventRegistration" FOR SELECT TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()));
CREATE POLICY app_user_insert ON "EventRegistration" FOR INSERT TO app_user
  WITH CHECK ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()));
CREATE POLICY app_user_update ON "EventRegistration" FOR UPDATE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()))
  WITH CHECK ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()));
CREATE POLICY app_user_delete ON "EventRegistration" FOR DELETE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()));
CREATE POLICY app_service_select ON "EventRegistration" FOR SELECT TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_insert ON "EventRegistration" FOR INSERT TO app_service
  WITH CHECK ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_update ON "EventRegistration" FOR UPDATE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()))
  WITH CHECK ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_delete ON "EventRegistration" FOR DELETE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));

REVOKE ALL ON "EventRegistration" FROM PUBLIC, app_user, app_service, app_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON "EventRegistration" TO app_user, app_service;

-- The org and event behind a live RSVP page's code, for /e/[slug] (which
-- then opens withSystemOrgTx(orgId), seeing only that org's rows). Nothing
-- for a page that is off, or an event deleted or merged away.
CREATE OR REPLACE FUNCTION app.rsvp_page(p_slug text)
RETURNS TABLE ("organizationId" text, "eventId" text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT e."organizationId", e."id" FROM public."Event" e
   WHERE e."rsvpSlug" = p_slug AND e."rsvpEnabled"
     AND e."deletedAt" IS NULL AND e."mergedIntoId" IS NULL
$$;
REVOKE ALL ON FUNCTION app.rsvp_page(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.rsvp_page(text) TO app_service;
