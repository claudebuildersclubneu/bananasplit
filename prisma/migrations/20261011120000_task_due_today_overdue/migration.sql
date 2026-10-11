-- Due-date reminders on the due date itself and the morning after it
-- (src/server/tasks/reminders.ts). Own migration: an added enum value is
-- unusable until its transaction commits, and nothing here uses them.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TASK_DUE_TODAY';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_OVERDUE';
