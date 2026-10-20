-- Storage: let trashed files really go, and let the nightly job repair
-- the counter.
--
-- OrgFile rows were soft-deleted only (deletedAt), and the runtime roles
-- had no DELETE, so a file emptied from the trash or purged after its
-- restore window kept counting toward Organization.storageUsedBytes for
-- good (app.storage_used_track subtracts on DELETE). Now:
--
--   app_user     may delete a file that is already in the trash, in its
--                own org, when it uploaded it or is an owner or admin
--                (the same people who may trash it): Empty trash.
--   app_service  may delete trashed files of the org in its context:
--                the nightly purge.
--
-- Neither can delete a live file, so a delete is always the second step
-- after a soft delete the existing UPDATE policy already allows.

CREATE POLICY app_user_delete ON "OrgFile" FOR DELETE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id())
         AND "deletedAt" IS NOT NULL
         AND ("uploadedById" = (SELECT app.user_id()) OR (SELECT app.is_org_admin())));
CREATE POLICY app_service_delete ON "OrgFile" FOR DELETE TO app_service
  USING ((SELECT app.org_id()) IS NOT NULL AND "organizationId" = (SELECT app.org_id())
         AND "deletedAt" IS NOT NULL);
GRANT DELETE ON "OrgFile" TO app_user, app_service;

-- The nightly reconcile (src/server/jobs/handlers/storage.ts) recomputes a
-- space's counter from the real sums: every file (the trash counts until
-- purged), every receipt, every note version. Only for the org in the
-- service context, and only app_service; it writes nothing but the
-- derived counter. Returns the corrected value.
CREATE OR REPLACE FUNCTION app.storage_reconcile(p_org text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_total bigint;
BEGIN
  IF p_org IS NULL OR app.org_id() IS DISTINCT FROM p_org THEN
    RAISE EXCEPTION 'storage_reconcile: wrong org context' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce((SELECT sum("sizeBytes") FROM public."OrgFile" WHERE "organizationId" = p_org), 0)
       + coalesce((SELECT sum("sizeBytes") FROM public."Receipt" WHERE "organizationId" = p_org), 0)
       + coalesce((SELECT sum("sizeBytes") FROM public."NoteVersion" WHERE "organizationId" = p_org), 0)
    INTO v_total;
  UPDATE public."Organization" SET "storageUsedBytes" = v_total WHERE "id" = p_org;
  RETURN v_total;
END $$;
REVOKE ALL ON FUNCTION app.storage_reconcile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.storage_reconcile(text) TO app_service;
