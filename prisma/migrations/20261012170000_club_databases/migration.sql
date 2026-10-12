-- Club-made databases (docs/features/databases.md, "Your own databases"):
-- any club makes its own tables in Bananasplit (a member roster, equipment,
-- merch orders...) with typed fields, and every cell saves as it's edited.
-- The data lives here, in the club's own walled-off rows: no club has to set
-- up a database of its own, and no club can see another's.
--
--   DatabaseDefinition  kind CUSTOM, plus a description, who may edit, and
--                       who made it
--   DatabaseField       a column: name, type, type options; its id keys the
--                       values, so a rename never touches the data
--   DatabaseRecord      a row: values as one JSON object keyed by field id

-- CreateEnum
CREATE TYPE "DatabaseFieldType" AS ENUM ('TEXT', 'LONG_TEXT', 'NUMBER', 'CURRENCY', 'DATE', 'CHECKBOX', 'SELECT', 'MULTI_SELECT', 'MEMBER', 'EMAIL', 'PHONE', 'URL');

-- AlterTable
ALTER TABLE "DatabaseDefinition" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "memberCanEdit" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DatabaseField" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DatabaseFieldType" NOT NULL,
    "options" JSONB NOT NULL DEFAULT '{}',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatabaseField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatabaseRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "values" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatabaseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DatabaseField_organizationId_databaseId_sortOrder_idx" ON "DatabaseField"("organizationId", "databaseId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DatabaseField_organizationId_id_key" ON "DatabaseField"("organizationId", "id");

-- CreateIndex
CREATE INDEX "DatabaseRecord_organizationId_databaseId_deletedAt_createdA_idx" ON "DatabaseRecord"("organizationId", "databaseId", "deletedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DatabaseRecord_organizationId_id_key" ON "DatabaseRecord"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "DatabaseDefinition_organizationId_id_key" ON "DatabaseDefinition"("organizationId", "id");

-- AddForeignKey
ALTER TABLE "DatabaseField" ADD CONSTRAINT "DatabaseField_organizationId_databaseId_fkey" FOREIGN KEY ("organizationId", "databaseId") REFERENCES "DatabaseDefinition"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseRecord" ADD CONSTRAINT "DatabaseRecord_organizationId_databaseId_fkey" FOREIGN KEY ("organizationId", "databaseId") REFERENCES "DatabaseDefinition"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseRecord" ADD CONSTRAINT "DatabaseRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseRecord" ADD CONSTRAINT "DatabaseRecord_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseDefinition" ADD CONSTRAINT "DatabaseDefinition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- ---------------------------------------------------------------------------
-- Hand-written: checks, indexes, triggers, RLS and grants.
-- ---------------------------------------------------------------------------

ALTER TABLE "DatabaseDefinition" ADD CONSTRAINT "DatabaseDefinition_description_length"
  CHECK ("description" IS NULL OR char_length("description") <= 500);
ALTER TABLE "DatabaseDefinition" ADD CONSTRAINT "DatabaseDefinition_name_length"
  CHECK (char_length(btrim("name")) >= 1 AND char_length("name") <= 60);

ALTER TABLE "DatabaseField" ADD CONSTRAINT "DatabaseField_name_length"
  CHECK (char_length(btrim("name")) >= 1 AND char_length("name") <= 60);
ALTER TABLE "DatabaseField" ADD CONSTRAINT "DatabaseField_options_shape"
  CHECK (jsonb_typeof("options") = 'object' AND octet_length("options"::text) <= 16384);

-- A row is at most 64 KB of values, always an object.
ALTER TABLE "DatabaseRecord" ADD CONSTRAINT "DatabaseRecord_values_shape"
  CHECK (jsonb_typeof("values") = 'object' AND octet_length("values"::text) <= 65536);

-- One field names the rows: at most one is marked.
CREATE UNIQUE INDEX "DatabaseField_one_primary" ON "DatabaseField" ("databaseId") WHERE "isPrimary";

-- Filtering on cell values (containment, key presence) without a scan.
CREATE INDEX "DatabaseRecord_values_gin" ON "DatabaseRecord" USING gin ("values" jsonb_path_ops);

-- Fields and rows belong only to club-made (CUSTOM) databases; the built-ins
-- keep their own typed tables. Runs as the caller, who can read definitions.
CREATE OR REPLACE FUNCTION app.assert_custom_database() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public."DatabaseDefinition" d
     WHERE d."id" = NEW."databaseId" AND d."organizationId" = NEW."organizationId" AND d."kind" = 'CUSTOM'
  ) THEN
    RAISE EXCEPTION '%: not a club-made database', TG_TABLE_NAME USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.assert_custom_database() FROM PUBLIC;
CREATE TRIGGER custom_database_only BEFORE INSERT OR UPDATE OF "databaseId" ON "DatabaseField"
  FOR EACH ROW EXECUTE FUNCTION app.assert_custom_database();
CREATE TRIGGER custom_database_only BEFORE INSERT OR UPDATE OF "databaseId" ON "DatabaseRecord"
  FOR EACH ROW EXECUTE FUNCTION app.assert_custom_database();

