-- The Personal dashboard's "Your RSVPs" (docs/features/personal-and-clubs.md):
-- the public RSVP pages the caller signed up for, in any space. Sign-ups are
-- readable in the suite only by the hosting space's owners and admins (RLS on
-- EventRegistration), and a guest is usually not a member of the host's space
-- at all, so this is an enumerated SECURITY DEFINER lookup for app_user, like
-- app.pending_invitations_for_me: it returns only the caller's own sign-ups
-- (by user id, or by their VERIFIED stored email), going or waitlisted, for
-- live pages that haven't ended, and only what the guest's own ticket page
-- already shows them (no other guest, no email or phone).

-- CreateIndex: the email match (sign-ups made signed out).
CREATE INDEX "EventRegistration_email_idx" ON "EventRegistration"("email");

CREATE OR REPLACE FUNCTION app.my_rsvp_registrations(p_limit integer)
RETURNS TABLE ("registrationId" text, "status" "RegistrationStatus", "ticketCode" text,
               "eventId" text, "title" text, "startsAt" timestamp(3), "endsAt" timestamp(3),
               "allDay" boolean, "rsvpSlug" text, "spaceKind" "OrgKind", "spaceName" text,
               "spaceTimezone" text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT r."id", r."status", r."ticketCode", e."id", e."title", e."startsAt", e."endsAt",
         e."allDay", e."rsvpSlug", o."kind", o."name", o."timezone"
    FROM public."User" u
    JOIN public."EventRegistration" r
      ON r."userId" = u."id"
      OR (u."emailVerified" IS NOT NULL AND r."email" = u."email")
    JOIN public."Event" e ON e."id" = r."eventId" AND e."organizationId" = r."organizationId"
    JOIN public."Organization" o ON o."id" = e."organizationId"
   WHERE u."id" = app.user_id()
     AND r."status" IN ('GOING', 'WAITLIST')
     AND e."rsvpEnabled" AND e."rsvpSlug" IS NOT NULL
     AND e."deletedAt" IS NULL AND e."mergedIntoId" IS NULL
     AND o."deletedAt" IS NULL
     AND e."endsAt" > app.utc_now()
   ORDER BY e."startsAt", r."id"
   LIMIT least(greatest(coalesce(p_limit, 10), 1), 50)
$$;
REVOKE ALL ON FUNCTION app.my_rsvp_registrations(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.my_rsvp_registrations(integer) TO app_user;
