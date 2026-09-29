-- This is a read-only preflight. Backfill the historical versions once, outside CI.
DO $$
DECLARE
  missing_versions text[];
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NULL THEN
    RAISE EXCEPTION 'Migration history is missing; backfill the three applied baseline versions before deployment';
  END IF;

  SELECT array_agg(required.version ORDER BY required.version)
    INTO missing_versions
    FROM (VALUES ('20260929000000'), ('20260929010000'), ('20260929020000')) AS required(version)
   WHERE NOT EXISTS (
     SELECT 1 FROM supabase_migrations.schema_migrations AS applied
      WHERE applied.version = required.version
   );
  IF missing_versions IS NOT NULL THEN
    RAISE EXCEPTION 'Applied baseline migration history is incomplete: %', missing_versions;
  END IF;
END $$;