-- A row stays in its database and keeps its author; a field stays in its
-- database; a database keeps its maker.
CREATE TRIGGER immutable_cols BEFORE UPDATE OF "createdById", "databaseId" ON "DatabaseRecord"
  FOR EACH ROW EXECUTE FUNCTION app.immutable_columns('createdById', 'databaseId');
CREATE TRIGGER immutable_cols BEFORE UPDATE OF "databaseId" ON "DatabaseField"
  FOR EACH ROW EXECUTE FUNCTION app.immutable_columns('databaseId');
CREATE TRIGGER immutable_cols BEFORE UPDATE OF "createdById" ON "DatabaseDefinition"
  FOR EACH ROW EXECUTE FUNCTION app.immutable_columns('createdById');

-- Who may see one database, for the member org's caller: its
-- memberVisibility (the database's settings, or Admin panel > Privacy)
-- against their role. MEMBERS: everyone in the club; ADMINS and HIDDEN:
-- owners and admins; OWNER: owners. A treasurer reads as a member. Nothing
-- for an archived database, or one of another club.
CREATE OR REPLACE FUNCTION app.can_view_database(p_database text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT coalesce((
    SELECT CASE d."memberVisibility"::text
             WHEN 'MEMBERS' THEN r.role IS NOT NULL
             WHEN 'ADMINS' THEN r.role IN ('OWNER', 'ADMIN')
             WHEN 'HIDDEN' THEN r.role IN ('OWNER', 'ADMIN')
             WHEN 'OWNER' THEN r.role = 'OWNER'
             ELSE false END
      FROM public."DatabaseDefinition" d
     CROSS JOIN (SELECT app.member_role()::text AS role) r
     WHERE d."id" = p_database
       AND d."organizationId" = app.member_org_id()
       AND d."archivedAt" IS NULL
  ), false)
$$;

-- Who may add and edit rows of one club-made database: owners and admins,
-- and members who can see it when the database lets members edit.
CREATE OR REPLACE FUNCTION app.can_edit_database(p_database text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT coalesce((
    SELECT d."kind" = 'CUSTOM'
           AND (app.is_org_admin() OR (d."memberCanEdit" AND app.can_view_database(d."id")))
      FROM public."DatabaseDefinition" d
     WHERE d."id" = p_database
       AND d."organizationId" = app.member_org_id()
       AND d."archivedAt" IS NULL
  ), false)
$$;

REVOKE ALL ON FUNCTION app.can_view_database(text), app.can_edit_database(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.can_view_database(text), app.can_edit_database(text) TO app_user;

-- DatabaseField: whoever can see the database reads its fields; owners and
-- admins shape it.
ALTER TABLE "DatabaseField" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_user_select ON "DatabaseField" FOR SELECT TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND app.can_view_database("databaseId"));
CREATE POLICY app_user_insert ON "DatabaseField" FOR INSERT TO app_user
  WITH CHECK ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()));
CREATE POLICY app_user_update ON "DatabaseField" FOR UPDATE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()))
  WITH CHECK ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()));
CREATE POLICY app_user_delete ON "DatabaseField" FOR DELETE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()));
CREATE POLICY app_service_select ON "DatabaseField" FOR SELECT TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_insert ON "DatabaseField" FOR INSERT TO app_service
  WITH CHECK ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_update ON "DatabaseField" FOR UPDATE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()))
  WITH CHECK ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_delete ON "DatabaseField" FOR DELETE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));

-- DatabaseRecord: whoever can see the database reads its rows; whoever can
-- edit it adds rows as themselves and edits any row (into and out of the
-- trash included); only owners and admins delete for good.
ALTER TABLE "DatabaseRecord" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_user_select ON "DatabaseRecord" FOR SELECT TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND app.can_view_database("databaseId"));
CREATE POLICY app_user_insert ON "DatabaseRecord" FOR INSERT TO app_user
  WITH CHECK ("organizationId" = (SELECT app.member_org_id())
              AND app.can_edit_database("databaseId")
              AND "createdById" = (SELECT app.user_id()));
CREATE POLICY app_user_update ON "DatabaseRecord" FOR UPDATE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND app.can_edit_database("databaseId"))
  WITH CHECK ("organizationId" = (SELECT app.member_org_id()) AND app.can_edit_database("databaseId"));
CREATE POLICY app_user_delete ON "DatabaseRecord" FOR DELETE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()) AND (SELECT app.is_org_admin()));
CREATE POLICY app_service_select ON "DatabaseRecord" FOR SELECT TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_insert ON "DatabaseRecord" FOR INSERT TO app_service
  WITH CHECK ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_update ON "DatabaseRecord" FOR UPDATE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()))
  WITH CHECK ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));
CREATE POLICY app_service_delete ON "DatabaseRecord" FOR DELETE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id()));

REVOKE ALL ON "DatabaseField", "DatabaseRecord" FROM PUBLIC, app_user, app_service, app_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON "DatabaseField", "DatabaseRecord" TO app_user, app_service;

-- The manifest's tenant-only-write allowlist gains DatabaseRecord:INSERT
-- and DatabaseRecord:UPDATE (unchanged otherwise from
-- 20261005120000_question_polls).
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
       'DatabaseRecord:INSERT', 'DatabaseRecord:UPDATE'
     ])
$$;
