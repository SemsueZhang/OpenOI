\set ON_ERROR_STOP on
begin;

do $$
begin
  if (select count(*) from public.problems where import_key like 'noi:%') <> 150 then
    raise exception 'Expected 150 imported NOI problems';
  end if;
  if exists (
    select 1 from public.problems where import_key like 'noi:%'
      and (created_by is not null or cardinality(source_urls) not between 1 and 2
        or statement_md not like '### 形式化题意%### 数据范围%'
        or statement_md like '%### 输入%'
        or statement_md like '%### 输出%'
        or char_length(statement_md) > 1000)
  ) then
    raise exception 'Imported NOI problem content or ownership is invalid';
  end if;
  if exists (
    select substring(title from '^\[NOI([0-9]{4})\]') as year
    from public.problems where import_key like 'noi:%'
    group by 1 having count(*) <> 6
  ) or (select count(distinct substring(title from '^\[NOI([0-9]{4})\]'))
        from public.problems where import_key like 'noi:%') <> 25 then
    raise exception 'Imported NOI year distribution is invalid';
  end if;
  if (select count(*) from public.problems where import_key in (
    'noi:2002:guoj1224', 'noi:2002:guoj1227',
    'noi:2003:guoj1231', 'noi:2003:guoj1233',
    'noi:2005:guoj1245', 'noi:2006:guoj1248')) <> 6 then
    raise exception 'The six archival NOI problems are missing';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
do $$
begin
  update public.problems set title = 'Hijacked' where import_key = 'noi:2002:guoj1224';
  if found then raise exception 'Authenticated user edited an imported problem'; end if;
  delete from public.problems where import_key = 'noi:2002:guoj1224';
  if found then raise exception 'Authenticated user deleted an imported problem'; end if;
  begin
    execute 'insert into public.problems(import_key,title,statement_md) values (''noi:fake'', ''Fake'', ''Fake'')';
    raise exception 'Authenticated user forged an imported problem';
  exception when insufficient_privilege then null; end;
end;
$$;

rollback;
