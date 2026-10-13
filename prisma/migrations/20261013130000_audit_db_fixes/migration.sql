-- Database fixes from the audit: two missing indexes, invitations to a club
-- scheduled for deletion, set-based read policies on a task's children, and
-- task ranks that sort byte by byte. No table, column or grant is added or
-- removed; every function keeps its grants.

-- ---------------------------------------------------------------------------
-- 1. Indexes
-- ---------------------------------------------------------------------------

-- The bell lists a person's 20 newest notifications on every poll
-- (WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 20). With only
-- ("userId", "readAt") to go on, Postgres read every notification the
-- person has and sorted them; this index reads the newest twenty and stops,
-- so the per-row read policy runs twenty times instead of once per row.
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- An email-verification link is looked up by its token alone
-- (src/server/email/verification.ts). The primary key leads with
-- "identifier", so every lookup was a sequential scan.
CREATE INDEX "VerificationToken_token_idx" ON "VerificationToken"("token");

-- ---------------------------------------------------------------------------
-- 2. Invitations to a club scheduled for deletion
-- ---------------------------------------------------------------------------

-- The onboarding Join card offered invites to a club that is being deleted,
-- and accepting one failed only at the last step (acceptInvitation answers
-- org_inactive). The list now leaves such a club out. Same signature and
-- return type, so CREATE OR REPLACE keeps the app_user grant.
CREATE OR REPLACE FUNCTION app.pending_invitations_for_me()
RETURNS TABLE ("id" text, "organizationId" text, "role" "Role", "expiresAt" timestamp(3),
               "orgName" text, "orgSlug" text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT i."id", i."organizationId", i."role", i."expiresAt", o."name", o."slug"
    FROM public."Invitation" i
    JOIN public."Organization" o ON o."id" = i."organizationId"
    JOIN public."User" u ON u."id" = app.user_id()
   WHERE u."emailVerified" IS NOT NULL
     AND i."email" = u."email" AND i."acceptedAt" IS NULL AND i."expiresAt" > app.utc_now()
     AND o."deletedAt" IS NULL
$$;

-- The emailed link still finds its invitation, and now says whether the
-- club is being deleted ("orgDeleted"), so /invite/[token] can say so up
-- front instead of offering a Join button that cannot work (the same shape
-- as app.org_by_join_code's "deleted"). A new output column changes the
-- return type, which CREATE OR REPLACE cannot do: drop and recreate it with
-- the grants it had (0B: EXECUTE to app_service only).
DROP FUNCTION app.invitation_by_token_hash(text);
CREATE FUNCTION app.invitation_by_token_hash(p_hash text)
RETURNS TABLE ("id" text, "organizationId" text, "email" text, "role" "Role",
               "expiresAt" timestamp(3), "acceptedAt" timestamp(3), "invitedById" text,
               "orgName" text, "orgSlug" text, "orgDeleted" boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT i."id", i."organizationId", i."email", i."role", i."expiresAt", i."acceptedAt", i."invitedById",
         o."name", o."slug", o."deletedAt" IS NOT NULL
    FROM public."Invitation" i JOIN public."Organization" o ON o."id" = i."organizationId"
   WHERE i."token" = p_hash
$$;
REVOKE ALL ON FUNCTION app.invitation_by_token_hash(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.invitation_by_token_hash(text) TO app_service;

-- ---------------------------------------------------------------------------
-- 3. A task's children are read through "Task"'s own read policy
-- ---------------------------------------------------------------------------

-- C4 (20260924140000_c4_task_visibility) gated the app_user SELECT policies
-- on TaskAssignee, TaskLabel, TaskComment, TaskMention and TaskActivity with
-- app.can_read_task("taskId"): a SECURITY DEFINER call for every row, which
-- Postgres can neither inline nor batch (about 18 microseconds a row; an
-- org-wide read of 10,000 activity rows took 200 ms).
--
-- Each policy now asks whether the row's task is one the caller can SELECT
-- from "Task", under "Task"'s own app_user policy. That policy is the same
-- rule as app.can_read_task, word for word: the task is in
-- app.member_org_id(), and it is ORG, or the caller owns it, created it, is
-- an OWNER/ADMIN, or collaborates on it (the one branch that still calls
-- app.can_read_task, and only for a private task). So who reads what is
-- unchanged, and a child can never be more visible than its task.
--
-- Written as a correlated EXISTS, the planner chooses per query: a probe of
-- "Task"'s (organizationId, id) index per row for a few rows (one task's
-- comments), or one pass over the org's readable tasks into a hash table for
-- many (an org-wide read). No recursion: "Task"'s policy reads TaskAssignee
-- only inside the definer function, without RLS.
--
-- INSERT keeps app.can_read_task: it checks one new row at a time. The
-- Notification read policy is left as 20261013120000_notification_task_read
-- wrote it (it has no org in context, so "Task"'s policy would hide every
-- task notification).
DROP POLICY IF EXISTS app_user_select ON "TaskAssignee";
CREATE POLICY app_user_select ON "TaskAssignee" FOR SELECT TO app_user
  USING ("organizationId" = (SELECT app.member_org_id())
         AND EXISTS (SELECT 1 FROM "Task" t WHERE t."id" = "TaskAssignee"."taskId"));

DROP POLICY IF EXISTS app_user_select ON "TaskLabel";
CREATE POLICY app_user_select ON "TaskLabel" FOR SELECT TO app_user
  USING ("organizationId" = (SELECT app.member_org_id())
         AND EXISTS (SELECT 1 FROM "Task" t WHERE t."id" = "TaskLabel"."taskId"));

DROP POLICY IF EXISTS app_user_select ON "TaskComment";
CREATE POLICY app_user_select ON "TaskComment" FOR SELECT TO app_user
  USING ("organizationId" = (SELECT app.member_org_id())
         AND EXISTS (SELECT 1 FROM "Task" t WHERE t."id" = "TaskComment"."taskId"));

DROP POLICY IF EXISTS app_user_select ON "TaskMention";
CREATE POLICY app_user_select ON "TaskMention" FOR SELECT TO app_user
  USING ("organizationId" = (SELECT app.member_org_id())
         AND EXISTS (SELECT 1 FROM "Task" t WHERE t."id" = "TaskMention"."taskId"));

DROP POLICY IF EXISTS app_user_select ON "TaskActivity";
CREATE POLICY app_user_select ON "TaskActivity" FOR SELECT TO app_user
  USING ("organizationId" = (SELECT app.member_org_id())
         AND EXISTS (SELECT 1 FROM "Task" t WHERE t."id" = "TaskActivity"."taskId"));

-- ---------------------------------------------------------------------------
-- 4. Task ranks sort byte by byte
-- ---------------------------------------------------------------------------

-- "rank" holds fractional-indexing keys ("Zz" < "a0" < "a0V" < "a1"), which
-- are generated in byte order. Under the database's default collation
-- ORDER BY "rank" folds case, so "Zz" sorted after "a1" in the table view
-- and in a task's subtask list. COLLATE "C" makes every plain ORDER BY
-- "rank" byte order. Only the collation changes (no table rewrite), and no
-- index includes the column. Prisma's schema cannot express a collation;
-- prisma/schema.prisma notes it on the field.
ALTER TABLE "Task" ALTER COLUMN "rank" TYPE TEXT COLLATE "C";
