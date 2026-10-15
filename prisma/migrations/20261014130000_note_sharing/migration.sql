-- Note sharing (docs/features/notes-sharing.md): a note can be shared with
-- particular members as viewers or editors, and a club note can let every
-- member edit it, not only read it.
--
--   Note.memberCanEdit  on an ORGANIZATION note, every member may edit
--   NoteShare           one member a note is shared with, VIEWER or EDITOR;
--                       a PRIVATE note is seen by its author and its shares
--
-- Who does what (src/lib/notes/access.ts says the same for the app):
--   see     ORGANIZATION, the author, or anyone it is shared with
--   edit    the author; an EDITOR share; on an ORGANIZATION note, every
--           member when memberCanEdit, else owners and admins
--   share   the author; owners and admins on an ORGANIZATION note
--           (visibility, memberCanEdit and the NoteShare rows)
--   delete  unchanged: the author, or an owner/admin on an ORGANIZATION note

-- CreateEnum
CREATE TYPE "NoteShareRole" AS ENUM ('VIEWER', 'EDITOR');

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "memberCanEdit" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "NoteShare" (
    "organizationId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "NoteShareRole" NOT NULL DEFAULT 'VIEWER',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteShare_pkey" PRIMARY KEY ("noteId","userId")
);

-- CreateIndex
CREATE INDEX "NoteShare_organizationId_userId_idx" ON "NoteShare"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Note_organizationId_id_key" ON "Note"("organizationId", "id");

-- AddForeignKey
ALTER TABLE "NoteShare" ADD CONSTRAINT "NoteShare_organizationId_noteId_fkey" FOREIGN KEY ("organizationId", "noteId") REFERENCES "Note"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteShare" ADD CONSTRAINT "NoteShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteShare" ADD CONSTRAINT "NoteShare_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- ---------------------------------------------------------------------------
-- Hand-written: helpers, triggers, RLS and grants.
-- ---------------------------------------------------------------------------

-- The caller's share on one note of their member org ('VIEWER', 'EDITOR'),
-- or NULL. Runs as the table owner, so the Note policies can ask it without
-- recursing into NoteShare's own policies.
CREATE OR REPLACE FUNCTION app.note_share_role(p_note text) RETURNS "NoteShareRole"
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT s."role" FROM public."NoteShare" s
   WHERE s."noteId" = p_note
     AND s."userId" = app.user_id()
     AND s."organizationId" = app.member_org_id()
$$;

