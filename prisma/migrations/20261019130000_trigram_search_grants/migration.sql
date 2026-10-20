-- People search ranks members by trigram similarity. pg_trgm's functions
-- were created by the migration owner after default privileges revoked
-- EXECUTE from PUBLIC, so the runtime role can't call them. Grant only
-- the scoring functions and the operators the directory query uses
-- (% and <%), and only to app_user; the data they read is still
-- filtered by RLS.
GRANT EXECUTE ON FUNCTION
  public.similarity(text, text),
  public.word_similarity(text, text),
  public.similarity_op(text, text),
  public.word_similarity_op(text, text)
TO app_user;
