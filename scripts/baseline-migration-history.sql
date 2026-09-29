-- ONE-TIME production adoption only. Never put this file in supabase/migrations.
-- The three SQL files must already have been applied successfully. This script
-- records their versions; it does not run them or change public application data.
BEGIN;

DO $$
DECLARE
  item text;
  relation_name text;
  column_spec text[];
  constraint_name text;
BEGIN
  FOREACH item IN ARRAY ARRAY['profiles', 'problems', 'solutions', 'comments'] LOOP
    relation_name := 'public.' || item;
    IF to_regclass(relation_name) IS NULL OR NOT EXISTS (
      SELECT 1 FROM pg_class WHERE oid = to_regclass(relation_name)
        AND relkind = 'r' AND relrowsecurity
    ) THEN
      RAISE EXCEPTION 'Expected RLS-enabled table % is missing', relation_name;
    END IF;
  END LOOP;

  FOREACH item IN ARRAY ARRAY['problem_summaries', 'solution_summaries'] LOOP
    relation_name := 'public.' || item;
    IF to_regclass(relation_name) IS NULL OR NOT EXISTS (
      SELECT 1 FROM pg_class WHERE oid = to_regclass(relation_name)
        AND relkind = 'v' AND 'security_invoker=true' = ANY(coalesce(reloptions, '{}'::text[]))
    ) THEN
      RAISE EXCEPTION 'Expected security-invoker view % is missing', relation_name;
    END IF;
  END LOOP;

  IF to_regclass('public.hacks') IS NOT NULL OR to_regclass('public.votes') IS NOT NULL
     OR to_regclass('public.hack_summaries') IS NOT NULL
     OR to_regprocedure('public.set_vote(text,uuid,integer)') IS NOT NULL
     OR to_regprocedure('public.create_hack(uuid,text,text,text,text,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'Legacy hack/vote objects remain; simplify_content is not complete';
  END IF;

  FOREACH column_spec SLICE 1 IN ARRAY ARRAY[
    ARRAY['problems', 'source_urls'], ARRAY['problems', 'similar_urls'],
    ARRAY['solutions', 'original_url']
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_attribute
       WHERE attrelid = to_regclass('public.' || column_spec[1])
         AND attname = column_spec[2] AND attnum > 0 AND NOT attisdropped
         AND attnotnull
    ) THEN
      RAISE EXCEPTION 'Required non-null column %.% is missing', column_spec[1], column_spec[2];
    END IF;
  END LOOP;
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
     WHERE attrelid = 'public.comments'::regclass
       AND attname = 'solution_target_id' AND attnum > 0 AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'Solution comment target column is missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND (table_name = 'problems' AND column_name IN ('source', 'external_url', 'difficulty')
         OR table_name = 'solutions' AND column_name IN ('algorithm', 'code', 'language', 'time_complexity', 'space_complexity', 'status')
         OR table_name = 'comments' AND column_name = 'hack_target_id')
  ) THEN
    RAISE EXCEPTION 'Legacy content columns remain; simplify_content is not complete';
  END IF;

  FOREACH constraint_name IN ARRAY ARRAY[
    'problems_tags_limits_check', 'problems_statement_length_check',
    'problems_source_urls_check', 'problems_similar_urls_check',
    'solutions_original_url_check', 'solutions_content_length_check',
    'comments_target_type_check', 'comments_content_length_check'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname = constraint_name AND connamespace = 'public'::regnamespace
         AND contype = 'c' AND convalidated
    ) THEN
      RAISE EXCEPTION 'Required validated content constraint % is missing', constraint_name;
    END IF;
  END LOOP;
END $$;

CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text NOT NULL PRIMARY KEY
);
ALTER TABLE supabase_migrations.schema_migrations
  ADD COLUMN IF NOT EXISTS statements text[];
ALTER TABLE supabase_migrations.schema_migrations
  ADD COLUMN IF NOT EXISTS name text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
     WHERE version NOT IN ('20260929000000', '20260929010000', '20260929020000')
  ) THEN
    RAISE EXCEPTION 'Unexpected migration history exists; inspect it before adoption';
  END IF;
  IF EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
     WHERE (version = '20260929000000' AND name IS NOT NULL AND name <> 'initial')
        OR (version = '20260929010000' AND name IS NOT NULL AND name <> 'content_limits')
        OR (version = '20260929020000' AND name IS NOT NULL AND name <> 'simplify_content')
  ) THEN
    RAISE EXCEPTION 'Existing baseline migration names conflict with local files';
  END IF;
END $$;

INSERT INTO supabase_migrations.schema_migrations(version, name) VALUES
  ('20260929000000', 'initial'),
  ('20260929010000', 'content_limits'),
  ('20260929020000', 'simplify_content')
ON CONFLICT (version) DO NOTHING;
COMMIT;
