\set ON_ERROR_STOP on
begin;
do $$
begin
  if (select source_urls from public.problems where id='b3000000-0000-4000-8000-000000000001') <> array['https://example.org/legacy'] then
    raise exception 'External URL was not migrated';
  end if;
  if (select similar_urls from public.problems where id='b3000000-0000-4000-8000-000000000001') <> '{}'::text[] then
    raise exception 'Similar URLs default wrong';
  end if;
  if (select original_url from public.solutions where id='c3000000-0000-4000-8000-000000000001') <> 'https://example.org/solution' then
    raise exception 'Solution URL was not preserved';
  end if;
  if (select content_md from public.solutions where id='c3000000-0000-4000-8000-000000000001') <> 'Legacy summary' then
    raise exception 'Solution summary changed';
  end if;
  if (select count(*) from public.comments where id='e3000000-0000-4000-8000-000000000001') <> 1
    or (select count(*) from public.comments where id='e3000000-0000-4000-8000-000000000002') <> 0 then
    raise exception 'Comment preservation/removal wrong';
  end if;
end;
$$;
rollback;
