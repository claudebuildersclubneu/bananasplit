-- A guest's Instagram handle on an RSVP sign-up (optional). The page shows
-- it as a link next to their name in the guest list, so friends can find
-- each other; the guest chooses to share it by typing it in.

-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN "instagram" TEXT;

-- Hand-written: the handle as Instagram allows it (letters, digits, dots,
-- underscores; up to 30), stored without the @.
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_instagram_format"
  CHECK ("instagram" IS NULL OR "instagram" ~ '^[A-Za-z0-9._]{1,30}$');
