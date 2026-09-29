#!/usr/bin/env bash
set -euo pipefail

# Use only a disposable local Supabase database or a dedicated test project.
: "${OPENOI_TEST_DB_URL:?Set OPENOI_TEST_DB_URL to a disposable Supabase postgres connection URL}"
: "${OPENOI_TEST_DB_CONFIRM:?Set OPENOI_TEST_DB_CONFIRM=disposable after checking the target database}"
if [[ "$OPENOI_TEST_DB_CONFIRM" != disposable ]]; then
  echo 'OPENOI_TEST_DB_CONFIRM must be disposable' >&2
  exit 2
fi
command -v psql >/dev/null || { echo 'psql is required for database acceptance tests' >&2; exit 2; }

run_sql() { psql -X -q -v ON_ERROR_STOP=1 "$OPENOI_TEST_DB_URL" "$@"; }
test_dir=$(mktemp -d)
cleanup() {
  run_sql <<'SQL' >/dev/null || true
delete from auth.users where id in (
  'a1000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000002',
  'a1000000-0000-4000-8000-000000000003',
  'a1000000-0000-4000-8000-000000000004'
);
SQL
  rm -rf "$test_dir"
}
trap cleanup EXIT

run_sql < tests/database/acceptance.sql >/dev/null

run_sql <<'SQL' >/dev/null
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data)
values
('a1000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'openoi-concurrent-a@example.invalid', '', '{"username":"concurrent_a"}'),
('a1000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'openoi-concurrent-b@example.invalid', '', '{"username":"concurrent_b"}'),
('a1000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'openoi-concurrent_c@example.invalid', '', '{"username":"concurrent_c"}'),
('a1000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'openoi-concurrent_d@example.invalid', '', '{"username":"concurrent_d"}');
insert into public.problems(id,created_by,title,difficulty,statement_md)
values ('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Concurrency fixture','easy','x');
insert into public.solutions(id,problem_id,author_id,title,content_md)
values ('c1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Solution','x');
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000002', true);
select public.create_hack('c1000000-0000-4000-8000-000000000001','logic','Evidence','','','');
commit;
SQL

hack_id=$(run_sql -Atc "select id from public.hacks where solution_id='c1000000-0000-4000-8000-000000000001' limit 1")

# The first connection retains the solution lock while the second tries to vote.
run_sql >"$test_dir/first.log" 2>&1 <<SQL &
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
select public.set_vote('hack','$hack_id',1);
select pg_sleep(2);
commit;
SQL
first_pid=$!
sleep 0.3
run_sql >"$test_dir/second.log" 2>&1 <<SQL &
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000004',true);
select public.set_vote('hack','$hack_id',-1);
commit;
SQL
second_pid=$!
wait "$first_pid" || { cat "$test_dir/first.log" >&2; exit 1; }
wait "$second_pid" || { cat "$test_dir/second.log" >&2; exit 1; }

run_sql <<SQL >/dev/null
do \$\$ begin
  if (select status from public.hacks where id='$hack_id') <> 'pending' then raise exception 'Concurrent tie is stale'; end if;
  if (select status from public.solutions where id='c1000000-0000-4000-8000-000000000001') <> 'disputed' then raise exception 'Concurrent solution status is stale'; end if;
  if (select count(*) from public.votes where target_type='hack' and target_id='$hack_id') <> 2 then raise exception 'Concurrent votes lost'; end if;
end \$\$;
SQL

run_sql <<'SQL' >/dev/null
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select public.create_hack('c1000000-0000-4000-8000-000000000001','boundary','Second evidence','','','');
commit;
SQL
second_hack_id=$(run_sql -Atc "select id from public.hacks where solution_id='c1000000-0000-4000-8000-000000000001' and content_md='Second evidence' limit 1")

# Separate hacks under the same solution must serialize through that solution.
run_sql >"$test_dir/different-first.log" 2>&1 <<SQL &
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000004',true);
select public.set_vote('hack','$hack_id',1);
select pg_sleep(2);
commit;
SQL
different_first_pid=$!
sleep 0.3
run_sql >"$test_dir/different-second.log" 2>&1 <<SQL &
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
select public.set_vote('hack','$second_hack_id',1);
commit;
SQL
different_second_pid=$!
wait "$different_first_pid" || { cat "$test_dir/different-first.log" >&2; exit 1; }
wait "$different_second_pid" || { cat "$test_dir/different-second.log" >&2; exit 1; }
run_sql <<SQL >/dev/null
do \$\$ begin
  if (select status from public.hacks where id='$hack_id') <> 'valid' then raise exception 'First hack vote stale'; end if;
  if (select status from public.hacks where id='$second_hack_id') <> 'valid' then raise exception 'Second hack vote stale'; end if;
  if (select status from public.solutions where id='c1000000-0000-4000-8000-000000000001') <> 'hacked' then raise exception 'Solution priority stale'; end if;
end \$\$;
SQL
run_sql <<SQL >/dev/null
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select public.delete_hack('$second_hack_id');
commit;
SQL

# Delete locks the parent, then a vote on the removed target must fail cleanly.
run_sql >"$test_dir/delete.log" 2>&1 <<SQL &
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select public.delete_hack('$hack_id');
select pg_sleep(2);
commit;
SQL
delete_pid=$!
sleep 0.3
if run_sql >"$test_dir/racing-vote.log" 2>&1 <<SQL; then
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000004',true);
select public.set_vote('hack','$hack_id',1);
commit;
SQL
  echo 'Vote on concurrently deleted hack unexpectedly succeeded' >&2
  exit 1
fi
wait "$delete_pid" || { cat "$test_dir/delete.log" >&2; exit 1; }
run_sql <<SQL >/dev/null
do \$\$ begin
  if exists(select 1 from public.hacks where id='$hack_id') then raise exception 'Hack deletion failed'; end if;
  if exists(select 1 from public.votes where target_type='hack' and target_id='$hack_id') then raise exception 'Hack vote cascade failed'; end if;
  if (select status from public.solutions where id='c1000000-0000-4000-8000-000000000001') <> 'normal' then raise exception 'Status after concurrent deletion is stale'; end if;
end \$\$;
SQL
echo 'Database acceptance and concurrency tests passed'
