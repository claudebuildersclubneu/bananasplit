-- =====================================================================
-- Org chart: every member edits it, not only OWNER/ADMIN
-- =====================================================================
-- orgchart.write is every role now (src/lib/auth/permissions.ts): any
-- member starts a draft, imports a document, publishes, and restores an
-- earlier version from the history. So every member sees drafts and the
-- history too, and writes versions and positions in their own org.
--
-- What stays the same:
--   - History is append-only for app_user: still no DELETE policy on
--     OrgChartVersion (a draft is discarded by status), and a position is
--     deleted only while its version is a DRAFT. Every published version
--     is kept, so any publish can be undone from the history.
--   - A version's author is the caller and is immutable (immutable_cols).
--   - Organization UPDATE stays OWNER/ADMIN: that row holds the club's
--     name, settings and plan. A publish only has to move
--     activeOrgChartVersionId, so it goes through
--     app.set_active_org_chart(), which moves that one column, in the
--     caller's own org, to a version of that org that is already PUBLISHED.
--   - Setting members' workspace titles on publish is still members.setTitle
--     (OWNER/ADMIN), checked in code; Membership's policies are unchanged.

-- ---- OrgChartVersion -------------------------------------------------
DROP POLICY app_user_select ON "OrgChartVersion";
DROP POLICY app_user_insert ON "OrgChartVersion";
DROP POLICY app_user_update ON "OrgChartVersion";

CREATE POLICY app_user_select ON "OrgChartVersion" FOR SELECT TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()));
CREATE POLICY app_user_insert ON "OrgChartVersion" FOR INSERT TO app_user
  WITH CHECK ("organizationId" = (SELECT app.member_org_id())
              AND "createdById" = (SELECT app.user_id()));
CREATE POLICY app_user_update ON "OrgChartVersion" FOR UPDATE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()))
  WITH CHECK ("organizationId" = (SELECT app.member_org_id()));

-- ---- OrgChartPosition ------------------------------------------------
-- SELECT is unchanged: it mirrors a visible version (EXISTS under the
-- version's own RLS), which is now every version of the org.
DROP POLICY app_user_insert ON "OrgChartPosition";
DROP POLICY app_user_update ON "OrgChartPosition";
DROP POLICY app_user_delete ON "OrgChartPosition";

CREATE POLICY app_user_insert ON "OrgChartPosition" FOR INSERT TO app_user
  WITH CHECK ("organizationId" = (SELECT app.member_org_id()));
CREATE POLICY app_user_update ON "OrgChartPosition" FOR UPDATE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id()))
  WITH CHECK ("organizationId" = (SELECT app.member_org_id()));
CREATE POLICY app_user_delete ON "OrgChartPosition" FOR DELETE TO app_user
  USING ("organizationId" = (SELECT app.member_org_id())
         AND EXISTS (SELECT 1 FROM "OrgChartVersion" v
                      WHERE v."id" = "OrgChartPosition"."versionId"
                        AND v."organizationId" = "OrgChartPosition"."organizationId"
                        AND v."status" = 'DRAFT'));

-- ---- app.set_active_org_chart ---------------------------------------
-- Points the caller's org at one of its PUBLISHED versions: the last step
-- of a publish or a restore (src/server/org-chart/service.ts), which has
-- already marked the version PUBLISHED and archived the one before it.
-- Member path only. SECURITY DEFINER because Organization UPDATE is
-- OWNER/ADMIN under RLS; it writes nothing but activeOrgChartVersionId, and
-- only in app.member_org_id(). A missing, foreign or unpublished version
-- raises the same 23503 as app.assert_org_active_chart, so nothing about
-- another org's versions is learned.
CREATE OR REPLACE FUNCTION app.set_active_org_chart(p_version text) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_org text;
BEGIN
  IF session_user <> 'app_user' THEN
    RAISE EXCEPTION 'set_active_org_chart: not permitted' USING ERRCODE = '42501';
  END IF;
  v_org := app.member_org_id();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'set_active_org_chart: not permitted' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."OrgChartVersion" v
                  WHERE v."id" = p_version AND v."organizationId" = v_org AND v."status" = 'PUBLISHED') THEN
    RAISE EXCEPTION 'invalid reference: %.%', 'Organization', 'activeOrgChartVersionId' USING ERRCODE = '23503';
  END IF;
  UPDATE public."Organization" SET "activeOrgChartVersionId" = p_version WHERE "id" = v_org;
END $$;
REVOKE ALL ON FUNCTION app.set_active_org_chart(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.set_active_org_chart(text) TO app_user;
