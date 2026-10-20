-- Projects become epics: one hierarchy, Epic > Story > Task.
--
-- Every Project turns into an EPIC task with the project's id (so old
-- ?project= links still find it), its name, description, colour (the new
-- Task.color, for epics), lead (as owner), start and target dates, and a
-- status: ACTIVE -> NOT_STARTED, ON_HOLD -> BLOCKED ("On hold"), DONE or
-- archived -> COMPLETED. It is made by its lead, else whoever made its
-- first task, else the club's first owner.
--
-- Its work moves under it. A top-level story or task goes straight under
-- the new epic. An epic that was inside the project becomes a story there:
-- its stories become tasks and their tasks move up beside them, so nothing
-- is deeper than three levels (app.task_hierarchy_guard). Private
-- top-level work stays where it is (an epic is club-wide, and a subtask
-- takes its parent's visibility): it only loses the project.
--
-- Then Project goes: the table (and its policies, triggers and the
-- project_lead_guard function), Task.projectId, the ProjectStatus enum and
-- OrgSettings.memberCanCreateProjects. Task's same-org check names
-- parentTaskId alone, and app.move_personal_items no longer clears
-- projectId (it is restated below, otherwise unchanged from
-- 20261013190000_move_personal_items).

-- ---- Task.color ------------------------------------------------------------
ALTER TABLE "Task" ADD COLUMN "color" TEXT;
ALTER TABLE "Task" ADD CONSTRAINT "Task_color_check"
  CHECK ("color" IS NULL OR "color" ~ '^#[0-9A-Fa-f]{6}$');

-- ---- One epic per project ---------------------------------------------------
INSERT INTO "Task" ("id", "organizationId", "type", "title", "description", "status",
                    "visibility", "priority", "dueDate", "startDate", "color", "rank",
                    "createdById", "ownerId", "completedAt", "blockedReason", "blockedAt",
                    "createdAt", "updatedAt")
SELECT p."id", p."organizationId", 'EPIC', left(p."name", 200), p."description",
       CASE WHEN p."status" = 'DONE' OR p."archivedAt" IS NOT NULL THEN 'COMPLETED'::"TaskStatus"
            WHEN p."status" = 'ON_HOLD' THEN 'BLOCKED'::"TaskStatus"
            ELSE 'NOT_STARTED'::"TaskStatus" END,
       'ORG', 'MEDIUM', p."targetDate"::timestamp, p."startDate", p."color", 'a0',
       coalesce(
         p."leadId",
         (SELECT t."createdById" FROM "Task" t WHERE t."projectId" = p."id"
           ORDER BY t."createdAt" LIMIT 1),
         (SELECT m."userId" FROM "Membership" m
           WHERE m."organizationId" = p."organizationId" AND m."role" = 'OWNER'
           ORDER BY m."joinedAt" LIMIT 1)),
       p."leadId",
       CASE WHEN p."status" = 'DONE' OR p."archivedAt" IS NOT NULL
            THEN coalesce(p."archivedAt", p."updatedAt") END,
       CASE WHEN p."status" = 'ON_HOLD' AND p."archivedAt" IS NULL THEN 'On hold' END,
       CASE WHEN p."status" = 'ON_HOLD' AND p."archivedAt" IS NULL THEN p."updatedAt" END,
       p."createdAt", now()
  FROM "Project" p;

-- ---- Its work under it ------------------------------------------------------
-- An epic inside a project, club-wide: its stories' tasks move up to it,
-- then those stories (childless now) become tasks.
UPDATE "Task" g SET "parentTaskId" = s."parentTaskId", "updatedAt" = now()
  FROM "Task" s JOIN "Task" x ON x."id" = s."parentTaskId"
 WHERE g."parentTaskId" = s."id" AND s."type" = 'STORY'
   AND x."type" = 'EPIC' AND x."parentTaskId" IS NULL
   AND x."projectId" IS NOT NULL AND x."visibility" = 'ORG';
UPDATE "Task" s SET "type" = 'TASK', "updatedAt" = now()
  FROM "Task" x
 WHERE s."parentTaskId" = x."id" AND s."type" = 'STORY'
   AND x."type" = 'EPIC' AND x."parentTaskId" IS NULL
   AND x."projectId" IS NOT NULL AND x."visibility" = 'ORG';
-- Then it becomes a story under its project's epic.
UPDATE "Task" x SET "type" = 'STORY', "parentTaskId" = x."projectId", "updatedAt" = now()
 WHERE x."type" = 'EPIC' AND x."parentTaskId" IS NULL
   AND x."projectId" IS NOT NULL AND x."id" <> x."projectId" AND x."visibility" = 'ORG';
-- Top-level stories and tasks, club-wide, go straight under it.
UPDATE "Task" t SET "parentTaskId" = t."projectId", "updatedAt" = now()
 WHERE t."type" IN ('STORY', 'TASK') AND t."parentTaskId" IS NULL
   AND t."projectId" IS NOT NULL AND t."id" <> t."projectId" AND t."visibility" = 'ORG';

-- ---- Project goes -----------------------------------------------------------
DROP TRIGGER same_org_refs ON "Task";
CREATE TRIGGER same_org_refs BEFORE INSERT OR UPDATE ON "Task"
  FOR EACH ROW EXECUTE FUNCTION app.assert_same_org('parentTaskId', 'Task');

ALTER TABLE "Task" DROP CONSTRAINT "Task_projectId_fkey";
ALTER TABLE "Task" DROP COLUMN "projectId";
DROP TABLE "Project";
DROP FUNCTION app.project_lead_guard();
DROP TYPE "ProjectStatus";
ALTER TABLE "OrgSettings" DROP COLUMN "memberCanCreateProjects";

-- ---- app.move_personal_items, without projectId ------------------------------
CREATE OR REPLACE FUNCTION app.move_personal_items(
  p_from_org text,
  p_to_org text,
  p_event_ids text[],
  p_poll_ids text[],
  p_question_poll_ids text[],
  p_task_ids text[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user text := app.user_id();
  v_from_slug text;
  v_to_slug text;
  v_tz text;
  v_plan text;
  v_trial_end timestamp;
  v_events text[];
  v_polls text[];
  v_qpolls text[];
  v_tasks text[];
  v_all text[];
  v_found integer;
  v_labels jsonb;
  v_parents jsonb;
  v_from_prefix text;
  v_to_prefix text;
  v_prev_org text;
BEGIN
  IF v_user IS NULL OR p_from_org IS NULL OR p_to_org IS NULL THEN
    RAISE EXCEPTION 'move_personal_items: sign in first' USING ERRCODE = '42501';
  END IF;

  -- One move out of a Personal space at a time.
  PERFORM pg_advisory_xact_lock(hashtextextended('move-personal:' || p_from_org, 0));

  SELECT o."slug" INTO v_from_slug
    FROM public."Organization" o
   WHERE o."id" = p_from_org AND o."kind" = 'PERSONAL'
     AND o."personalOwnerId" = v_user AND o."deletedAt" IS NULL;
  IF v_from_slug IS NULL THEN
    RAISE EXCEPTION 'move_personal_items: not your Personal space' USING ERRCODE = '42501';
  END IF;

  SELECT o."slug", o."timezone", o."plan"::text, o."trialEndsAt"
    INTO v_to_slug, v_tz, v_plan, v_trial_end
    FROM public."Membership" m
    JOIN public."Organization" o ON o."id" = m."organizationId"
   WHERE m."userId" = v_user AND m."organizationId" = p_to_org
     AND m."role" IN ('OWNER', 'ADMIN')
     AND o."kind" = 'CLUB' AND o."deletedAt" IS NULL;
  IF v_to_slug IS NULL THEN
    RAISE EXCEPTION 'move_personal_items: not a club you run' USING ERRCODE = '42501';
  END IF;
  IF v_plan = 'TRIAL' AND v_trial_end IS NOT NULL AND v_trial_end <= app.utc_now() THEN
    RAISE EXCEPTION 'move_personal_items: the club is paused' USING ERRCODE = '42501';
  END IF;

  v_events := ARRAY(SELECT DISTINCT x FROM unnest(coalesce(p_event_ids, '{}')) x WHERE x IS NOT NULL);
  v_polls := ARRAY(SELECT DISTINCT x FROM unnest(coalesce(p_poll_ids, '{}')) x WHERE x IS NOT NULL);
  v_qpolls := ARRAY(SELECT DISTINCT x FROM unnest(coalesce(p_question_poll_ids, '{}')) x WHERE x IS NOT NULL);
  v_tasks := ARRAY(SELECT DISTINCT x FROM unnest(coalesce(p_task_ids, '{}')) x WHERE x IS NOT NULL);
  IF cardinality(v_events) + cardinality(v_polls) + cardinality(v_qpolls) + cardinality(v_tasks) > 500 THEN
    RAISE EXCEPTION 'move_personal_items: at most 500 items at once' USING ERRCODE = '22023';
  END IF;

  -- Every id is a live row of the Personal space (locked until commit).
  SELECT count(*) INTO v_found FROM (
    SELECT 1 FROM public."Event" e
     WHERE e."id" = ANY (v_events) AND e."organizationId" = p_from_org AND e."deletedAt" IS NULL
     FOR UPDATE) s;
  IF v_found <> cardinality(v_events) THEN
    RAISE EXCEPTION 'move_personal_items: an event is not in your Personal space' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_found FROM (
    SELECT 1 FROM public."AvailabilityPoll" p
     WHERE p."id" = ANY (v_polls) AND p."organizationId" = p_from_org
     FOR UPDATE) s;
  IF v_found <> cardinality(v_polls) THEN
    RAISE EXCEPTION 'move_personal_items: a poll is not in your Personal space' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_found FROM (
    SELECT 1 FROM public."Poll" p
     WHERE p."id" = ANY (v_qpolls) AND p."organizationId" = p_from_org
     FOR UPDATE) s;
  IF v_found <> cardinality(v_qpolls) THEN
    RAISE EXCEPTION 'move_personal_items: a poll is not in your Personal space' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_found FROM (
    SELECT 1 FROM public."Task" t
     WHERE t."id" = ANY (v_tasks) AND t."organizationId" = p_from_org AND t."deletedAt" IS NULL
     FOR UPDATE) s;
  IF v_found <> cardinality(v_tasks) THEN
    RAISE EXCEPTION 'move_personal_items: a task is not in your Personal space' USING ERRCODE = '22023';
  END IF;

  -- What comes along: a poll's finalized event, a task's live subtasks.
  v_events := ARRAY(
    SELECT DISTINCT x FROM (
      SELECT unnest(v_events) x
      UNION
      SELECT p."finalizedEventId" FROM public."AvailabilityPoll" p
        JOIN public."Event" e ON e."id" = p."finalizedEventId"
       WHERE p."id" = ANY (v_polls) AND e."organizationId" = p_from_org AND e."deletedAt" IS NULL
    ) s);
  v_tasks := ARRAY(
    WITH RECURSIVE tree AS (
      SELECT t."id" FROM public."Task" t WHERE t."id" = ANY (v_tasks)
      UNION
      SELECT c."id" FROM public."Task" c JOIN tree ON c."parentTaskId" = tree."id"
       WHERE c."organizationId" = p_from_org AND c."deletedAt" IS NULL
    ) SELECT "id" FROM tree);
  v_all := v_events || v_polls || v_qpolls || v_tasks;

  IF EXISTS (SELECT 1 FROM public."Attendance" a
              WHERE a."organizationId" = p_from_org AND a."eventId" = ANY (v_events)) THEN
    RAISE EXCEPTION 'move_personal_items: an event with check-ins can''t move' USING ERRCODE = '55000';
  END IF;

  -- The rows land in the club: its member-of-parent-org triggers
  -- (TaskAssignee, EventAttendee) compare against the caller's org, so it
  -- is the club (the caller runs it) until the end of this call, then the
  -- caller's own again. An error aborts the transaction (or rolls back to
  -- the caller's savepoint), which restores it too.
  v_prev_org := pg_catalog.current_setting('app.org_id', true);
  PERFORM pg_catalog.set_config('app.org_id', p_to_org, true);

  -- ---------------------------------------------------------------- jobs
  UPDATE public."Job" j
     SET "organizationId" = p_to_org
   WHERE j."organizationId" = p_from_org
     AND j."status" IN ('PENDING', 'RUNNING')
     AND (
       (j."kind" IN ('rsvp-fanout', 'gcal') AND j."payload" ->> 'eventId' = ANY (v_events))
       OR (j."kind" = 'rsvp-email' AND j."payload" ->> 'registrationId' IN (
             SELECT r."id" FROM public."EventRegistration" r
              WHERE r."organizationId" = p_from_org AND r."eventId" = ANY (v_events)))
       OR (j."kind" = 'task-reminder' AND j."payload" ->> 'taskId' = ANY (v_tasks))
       OR (j."kind" = 'notify-email' AND j."payload" ->> 'notificationId' IN (
             SELECT n."id" FROM public."Notification" n
              WHERE n."organizationId" = p_from_org AND n."taskId" = ANY (v_tasks)))
     );

  -- -------------------------------------------------------------- events
  -- What stays behind lets go of a moved event.
  UPDATE public."Note" SET "eventId" = NULL
   WHERE "organizationId" = p_from_org AND "eventId" = ANY (v_events);
  UPDATE public."Transaction" SET "eventId" = NULL
   WHERE "organizationId" = p_from_org AND "eventId" = ANY (v_events);
  UPDATE public."BallotDefinition" SET "linkedEventId" = NULL
   WHERE "organizationId" = p_from_org AND "linkedEventId" = ANY (v_events);
  UPDATE public."Event" SET "mergedIntoId" = NULL
   WHERE "organizationId" = p_from_org AND "mergedIntoId" = ANY (v_events)
     AND NOT ("id" = ANY (v_events));
  UPDATE public."AvailabilityPoll" SET "finalizedEventId" = NULL
   WHERE "organizationId" = p_from_org AND "finalizedEventId" = ANY (v_events)
     AND NOT ("id" = ANY (v_polls));
  -- People who aren't in the club drop off a moved event's member list.
  DELETE FROM public."EventAttendee" ea
   WHERE ea."organizationId" = p_from_org AND ea."eventId" = ANY (v_events)
     AND NOT EXISTS (SELECT 1 FROM public."Membership" m
                      WHERE m."organizationId" = p_to_org AND m."userId" = ea."userId");

  UPDATE public."Event" e
     SET "organizationId" = p_to_org,
         "hostUserId" = CASE
           WHEN e."hostUserId" IS NULL THEN NULL
           WHEN EXISTS (SELECT 1 FROM public."Membership" m
                         WHERE m."organizationId" = p_to_org AND m."userId" = e."hostUserId")
             THEN e."hostUserId"
           ELSE v_user END,
         "visibility" = 'INTERNAL',
         "featured" = false,
         "mergedIntoId" = NULL,
         "term" = app.term_of(e."startsAt", v_tz),
         "updatedAt" = app.utc_now()
   WHERE e."id" = ANY (v_events);

  -- ---------------------------------------------------------------- polls
  -- A finalized event that didn't come along (deleted) is let go.
  UPDATE public."AvailabilityPoll" p
     SET "organizationId" = p_to_org,
         "finalizedEventId" = CASE WHEN p."finalizedEventId" = ANY (v_events)
                                   THEN p."finalizedEventId" END
   WHERE p."id" = ANY (v_polls);

  UPDATE public."Poll" SET "organizationId" = p_to_org, "updatedAt" = app.utc_now()
   WHERE "id" = ANY (v_qpolls);

  -- ---------------------------------------------------------------- tasks
  IF cardinality(v_tasks) > 0 THEN
    -- Labels: remembered by name and colour, matched or made in the club below.
    SELECT coalesce(jsonb_agg(jsonb_build_object('t', tl."taskId", 'n', l."name", 'c', l."color")), '[]')
      INTO v_labels
      FROM public."TaskLabel" tl
      JOIN public."Label" l ON l."id" = tl."labelId" AND l."organizationId" = tl."organizationId"
     WHERE tl."organizationId" = p_from_org AND tl."taskId" = ANY (v_tasks);
    DELETE FROM public."TaskLabel"
     WHERE "organizationId" = p_from_org AND "taskId" = ANY (v_tasks);

    -- Subtasks under a moving parent are re-linked after the move (the
    -- same-org check would see the parent half-moved otherwise).
    SELECT coalesce(jsonb_object_agg(t."id", t."parentTaskId"), '{}')
      INTO v_parents
      FROM public."Task" t
     WHERE t."id" = ANY (v_tasks) AND t."parentTaskId" = ANY (v_tasks);

    DELETE FROM public."TaskAssignee" ta
     WHERE ta."organizationId" = p_from_org AND ta."taskId" = ANY (v_tasks)
       AND NOT EXISTS (SELECT 1 FROM public."Membership" m
                        WHERE m."organizationId" = p_to_org AND m."userId" = ta."userId");
    DELETE FROM public."TaskMention" tm
     WHERE tm."organizationId" = p_from_org AND tm."taskId" = ANY (v_tasks)
       AND NOT EXISTS (SELECT 1 FROM public."Membership" m
                        WHERE m."organizationId" = p_to_org AND m."userId" = tm."mentionedUserId");
    UPDATE public."Transaction" SET "taskId" = NULL
     WHERE "organizationId" = p_from_org AND "taskId" = ANY (v_tasks);

    UPDATE public."Task" t
       SET "organizationId" = p_to_org,
           "parentTaskId" = NULL,
           "ownerId" = CASE
             WHEN t."ownerId" IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public."Membership" m
                     WHERE m."organizationId" = p_to_org AND m."userId" = t."ownerId")
               THEN t."ownerId" END,
           "updatedAt" = app.utc_now()
     WHERE t."id" = ANY (v_tasks);

    UPDATE public."Task" t
       SET "parentTaskId" = v_parents ->> t."id"
     WHERE t."id" = ANY (v_tasks) AND v_parents ? t."id";

    -- Labels in the club: the same name, else a new one like it.
    INSERT INTO public."Label" ("id", "organizationId", "name", "color")
    SELECT DISTINCT ON (lower(x.n))
           'c' || substr(md5(random()::text || x.n || clock_timestamp()::text), 1, 24),
           p_to_org, x.n, x.c
      FROM jsonb_to_recordset(v_labels) AS x(t text, n text, c text)
     WHERE NOT EXISTS (SELECT 1 FROM public."Label" l
                        WHERE l."organizationId" = p_to_org AND lower(l."name") = lower(x.n))
     ORDER BY lower(x.n), x.n;
    INSERT INTO public."TaskLabel" ("organizationId", "taskId", "labelId")
    SELECT DISTINCT p_to_org, x.t,
           (SELECT l."id" FROM public."Label" l
             WHERE l."organizationId" = p_to_org AND lower(l."name") = lower(x.n)
             ORDER BY l."id" LIMIT 1)
      FROM jsonb_to_recordset(v_labels) AS x(t text, n text, c text)
    ON CONFLICT DO NOTHING;

    -- The task's notifications, their links pointed at the club.
    v_from_prefix := '/app/' || v_from_slug || '/';
    v_to_prefix := '/app/' || v_to_slug || '/';
    UPDATE public."Notification" n
       SET "organizationId" = p_to_org,
           "linkUrl" = CASE WHEN left(n."linkUrl", length(v_from_prefix)) = v_from_prefix
                            THEN v_to_prefix || substr(n."linkUrl", length(v_from_prefix) + 1)
                            ELSE n."linkUrl" END
     WHERE n."organizationId" = p_from_org AND n."taskId" = ANY (v_tasks);
  END IF;

  -- ------------------------------------------------- the caller's shortcuts
  v_from_prefix := '/app/' || v_from_slug || '/';
  v_to_prefix := '/app/' || v_to_slug || '/';
  DELETE FROM public."RecentVisit"
   WHERE "organizationId" = p_from_org AND "targetId" = ANY (v_all);
  UPDATE public."Pin" p
     SET "organizationId" = p_to_org,
         "href" = v_to_prefix || substr(p."href", length(v_from_prefix) + 1)
   WHERE p."organizationId" = p_from_org AND p."targetId" = ANY (v_all)
     AND left(p."href", length(v_from_prefix)) = v_from_prefix
     AND NOT EXISTS (SELECT 1 FROM public."Pin" x
                      WHERE x."userId" = p."userId" AND x."organizationId" = p_to_org
                        AND x."href" = v_to_prefix || substr(p."href", length(v_from_prefix) + 1));
  DELETE FROM public."Pin"
   WHERE "organizationId" = p_from_org AND "targetId" = ANY (v_all);

  PERFORM pg_catalog.set_config('app.org_id', coalesce(v_prev_org, ''), true);

  RETURN jsonb_build_object(
    'events', cardinality(v_events),
    'polls', cardinality(v_polls),
    'questionPolls', cardinality(v_qpolls),
    'tasks', cardinality(v_tasks));
END $$;
REVOKE ALL ON FUNCTION app.move_personal_items(text, text, text[], text[], text[], text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.move_personal_items(text, text, text[], text[], text[], text[]) TO app_user;

