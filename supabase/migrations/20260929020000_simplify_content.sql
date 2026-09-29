-- Reduced OpenOI content model. Run as one transaction in the Supabase SQL editor.
-- Before retrying on a populated database: add public.solutions.original_url text
-- (if absent), fill every solution with its actual HTTP(S) source URL, and resolve
-- every preflight error. This migration never invents or truncates content.
-- On success, legacy source/difficulty, solution implementation fields, hacks,
-- votes, and hack comments are intentionally removed.
begin;

alter table public.solutions add column if not exists original_url text;

create or replace function public.valid_content_url(p_url text) returns boolean
language sql immutable set search_path = '' as $$
  select p_url is not null
    and char_length(p_url) <= 2048
    and p_url ~* '^https?://[^[:space:]/?#]+[^[:space:]]*$';
$$;

create function public.valid_content_urls(p_urls text[]) returns boolean
language sql immutable set search_path = '' as $$
  select p_urls is not null
    and coalesce(array_ndims(p_urls), 1) = 1
    and cardinality(p_urls) <= 20
    and cardinality(p_urls) = (select count(distinct item) from unnest(p_urls) as u(item))
    and not exists (select 1 from unnest(p_urls) as u(item) where not public.valid_content_url(item));
$$;

create or replace function public.valid_problem_tags(p_tags text[]) returns boolean
language sql immutable set search_path = '' as $$
  select p_tags is not null
    and coalesce(array_ndims(p_tags), 1) = 1
    and cardinality(p_tags) <= 8
    and cardinality(p_tags) = (select count(distinct tag) from unnest(p_tags) as t(tag))
    and not exists (
      select 1 from unnest(p_tags) as t(tag)
      where tag is null or tag <> all(array['图论','数据结构','组合优化','数学','搜索','计算几何','字符串','特殊题型']::text[])
    );
$$;

-- A raised exception rolls back even the new column and functions. Supply
-- original_url separately before retrying if this is an existing populated DB.
do $$
declare bad_id uuid;
begin
  select id into bad_id from public.problems
  where statement_md !~ '[^[:space:]]' or char_length(statement_md) > 1000
     or not public.valid_problem_tags(tags)
     or (external_url is not null and not public.valid_content_url(external_url))
  limit 1;
  if bad_id is not null then
    raise exception 'Problem % has incompatible statement, tags, or external_url; repair before migration', bad_id;
  end if;
  select id into bad_id from public.solutions
  where content_md !~ '[^[:space:]]' or char_length(content_md) > 1000
     or not public.valid_content_url(original_url)
  limit 1;
  if bad_id is not null then
    raise exception 'Solution % needs a nonblank summary <=1000 codepoints and an actual HTTP(S) original_url <=2048', bad_id;
  end if;
  select id into bad_id from public.comments
  where target_type = 'solution' and
    (content_md !~ '[^[:space:]]' or char_length(content_md) > 100)
  limit 1;
  if bad_id is not null then
    raise exception 'Solution comment % must be nonblank and <=100 codepoints', bad_id;
  end if;
end;
$$;

-- Views depend on removed columns/tables.
drop view public.hack_summaries;
drop view public.solution_summaries;
drop view public.problem_summaries;

-- Hack comments are part of the removed feature, and must go before dropping
-- their generated FK. Solution comments and their IDs/dates stay intact.
delete from public.comments where target_type = 'hack';
alter table public.comments drop column hack_target_id;
alter table public.comments drop constraint comments_target_type_check;
alter table public.comments add constraint comments_target_type_check check (target_type = 'solution');
alter table public.comments drop constraint comments_content_length_check;
alter table public.comments add constraint comments_content_length_check
  check (content_md ~ '[^[:space:]]' and char_length(content_md) <= 100);

-- Drop the obsolete status automation before removing its source tables.
drop trigger if exists vote_status on public.votes;
drop trigger if exists hack_status on public.hacks;
drop table public.votes;
drop table public.hacks;
drop function public.set_vote(text, uuid, integer);
drop function public.create_hack(uuid, text, text, text, text, text);
drop function public.delete_hack(uuid);
drop function public.after_vote_status();
drop function public.after_hack_status();
drop function public.recompute_hack_status(uuid);
drop function public.recompute_solution_status(uuid);

alter table public.problems add column source_urls text[] not null default '{}'::text[];
alter table public.problems add column similar_urls text[] not null default '{}'::text[];
update public.problems set source_urls = array[external_url] where external_url is not null;
alter table public.problems drop column source;
alter table public.problems drop column external_url;
alter table public.problems drop column difficulty;
alter table public.problems drop constraint problems_tags_limits_check;
alter table public.problems drop constraint problems_statement_length_check;
alter table public.problems add constraint problems_tags_limits_check check (public.valid_problem_tags(tags));
alter table public.problems add constraint problems_statement_length_check
  check (statement_md ~ '[^[:space:]]' and char_length(statement_md) <= 1000);
alter table public.problems add constraint problems_source_urls_check check (public.valid_content_urls(source_urls));
alter table public.problems add constraint problems_similar_urls_check check (public.valid_content_urls(similar_urls));

alter table public.solutions drop column algorithm;
alter table public.solutions drop column code;
alter table public.solutions drop column language;
alter table public.solutions drop column time_complexity;
alter table public.solutions drop column space_complexity;
alter table public.solutions drop column status;
alter table public.solutions alter column original_url set not null;
alter table public.solutions add constraint solutions_original_url_check check (public.valid_content_url(original_url));
alter table public.solutions drop constraint solutions_content_length_check;
alter table public.solutions add constraint solutions_content_length_check
  check (content_md ~ '[^[:space:]]' and char_length(content_md) <= 1000);

-- Preserve the existing owner policies and immutable ID/owner/target/date grants.
revoke all on public.problems, public.solutions, public.comments from anon, authenticated;
grant select on public.problems, public.solutions, public.comments to anon, authenticated;
grant insert(title, source_urls, similar_urls, tags, statement_md) on public.problems to authenticated;
grant update(title, source_urls, similar_urls, tags, statement_md) on public.problems to authenticated;
grant delete on public.problems to authenticated;
grant insert(problem_id, title, content_md, original_url) on public.solutions to authenticated;
grant update(title, content_md, original_url) on public.solutions to authenticated;
grant delete on public.solutions to authenticated;
grant insert(target_type, target_id, content_md) on public.comments to authenticated;
grant update(content_md) on public.comments to authenticated;
grant delete on public.comments to authenticated;
revoke all on function public.valid_content_url(text), public.valid_content_urls(text[]),
  public.valid_problem_tags(text[]) from public, anon, authenticated;
grant execute on function public.valid_content_url(text), public.valid_content_urls(text[]),
  public.valid_problem_tags(text[]) to public;

create view public.problem_summaries with (security_invoker = true) as
select p.*, (select count(*) from public.solutions s where s.problem_id = p.id)::integer as solution_count
from public.problems p;
create view public.solution_summaries with (security_invoker = true) as
select s.* from public.solutions s;
revoke all on public.problem_summaries, public.solution_summaries from public, anon, authenticated;
grant select on public.problem_summaries, public.solution_summaries to anon, authenticated;
commit;
