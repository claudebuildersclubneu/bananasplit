-- Only a treasurer or owner marks an expense not applicable. A
-- not-applicable expense counts toward the balance without anyone approving
-- it, so a member who could set it on their own draft could book spending
-- with no approval. The app already refuses (reimbursement-state-machine.ts);
-- this makes the database refuse too: a member's own update may leave their
-- expense only in draft or submitted. Same policy, narrower WITH CHECK, so
-- ALTER POLICY keeps everything else as it was.
ALTER POLICY app_user_update ON "Transaction"
  WITH CHECK ("organizationId" = (SELECT app.member_org_id())
              AND ("approvedById" IS NULL OR "approvedById" <> "submittedById")
              AND ((SELECT app.is_finance())
                   OR ("submittedById" = (SELECT app.user_id()) AND "kind" = 'EXPENSE'
                       AND "status" IN ('DRAFT', 'SUBMITTED')
                       AND "approvedById" IS NULL AND "reimbursedAt" IS NULL AND "reconciledAt" IS NULL)));
