-- A notice to a member when a note is shared with them
-- (src/server/notes/sharing.ts). Own migration: an added enum value is
-- unusable until its transaction commits, and nothing here uses it.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'NOTE_SHARED';