-- Whether the caller may see one note (the Note SELECT policy, for the
-- NoteShare policies): a club note, their own, or one shared with them.
CREATE OR REPLACE FUNCTION app.can_view_note(p_note text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT coalesce((
    SELECT n."visibility" = 'ORGANIZATION'
           OR n."authorId" = app.user_id()
           OR app.note_share_role(n."id") IS NOT NULL
      FROM public."Note" n
     WHERE n."id" = p_note AND n."organizationId" = app.member_org_id()
  ), false)
$$;

-- Whether the caller may change who sees and edits one note: its author,
-- or an owner/admin when it is a club note.
CREATE OR REPLACE FUNCTION app.can_share_note(p_note text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT coalesce((
    SELECT n."authorId" = app.user_id()
           OR (n."visibility" = 'ORGANIZATION' AND app.is_org_admin())
      FROM public."Note" n
     WHERE n."id" = p_note AND n."organizationId" = app.member_org_id()
  ), false)
$$;

REVOKE ALL ON FUNCTION app.note_share_role(text), app.can_view_note(text), app.can_share_note(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.note_share_role(text), app.can_view_note(text), app.can_share_note(text) TO app_user;

-- An editor who may not share (an EDITOR share, or any member on a note
-- every member may edit) writes the body, title, event and folder, never
-- who sees it or whether it is in the trash: visibility, memberCanEdit and
-- deletedAt change only for the author, or an owner/admin on a club note
-- (the same people the DELETE policy lets through). The service path
-- (jobs) is not limited.
CREATE OR REPLACE FUNCTION app.note_sharing_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF current_user <> 'app_user' THEN
    RETURN NEW;
  END IF;
  IF (NEW."visibility" IS DISTINCT FROM OLD."visibility"
      OR NEW."memberCanEdit" IS DISTINCT FROM OLD."memberCanEdit"
      OR NEW."deletedAt" IS DISTINCT FROM OLD."deletedAt")
     AND NOT (OLD."authorId" = app.user_id()
              OR (OLD."visibility" = 'ORGANIZATION' AND app.is_org_admin())) THEN
    RAISE EXCEPTION 'Note: only its author or an admin changes who can see it, or deletes it'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.note_sharing_guard() FROM PUBLIC;
CREATE TRIGGER note_sharing_guard BEFORE UPDATE OF "visibility", "memberCanEdit", "deletedAt" ON "Note"
  FOR EACH ROW EXECUTE FUNCTION app.note_sharing_guard();

-- A share stays on its note and with its person; it keeps who made it.
CREATE TRIGGER immutable_cols BEFORE UPDATE OF "noteId", "userId", "createdById" ON "NoteShare"
  FOR EACH ROW EXECUTE FUNCTION app.immutable_columns('noteId', 'userId', 'createdById');

-- ---- 6.8 Note, now with shares --------------------------------------------
DROP POLICY app_user_select ON "Note";
DROP POLICY app_user_update ON "Note";
DROP POLICY app_user_delete ON "Note";

CREATE POLICY app_user_select ON "Note" FOR SELECT TO app_user
  USING ("organizationId" = (SELECT app.member_org_id())
         AND ("visibility" = 'ORGANIZATION'
              OR "authorId" = (SELECT app.user_id())
              OR app.note_share_role("id") IS NOT NULL));
-- The row must stay visible to the writer, as before (an admin cannot make
-- someone else's club note private out from under themselves).
CREATE POLICY app_user_update ON "Note" FOR UPDATE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id())
         AND ("authorId" = (SELECT app.user_id())
              OR ("visibility" = 'ORGANIZATION' AND ("memberCanEdit" OR (SELECT app.is_org_admin())))
              OR app.note_share_role("id") = 'EDITOR'))
  WITH CHECK ("organizationId" = (SELECT app.member_org_id())
              AND ("visibility" = 'ORGANIZATION'
                   OR "authorId" = (SELECT app.user_id())
                   OR app.note_share_role("id") IS NOT NULL));
-- Unchanged: the author, or an owner/admin on a club note.
CREATE POLICY app_user_delete ON "Note" FOR DELETE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id())
         AND ("authorId" = (SELECT app.user_id())
              OR ("visibility" = 'ORGANIZATION' AND (SELECT app.is_org_admin()))));

-- ---- NoteShare --------------------------------------------------------------
-- Whoever can see the note sees who it is shared with (the share dialog),
-- and everyone sees their own shares. The author (or an owner/admin, on a
-- club note) adds, changes and removes them, only for members of the org,
-- recording themselves as the one who shared; anyone can take themselves
-- off a note shared with them.
ALTER TABLE "NoteShare" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_user_select ON "NoteShare" FOR SELECT TO app_user
  USING ("organizationId" = (SELECT app.member_org_id())
         AND ("userId" = (SELECT app.user_id()) OR app.can_view_note("noteId")));
CREATE POLICY app_user_insert ON "NoteShare" FOR INSERT TO app_user
  WITH CHECK ("organizationId" = (SELECT app.member_org_id())
              AND app.can_share_note("noteId")
              AND "createdById" = (SELECT app.user_id())
              AND EXISTS (SELECT 1 FROM "Membership" m
                           WHERE m."userId" = "NoteShare"."userId"
                             AND m."organizationId" = "NoteShare"."organizationId"));
CREATE POLICY app_user_update ON "NoteShare" FOR UPDATE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND app.can_share_note("noteId"))
  WITH CHECK ("organizationId" = (SELECT app.member_org_id()) AND app.can_share_note("noteId"));
