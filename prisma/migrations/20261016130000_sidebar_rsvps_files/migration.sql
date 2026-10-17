-- The default sidebar moved RSVPs into Club (after the club's other items)
-- and Files to the top of Data. A club that saved its own sidebar keeps its
-- choices, except these two where they still sit in Main, their old default
-- spot: those move the same way, keeping every other item's order.
WITH ranked AS (
  SELECT s."organizationId", e.item, e.ord,
         max(e.ord) FILTER (WHERE e.item->>'group' = 'club') OVER w AS last_club,
         min(e.ord) FILTER (WHERE e.item->>'group' = 'data') OVER w AS first_data
  FROM "OrgSettings" s,
       jsonb_array_elements(s."sidebar"->'items') WITH ORDINALITY AS e(item, ord)
  WHERE s."sidebar" IS NOT NULL AND jsonb_typeof(s."sidebar"->'items') = 'array'
  WINDOW w AS (PARTITION BY s."organizationId")
),
moved AS (
  SELECT "organizationId",
         jsonb_agg(
           CASE
             WHEN item->>'id' = 'rsvps' AND item->>'group' = 'main'
               THEN jsonb_set(item, '{group}', '"club"')
             WHEN item->>'id' = 'notes' AND item->>'group' = 'main'
               THEN jsonb_set(item, '{group}', '"data"')
             ELSE item
           END
           ORDER BY CASE
             WHEN item->>'id' = 'rsvps' AND item->>'group' = 'main'
               THEN COALESCE(last_club, 1000) + 0.5
             WHEN item->>'id' = 'notes' AND item->>'group' = 'main'
               THEN COALESCE(first_data, 1000) - 0.25
             ELSE ord
           END
         ) AS items
  FROM ranked
  GROUP BY "organizationId"
  HAVING bool_or(item->>'id' IN ('rsvps', 'notes') AND item->>'group' = 'main')
)
UPDATE "OrgSettings" o
SET "sidebar" = jsonb_set(o."sidebar", '{items}', moved.items), "updatedAt" = app.utc_now()
FROM moved
WHERE moved."organizationId" = o."organizationId";
