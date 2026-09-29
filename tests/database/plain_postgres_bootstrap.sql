-- Stand-in for the small Supabase Auth surface needed to validate the migration
-- in an isolated PostgreSQL container. This does not test managed Auth/email.
create schema auth;
create schema extensions;
create role anon nologin;
create role authenticated nologin;
create table auth.users (
  id uuid primary key,
  instance_id uuid,
  aud text,
  role text,
  email text unique,
  encrypted_password text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
