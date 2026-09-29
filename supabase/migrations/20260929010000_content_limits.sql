-- Enforce application limits for writes made directly through the database API.
create function public.valid_problem_tags(p_tags text[]) returns boolean
language sql immutable strict set search_path = '' as $$
  select coalesce(array_ndims(p_tags), 1) = 1
    and cardinality(p_tags) <= 12
    and cardinality(p_tags) = (select count(distinct tag.value) from unnest(p_tags) as tag(value))
    and not exists (
      select 1 from unnest(p_tags) as tag(value)
      where tag.value is null
        or char_length(tag.value) > 32
        or tag.value = ''
        or tag.value ~ '^[[:space:]]'
        or tag.value ~ '[[:space:]]$'
    );
$$;

alter table public.problems
  add constraint problems_tags_limits_check check (public.valid_problem_tags(tags)),
  add constraint problems_statement_length_check check (char_length(statement_md) <= 100000);

alter table public.solutions
  add constraint solutions_content_length_check check (char_length(content_md) <= 100000),
  add constraint solutions_code_length_check check (char_length(code) <= 100000);

alter table public.hacks
  add constraint hacks_content_length_check check (char_length(content_md) <= 100000),
  add constraint hacks_input_length_check check (char_length(input_data) <= 30000),
  add constraint hacks_expected_length_check check (char_length(expected_output) <= 30000),
  add constraint hacks_actual_length_check check (char_length(actual_output) <= 30000);

alter table public.comments
  add constraint comments_content_length_check check (char_length(content_md) <= 20000);
