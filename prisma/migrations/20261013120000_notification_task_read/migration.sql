-- The notification bell reads task notifications again.
--
-- The bell runs in withUserTx: app_user with a user and NO org, because it
-- lists the person's notifications across every club they belong to. C4
-- (20260924140000_c4_task_visibility) gated each notification that points
-- at a task on app.can_read_task(taskId), which compares the task's org
-- with app.member_org_id(). Without an org that is NULL, so every task
-- notification was hidden from the bell, from its unread count and from
-- "Mark all read" (an UPDATE that filters on readAt also needs the SELECT
-- policy to pass).
--
-- The fix asks the same question about the task's OWN org instead of the
-- org in context. Who may read a task is unchanged, word for word:
--
--   * the reader must be a member of the task's org;
--   * an ORG task: every member;
--   * a PRIVATE task: its owner, its creator, a collaborator, or an
--     OWNER/ADMIN of that org.
--
-- Under an org context the answer for that org's tasks is exactly what
-- app.can_read_task() gives. What changes is only that a notification about
-- a task in one of the person's other clubs is no longer hidden because a
-- different club happens to be in context; it is still hidden whenever the
-- person could not open the task in its own club. Nothing else reads
-- "Notification" as app_user, and app_service is unchanged.

-- SECURITY DEFINER for the same reason as app.can_read_task(): it reads
-- "Task", "TaskAssignee" and "Membership" without RLS, so the policy does
-- not depend on an org context and cannot recurse. Every branch is pinned
-- to app.user_id(), so it only ever answers about the caller.
CREATE OR REPLACE FUNCTION app.can_read_task_in_its_org(p_task text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Task" t
      JOIN public."Membership" m
        ON m."organizationId" = t."organizationId"
       AND m."userId" = app.user_id()
     WHERE t."id" = p_task
       AND (t."visibility" = 'ORG'
            OR t."ownerId" = app.user_id()
            OR t."createdById" = app.user_id()
            OR m."role" IN ('OWNER', 'ADMIN')
            OR EXISTS (SELECT 1 FROM public."TaskAssignee" ta
                        WHERE ta."taskId" = t."id"
                          AND ta."userId" = app.user_id()))
  )
$$;
REVOKE ALL ON FUNCTION app.can_read_task_in_its_org(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.can_read_task_in_its_org(text) TO app_user;

COMMENT ON FUNCTION app.can_read_task_in_its_org(text) IS
  'May the current user read this task as a member of the task''s own org? The C4 rule (ORG: any member; PRIVATE: owner, creator, collaborator or OWNER/ADMIN) without needing an org context. Used by the Notification read policy.';

DROP POLICY IF EXISTS app_user_select ON "Notification";
CREATE POLICY app_user_select ON "Notification" FOR SELECT TO app_user
  USING ("userId" = (SELECT app.user_id())
         AND ("taskId" IS NULL OR app.can_read_task_in_its_org("taskId")));