CREATE POLICY app_user_delete ON "NoteShare" FOR DELETE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id())
         AND ("userId" = (SELECT app.user_id()) OR app.can_share_note("noteId")));
CREATE POLICY app_service_select ON "NoteShare" FOR SELECT TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_insert ON "NoteShare" FOR INSERT TO app_service
  WITH CHECK ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_update ON "NoteShare" FOR UPDATE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()))
  WITH CHECK ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_delete ON "NoteShare" FOR DELETE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));

REVOKE ALL ON "NoteShare" FROM PUBLIC, app_user, app_service, app_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON "NoteShare" TO app_user, app_service;

-- The manifest's tenant-only-write allowlist gains NoteShare:INSERT,
-- NoteShare:UPDATE and NoteShare:DELETE (unchanged otherwise from
-- 20261012170000_club_databases).
CREATE OR REPLACE FUNCTION app.security_manifest()
RETURNS TABLE (check_name text, object_name text)
LANGUAGE sql STABLE SET search_path = pg_catalog, pg_temp SET jit = off
AS $$
  WITH RECURSIVE rt AS (
    SELECT r.rolname, r.oid FROM pg_roles r
     WHERE r.rolname IN ('app_user', 'app_service', 'app_auth')
  ),
  nsp AS (
    SELECT n.oid, n.nspname FROM pg_namespace n
     WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
       AND n.nspname !~ '^pg_(toast_)?temp_'
  ),
  -- Schemas a runtime role can look names up in.
  reach_nsp AS (
    SELECT nsp.oid FROM nsp
     WHERE EXISTS (SELECT 1 FROM rt WHERE has_schema_privilege(rt.oid, nsp.oid, 'USAGE'))
  ),
  -- Every object a runtime role can get to, by name or through a reachable
  -- object (see the migration header).
  reached (classid, objid) AS (
    SELECT 'pg_class'::regclass::oid, c.oid FROM pg_class c
     WHERE c.relnamespace IN (SELECT oid FROM reach_nsp)
    UNION
    SELECT 'pg_proc'::regclass::oid, p.oid FROM pg_proc p
     WHERE p.pronamespace IN (SELECT oid FROM reach_nsp)
    UNION
    SELECT 'pg_type'::regclass::oid, t.oid FROM pg_type t
     WHERE t.typnamespace IN (SELECT oid FROM reach_nsp)
    UNION
    SELECT 'pg_operator'::regclass::oid, o.oid FROM pg_operator o
     WHERE o.oprnamespace IN (SELECT oid FROM reach_nsp)
    UNION
    SELECT 'pg_cast'::regclass::oid, k.oid FROM pg_cast k
    UNION
    SELECT x.classid, x.objid
      FROM reached r
     CROSS JOIN LATERAL (
       -- what it depends on
       SELECT d.refclassid, d.refobjid FROM pg_depend d
        WHERE d.classid = r.classid AND d.objid = r.objid
          AND d.refclassid <> 'pg_namespace'::regclass
       UNION ALL
       -- its parts
       SELECT d.classid, d.objid FROM pg_depend d
        WHERE d.refclassid = r.classid AND d.refobjid = r.objid
          AND d.deptype IN ('a', 'i')
     ) x (classid, objid)
  ),
  ext AS (
    SELECT d.objid, d.classid FROM pg_depend d WHERE d.deptype = 'e'
  ),
  -- Every relation, for the checks that stay global.
  rel_all AS (
    SELECT c.oid, c.relkind, c.relrowsecurity, c.reloptions,
           format('%I.%I', n.nspname, c.relname) AS fq
      FROM pg_class c JOIN nsp n ON n.oid = c.relnamespace
     WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
       AND NOT (n.nspname = 'public' AND c.relname = '_prisma_migrations')
       AND NOT EXISTS (SELECT 1 FROM ext WHERE ext.classid = 'pg_class'::regclass AND ext.objid = c.oid)
  ),
  -- The reachable ones, for the object checks.
  rel AS (
    SELECT rel_all.* FROM rel_all
     WHERE EXISTS (SELECT 1 FROM reached
                    WHERE reached.classid = 'pg_class'::regclass AND reached.objid = rel_all.oid)
  ),
  readable AS (
    SELECT rel.oid, rt.rolname FROM rel, rt
     WHERE has_any_column_privilege(rt.oid, rel.oid, 'SELECT')
        OR has_any_column_privilege(rt.oid, rel.oid, 'INSERT')
        OR has_any_column_privilege(rt.oid, rel.oid, 'UPDATE')
        OR has_table_privilege(rt.oid, rel.oid, 'DELETE')
  ),
  cmd AS (SELECT unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) AS cmd),
  granted AS (
    SELECT rel.oid, rel.fq, rt.rolname, cmd.cmd FROM rel, rt, cmd
     WHERE rel.relkind IN ('r', 'p')
       AND CASE WHEN cmd.cmd = 'DELETE' THEN has_table_privilege(rt.oid, rel.oid, 'DELETE')
                ELSE has_any_column_privilege(rt.oid, rel.oid, cmd.cmd) END
  ),
  fn_all AS (
    SELECT p.oid, p.prosecdef, p.proconfig, p.proowner,
           format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) AS fq,
           EXISTS (SELECT 1 FROM reached
                    WHERE reached.classid = 'pg_proc'::regclass AND reached.objid = p.oid) AS reachable,
           EXISTS (SELECT 1 FROM pg_event_trigger e WHERE e.evtfoid = p.oid) AS fires_on_ddl
      FROM pg_proc p JOIN nsp n ON n.oid = p.pronamespace
     WHERE NOT EXISTS (SELECT 1 FROM ext WHERE ext.classid = 'pg_proc'::regclass AND ext.objid = p.oid)
  ),
  fn AS (
    SELECT * FROM fn_all WHERE fn_all.reachable
  )
  SELECT 'rls_disabled', fq FROM rel WHERE relkind IN ('r', 'p') AND NOT relrowsecurity
  UNION ALL
  SELECT 'view_not_invoker', rel.fq FROM rel
   WHERE rel.relkind = 'v'
     AND EXISTS (SELECT 1 FROM readable WHERE readable.oid = rel.oid)
     AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(rel.reloptions, ARRAY[]::text[])) o
                      WHERE lower(o) IN ('security_invoker=true', 'security_invoker=on',
                                         'security_invoker=1', 'security_invoker=yes'))
  UNION ALL
  SELECT 'matview_or_foreign_granted', rel.fq FROM rel
   WHERE rel.relkind IN ('m', 'f') AND EXISTS (SELECT 1 FROM readable WHERE readable.oid = rel.oid)
  UNION ALL
  SELECT 'policy_gap', g.fq || ':' || g.rolname || ':' || g.cmd FROM granted g
   WHERE NOT EXISTS (
     SELECT 1 FROM pg_policy pol
      WHERE pol.polrelid = g.oid
        AND (pol.polroles = '{0}' OR (SELECT r.oid FROM pg_roles r WHERE r.rolname = g.rolname) = ANY (pol.polroles))
        AND (pol.polcmd = '*' OR pol.polcmd = CASE g.cmd WHEN 'SELECT' THEN 'r' WHEN 'INSERT' THEN 'a'
                                                         WHEN 'UPDATE' THEN 'w' ELSE 'd' END))
  UNION ALL
  SELECT 'permissive_policy', p.schemaname || '.' || p.tablename || ':' || p.policyname FROM pg_policies p
   WHERE p.schemaname IN (SELECT nspname FROM nsp)
     AND EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                   JOIN reached ON reached.classid = 'pg_class'::regclass AND reached.objid = c.oid
                  WHERE n.nspname = p.schemaname AND c.relname = p.tablename)
     AND (((p.roles && ARRAY['app_user', 'app_service']::name[])
           AND (p.qual = 'true' OR p.with_check = 'true' OR p.cmd = 'ALL'))
       OR (p.cmd = 'ALL' AND NOT (p.roles <@ ARRAY['app_auth']::name[])))
  UNION ALL
  SELECT 'dangerous_privilege', rel_all.fq || ':' || rt.rolname || ':' || pr.priv
    FROM rel_all, rt, (VALUES ('TRUNCATE'), ('TRIGGER'), ('REFERENCES')) pr(priv)
   WHERE CASE pr.priv WHEN 'REFERENCES' THEN has_any_column_privilege(rt.oid, rel_all.oid, 'REFERENCES')
                      ELSE has_table_privilege(rt.oid, rel_all.oid, pr.priv) END
  UNION ALL
  SELECT 'public_execute', fn.fq FROM fn WHERE has_function_privilege('public', fn.oid, 'EXECUTE')
  UNION ALL
  SELECT 'definer_search_path', fn_all.fq FROM fn_all
   WHERE (fn_all.reachable OR fn_all.fires_on_ddl)
     AND fn_all.prosecdef
     AND NOT coalesce(fn_all.proconfig @> ARRAY['search_path=pg_catalog, public, pg_temp'], false)
  UNION ALL
  SELECT 'temp_privilege', rt.rolname::text FROM rt
   WHERE has_database_privilege(rt.oid, current_database(), 'TEMPORARY')
  UNION ALL
  SELECT 'schema_create', nsp.nspname || ':' || rt.rolname FROM nsp, rt
   WHERE has_schema_privilege(rt.oid, nsp.oid, 'CREATE')
  UNION ALL
  SELECT 'role_attribute', r.rolname::text FROM pg_roles r JOIN rt ON rt.oid = r.oid
   WHERE r.rolsuper OR r.rolbypassrls OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication
  UNION ALL
  SELECT 'role_membership', rt.rolname || ' in ' || g.rolname FROM pg_auth_members m
    JOIN rt ON rt.oid = m.member JOIN pg_roles g ON g.oid = m.roleid
  UNION ALL
  SELECT 'owns_objects', rt.rolname::text FROM rt
   WHERE EXISTS (SELECT 1 FROM pg_class c WHERE c.relowner = rt.oid)
      OR EXISTS (SELECT 1 FROM pg_proc p WHERE p.proowner = rt.oid)
      OR EXISTS (SELECT 1 FROM pg_type t WHERE t.typowner = rt.oid)
      OR EXISTS (SELECT 1 FROM pg_namespace n WHERE n.nspowner = rt.oid)

  UNION ALL
  -- Tenant-only writes (B9, unchanged). A policy that lets app_user INSERT,
  -- UPDATE or DELETE with nothing but an organizationId test is a tenant
  -- check, not a permission check: every member of the org may do it, and
  -- the app layer is the only thing standing in the way. That is right for
  -- the tables below, where members legitimately write; anywhere else it is
  -- a missing role predicate, and this reports it until the table is
  -- reviewed and added here in a migration. Label shipped without one:
  -- label management has always been admin-only in the app, and any member
  -- could delete every label in the org straight through the database.
  SELECT 'tenant_only_write', p.tablename || ':' || p.cmd FROM pg_policies p
   WHERE p.schemaname = 'public'
     AND p.roles && ARRAY['app_user']::name[]
     AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE')
     AND coalesce(p.qual, '') || coalesce(p.with_check, '') NOT LIKE '%is_org_admin%'
     AND coalesce(p.qual, '') || coalesce(p.with_check, '') NOT LIKE '%is_org_owner%'
     AND coalesce(p.qual, '') || coalesce(p.with_check, '') NOT LIKE '%is_finance%'
     AND (p.tablename || ':' || p.cmd) <> ALL (ARRAY[
       -- Tasks are the shared work surface: any member files, edits and
       -- closes one (the edit-authorization matrix is the app's, and the
       -- self-assign carve-out depends on it). INSERT pins createdById.
       'Task:INSERT', 'Task:UPDATE', 'Task:DELETE',
       -- Collaborators and labels on a task move with the task itself.
       'TaskAssignee:INSERT', 'TaskAssignee:UPDATE', 'TaskAssignee:DELETE',
       'TaskLabel:INSERT', 'TaskLabel:UPDATE', 'TaskLabel:DELETE',
       -- Mentions are a side effect of writing a description or a comment;
       -- INSERT pins mentionedById to the actor.
       'TaskMention:INSERT', 'TaskMention:UPDATE', 'TaskMention:DELETE',
       -- Append-only, actor pinned; there is no UPDATE or DELETE policy.
       'TaskActivity:INSERT',
       -- Author pinned on INSERT; UPDATE and DELETE are author-or-admin.
       'TaskComment:INSERT', 'Note:INSERT',
       -- Each member writes their own Sunday update (userId pinned); DELETE
       -- is admin-gated.
       'WeeklyUpdate:INSERT', 'WeeklyUpdate:UPDATE',
       -- A project's triage owner is cleared by the member who leaves the
       -- org (untieDepartingMember runs as them), so the UPDATE cannot be
       -- admin-only. Creating and deleting projects is.
       'Project:UPDATE',
       -- Anyone may open an availability poll (createdById pinned) and it
       -- carries its own slots; answering is pinned to the responder.
       'AvailabilityPoll:INSERT', 'AvailabilityPoll:UPDATE', 'AvailabilityPoll:DELETE',
       'PollSlot:INSERT', 'PollSlot:UPDATE', 'PollSlot:DELETE',
       'PollResponse:INSERT', 'PollResponse:UPDATE', 'PollResponse:DELETE',
       -- Creating an event invites other members, so attendee rows are
       -- written for people other than the actor.
       'EventAttendee:INSERT', 'EventAttendee:UPDATE', 'EventAttendee:DELETE',
       -- A notification is addressed to another member (the WITH CHECK
       -- requires the recipient to be one); marking one read is own-row.
       'Notification:INSERT', 'Notification:UPDATE',
       -- Own row, and a column-level grant that excludes email.
       'User:UPDATE',
       -- Own row only: a user's availability (onboarding). Nobody else reads
       -- or writes it; co-members see busy hours through
       -- app.member_busy_hours, which checks the org and its setting.
       'UserAvailability:INSERT', 'UserAvailability:UPDATE',
       'Pin:INSERT', 'Pin:UPDATE', 'Pin:DELETE',
       'RecentVisit:INSERT', 'RecentVisit:UPDATE', 'RecentVisit:DELETE',
       'MemberPrefs:INSERT', 'MemberPrefs:UPDATE', 'OrgFile:INSERT',
       'NoteFolder:INSERT',
       -- Question polls: any member asks one (createdById pinned) and votes
       -- as themselves while it is open (userId pinned, and the option must
       -- belong to the same poll). Closing, reopening and deleting a poll,
       -- and removing an option, are creator-or-admin.
       'Poll:INSERT', 'PollVote:INSERT', 'PollVote:DELETE',
       -- Club-made databases: a member adds and edits rows only where
       -- app.can_edit_database lets them (owners and admins, or members of a
       -- database that allows it), a role check the manifest can't read in
       -- the policy text. INSERT pins createdById; deleting for good is
       -- admin-only.
       'DatabaseRecord:INSERT', 'DatabaseRecord:UPDATE',
       -- Note sharing: a note's author (or an owner/admin, on a club note)
       -- shares it, which app.can_share_note decides, a role check the
       -- manifest can't read in the policy text. INSERT pins createdById
       -- and requires the person to be a member; anyone may also take
       -- themselves off a note shared with them (DELETE).
       'NoteShare:INSERT', 'NoteShare:UPDATE', 'NoteShare:DELETE'
     ])
$$;
