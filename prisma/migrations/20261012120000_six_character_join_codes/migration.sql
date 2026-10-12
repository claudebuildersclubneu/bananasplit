-- Six-character invite codes (like ROBO26) for the six-box join screen.
-- Codes already issued as XXXX-XXXX keep working until an admin makes a new
-- one; new and rotated codes are six characters (src/lib/join-code.ts).
ALTER TABLE "OrgJoinCode" DROP CONSTRAINT "OrgJoinCode_code_format";
ALTER TABLE "OrgJoinCode" ADD CONSTRAINT "OrgJoinCode_code_format"
  CHECK ("code" ~ '^([A-Z0-9]{6}|[A-Z0-9]{4}-[A-Z0-9]{4})$');
