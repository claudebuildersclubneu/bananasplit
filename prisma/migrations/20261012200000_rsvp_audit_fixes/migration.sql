-- RSVP fixes from the audit (docs/features/rsvp.md).
--
-- 1. EventRegistration.queuedAt: when the guest last joined the going list
--    or the waitlist. The waitlist moves up in this order, and a waitlisted
--    guest's place in line is counted by it, so someone who cancels and
--    signs up again goes to the back of the line instead of keeping their
--    first sign-up's place (that row keeps its createdAt). Existing rows
--    start from createdAt.
-- 2. An index on invitedById: deleting a sign-up clears the invites it
--    brought (ON DELETE SET NULL), and a guest's page counts who joined
--    through their link on every view.

-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN     "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "EventRegistration" SET "queuedAt" = "createdAt";

-- CreateIndex
CREATE INDEX "EventRegistration_organizationId_eventId_status_queuedAt_idx" ON "EventRegistration"("organizationId", "eventId", "status", "queuedAt");

-- CreateIndex
CREATE INDEX "EventRegistration_invitedById_idx" ON "EventRegistration"("invitedById");
