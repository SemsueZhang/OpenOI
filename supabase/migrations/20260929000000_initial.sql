-- OpenOI MVP. Run with Supabase migrations; never expose a service-role key to the app.
create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,32}$'),
  avatar_url text check (avatar_url is null or (char_length(avatar_url) <= 2048 and avatar_url ~* '^https?://[^[:space:]]+$')),
  created_at timestamptz not null default now()
);

create table public.problems (
  id uuid primary key default extensions.gen_random_uuid(),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  source text not null default '' check (char_length(source) <= 100),
  external_url text check (external_url is null or (char_length(external_url) <= 2048 and external_url ~* '^https?://[^[:space:]]+$')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  tags text[] not null default '{}'::text[] check (cardinality(tags) <= 20),
  statement_md text not null check (char_length(btrim(statement_md)) > 0),
  created_at timestamptz not null default now()
);

create table public.solutions (
  id uuid primary key default extensions.gen_random_uuid(),
  problem_id uuid not null references public.problems(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  algorithm text not null default '' check (char_length(algorithm) <= 200),
  content_md text not null check (char_length(btrim(content_md)) > 0),
  code text not null default '',
  language text not null default '' check (char_length(language) <= 80),
  time_complexity text not null default '' check (char_length(time_complexity) <= 100),
  space_complexity text not null default '' check (char_length(space_complexity) <= 100),
  status text not null default 'normal' check (status in ('normal', 'disputed', 'hacked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hacks (
  id uuid primary key default extensions.gen_random_uuid(),
  solution_id uuid not null references public.solutions(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  type text not null check (type in ('counterexample', 'logic', 'complexity', 'boundary')),
  content_md text not null check (char_length(btrim(content_md)) > 0),
  input_data text not null default '',
  expected_output text not null default '',
  actual_output text not null default '',
  status text not null default 'pending' check (status in ('pending', 'valid', 'invalid')),
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default extensions.gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('solution', 'hack')),
  target_id uuid not null,
  solution_target_id uuid generated always as (case when target_type = 'solution' then target_id end) stored references public.solutions(id) on delete cascade,
  hack_target_id uuid generated always as (case when target_type = 'hack' then target_id end) stored references public.hacks(id) on delete cascade,
  content_md text not null check (char_length(btrim(content_md)) > 0),
  created_at timestamptz not null default now()
);

create table public.votes (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('solution', 'hack')),
  target_id uuid not null,
  solution_target_id uuid generated always as (case when target_type = 'solution' then target_id end) stored references public.solutions(id) on delete cascade,
  hack_target_id uuid generated always as (case when target_type = 'hack' then target_id end) stored references public.hacks(id) on delete cascade,
  value smallint not null check ((target_type = 'solution' and value = 1) or (target_type = 'hack' and value in (-1, 1))),
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create index problems_created_at_idx on public.problems(created_at desc, id desc);
create index problems_difficulty_idx on public.problems(difficulty);
create index problems_source_idx on public.problems(source);
create index problems_tags_idx on public.problems using gin(tags);
create index solutions_problem_idx on public.solutions(problem_id, created_at desc);
create index solutions_author_idx on public.solutions(author_id);
create index hacks_solution_idx on public.hacks(solution_id, created_at desc);
create index hacks_author_idx on public.hacks(author_id);
create index comments_solution_target_idx on public.comments(solution_target_id, created_at);
create index comments_hack_target_idx on public.comments(hack_target_id, created_at);
create index votes_solution_target_idx on public.votes(solution_target_id);
create index votes_hack_target_idx on public.votes(hack_target_id);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger solutions_touch before update on public.solutions for each row execute function public.touch_updated_at();

-- Registration metadata is untrusted. A missing or invalid username rejects signup.
create function public.create_profile_for_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare chosen_username text;
begin
  chosen_username := new.raw_user_meta_data ->> 'username';
  if chosen_username is null or chosen_username !~ '^[a-z0-9_]{3,32}$' then
    raise exception 'Invalid username' using errcode = '23514';
  end if;
  insert into public.profiles(id, username)
  values (new.id, chosen_username);
  return new;
end;
$$;
create trigger auth_user_profile after insert on auth.users
for each row execute function public.create_profile_for_user();

-- These routines are only called after locking the parent solution row.
create function public.recompute_solution_status(p_solution_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare next_status text;
begin
  select case
    when exists(select 1 from public.hacks h where h.solution_id = p_solution_id and h.status = 'valid') then 'hacked'
    when exists(select 1 from public.hacks h where h.solution_id = p_solution_id and h.status = 'pending') then 'disputed'
    else 'normal'
  end into next_status;
  update public.solutions s set status = next_status
  where s.id = p_solution_id and s.status is distinct from next_status;
end;
$$;

create function public.recompute_hack_status(p_hack_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_valid bigint; v_invalid bigint; next_status text;
begin
  -- During cascade deletion the hack may already be gone.
  if not exists(select 1 from public.hacks where id = p_hack_id) then return; end if;
  select count(*) filter (where value = 1), count(*) filter (where value = -1)
    into v_valid, v_invalid from public.votes
    where target_type = 'hack' and target_id = p_hack_id;
  next_status := case when v_valid > v_invalid then 'valid'
                      when v_invalid > v_valid then 'invalid' else 'pending' end;
  update public.hacks set status = next_status
  where id = p_hack_id and status is distinct from next_status;
end;
$$;

create function public.after_vote_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_target_type text; v_target_id uuid; v_solution_id uuid;
begin
  if tg_op = 'DELETE' then
    v_target_type := old.target_type;
    v_target_id := old.target_id;
  else
    v_target_type := new.target_type;
    v_target_id := new.target_id;
  end if;
  if v_target_type = 'hack' then
    select solution_id into v_solution_id from public.hacks where id = v_target_id;
    if v_solution_id is null then return null; end if;
    -- RPCs lock this first; cascading deletes retain this order as well.
    perform 1 from public.solutions where id = v_solution_id for update;
    perform public.recompute_hack_status(v_target_id);
    perform public.recompute_solution_status(v_solution_id);
  end if;
  return null;
end;
$$;
create trigger vote_status after insert or update or delete on public.votes
for each row execute function public.after_vote_status();

create function public.after_hack_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_solution_id uuid;
begin
  if tg_op = 'DELETE' then
    v_solution_id := old.solution_id;
  else
    v_solution_id := new.solution_id;
  end if;
  if exists(select 1 from public.solutions where id = v_solution_id) then
    perform 1 from public.solutions where id = v_solution_id for update;
    perform public.recompute_solution_status(v_solution_id);
  end if;
  return null;
end;
$$;
create trigger hack_status after insert or delete on public.hacks
for each row execute function public.after_hack_status();

create function public.set_vote(p_target_type text, p_target_id uuid, p_value integer default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid; v_solution_id uuid; v_author_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_target_id is null or p_target_type is null or p_target_type not in ('solution', 'hack') or
     (p_value is not null and not ((p_target_type = 'solution' and p_value = 1) or
                                   (p_target_type = 'hack' and p_value in (-1, 1)))) then
    raise exception 'Invalid vote' using errcode = '22023';
  end if;
  if p_target_type = 'solution' then
    v_solution_id := p_target_id;
  else
    select solution_id into v_solution_id from public.hacks where id = p_target_id;
  end if;
  if v_solution_id is null then raise exception 'Target not found' using errcode = 'P0002'; end if;
  perform 1 from public.solutions where id = v_solution_id for update;
  if not found then raise exception 'Target not found' using errcode = 'P0002'; end if;
  if p_target_type = 'solution' then
    select author_id into v_author_id from public.solutions where id = p_target_id;
  else
    select author_id into v_author_id from public.hacks where id = p_target_id;
  end if;
  if v_author_id is null then raise exception 'Target not found' using errcode = 'P0002'; end if;
  if v_author_id = v_user_id then raise exception 'Cannot vote on own content' using errcode = '42501'; end if;
  if p_value is null then
    delete from public.votes where user_id = v_user_id and target_type = p_target_type and target_id = p_target_id;
  else
    insert into public.votes(user_id, target_type, target_id, value)
    values(v_user_id, p_target_type, p_target_id, p_value)
    on conflict (user_id, target_type, target_id) do update set value = excluded.value;
  end if;
end;
$$;

create function public.create_hack(
  p_solution_id uuid, p_type text, p_content_md text,
  p_input_data text default '', p_expected_output text default '', p_actual_output text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid; v_hack_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_solution_id is null then raise exception 'Solution required' using errcode = '22023'; end if;
  perform 1 from public.solutions where id = p_solution_id for update;
  if not found then raise exception 'Solution not found' using errcode = 'P0002'; end if;
  insert into public.hacks(solution_id, author_id, type, content_md, input_data, expected_output, actual_output)
  values(p_solution_id, v_user_id, p_type, p_content_md, p_input_data, p_expected_output, p_actual_output)
  returning id into v_hack_id;
  return v_hack_id;
end;
$$;

create function public.delete_hack(p_hack_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid; v_solution_id uuid; v_author_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select solution_id into v_solution_id from public.hacks where id = p_hack_id;
  if v_solution_id is null then raise exception 'Hack not found' using errcode = 'P0002'; end if;
  perform 1 from public.solutions where id = v_solution_id for update;
  if not found then raise exception 'Hack not found' using errcode = 'P0002'; end if;
  select author_id into v_author_id from public.hacks where id = p_hack_id for update;
  if v_author_id is null then raise exception 'Hack not found' using errcode = 'P0002'; end if;
  if v_author_id <> v_user_id then raise exception 'Not the hack author' using errcode = '42501'; end if;
  delete from public.hacks where id = p_hack_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.problems enable row level security;
alter table public.solutions enable row level security;
alter table public.hacks enable row level security;
alter table public.comments enable row level security;
alter table public.votes enable row level security;

create policy profiles_read on public.profiles for select to anon, authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy problems_read on public.problems for select to anon, authenticated using (true);
create policy problems_insert on public.problems for insert to authenticated with check (created_by = auth.uid());
create policy problems_update on public.problems for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy problems_delete on public.problems for delete to authenticated using (created_by = auth.uid());
create policy solutions_read on public.solutions for select to anon, authenticated using (true);
create policy solutions_insert on public.solutions for insert to authenticated with check (author_id = auth.uid());
create policy solutions_update on public.solutions for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy solutions_delete on public.solutions for delete to authenticated using (author_id = auth.uid());
create policy hacks_read on public.hacks for select to anon, authenticated using (true);
create policy hacks_update on public.hacks for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy comments_read on public.comments for select to anon, authenticated using (true);
create policy comments_insert on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy comments_update on public.comments for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy comments_delete on public.comments for delete to authenticated using (author_id = auth.uid());
create policy votes_read on public.votes for select to anon, authenticated using (true);

revoke all on public.profiles, public.problems, public.solutions, public.hacks, public.comments, public.votes from public, anon, authenticated;
grant select on public.profiles, public.problems, public.solutions, public.hacks, public.comments, public.votes to anon, authenticated;
grant update(username, avatar_url) on public.profiles to authenticated;
grant insert(title, source, external_url, difficulty, tags, statement_md) on public.problems to authenticated;
grant update(title, source, external_url, difficulty, tags, statement_md) on public.problems to authenticated;
grant delete on public.problems to authenticated;
grant insert(problem_id, title, algorithm, content_md, code, language, time_complexity, space_complexity) on public.solutions to authenticated;
grant update(title, algorithm, content_md, code, language, time_complexity, space_complexity) on public.solutions to authenticated;
grant delete on public.solutions to authenticated;
grant update(type, content_md, input_data, expected_output, actual_output) on public.hacks to authenticated;
grant insert(target_type, target_id, content_md) on public.comments to authenticated;
grant update(content_md) on public.comments to authenticated;
grant delete on public.comments to authenticated;

revoke all on function public.touch_updated_at(), public.create_profile_for_user(),
  public.recompute_solution_status(uuid), public.recompute_hack_status(uuid),
  public.after_vote_status(), public.after_hack_status(),
  public.set_vote(text, uuid, integer), public.create_hack(uuid, text, text, text, text, text),
  public.delete_hack(uuid) from public, anon, authenticated;
grant execute on function public.set_vote(text, uuid, integer),
  public.create_hack(uuid, text, text, text, text, text), public.delete_hack(uuid) to authenticated;

create view public.problem_summaries with (security_invoker = true) as
select p.*, (select count(*) from public.solutions s where s.problem_id = p.id)::integer as solution_count
from public.problems p;
create view public.solution_summaries with (security_invoker = true) as
select s.*,
  (select count(*) from public.votes v where v.target_type = 'solution' and v.target_id = s.id and v.value = 1)::integer as useful_votes,
  (select count(*) from public.votes v where v.target_type = 'solution' and v.target_id = s.id and v.value = 1)::integer as vote_count,
  (select count(*) from public.hacks h where h.solution_id = s.id)::integer as hack_count
from public.solutions s;
create view public.hack_summaries with (security_invoker = true) as
select h.*,
  (select count(*) from public.votes v where v.target_type = 'hack' and v.target_id = h.id and v.value = 1)::integer as valid_votes,
  (select count(*) from public.votes v where v.target_type = 'hack' and v.target_id = h.id and v.value = -1)::integer as invalid_votes
from public.hacks h;
revoke all on public.problem_summaries, public.solution_summaries, public.hack_summaries from public, anon, authenticated;
grant select on public.problem_summaries, public.solution_summaries, public.hack_summaries to anon, authenticated;
