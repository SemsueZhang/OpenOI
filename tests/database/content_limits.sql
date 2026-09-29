\set ON_ERROR_STOP on
begin;
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data)
values ('a2000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'openoi-limits-a@example.invalid', '', '{"username":"limits_author"}');
insert into public.problems(id,created_by,title,statement_md)
values ('b2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','Limits','Statement');
insert into public.solutions(id,problem_id,author_id,title,content_md,original_url)
values ('c2000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','Solution','Summary','https://example.org/solution');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-000000000001', true);

-- Inclusive boundaries and Unicode codepoint counts.
update public.problems set statement_md = repeat('🙂',1000),
  tags = array['图论','数据结构','组合优化','数学','搜索','计算几何','字符串','特殊题型'],
  source_urls = array(select 'https://example.org/' || n from generate_series(1,20) as n),
  similar_urls = array['http://example.org/similar']
where id = 'b2000000-0000-4000-8000-000000000001';
update public.solutions set content_md = repeat('🙂',1000) where id = 'c2000000-0000-4000-8000-000000000001';
insert into public.comments(target_type,target_id,content_md)
values ('solution','c2000000-0000-4000-8000-000000000001',repeat('🙂',100));

do $$
begin
  begin update public.problems set statement_md = repeat('🙂',1001); raise exception 'Oversized statement accepted';
    exception when check_violation then null; end;
  begin update public.problems set statement_md = E'\n\t'; raise exception 'Blank statement accepted';
    exception when check_violation then null; end;
  begin update public.problems set tags = array['other']; raise exception 'Unknown tag accepted';
    exception when check_violation then null; end;
  begin update public.problems set tags = array['数学','数学']; raise exception 'Duplicate tag accepted';
    exception when check_violation then null; end;
  begin update public.problems set tags = array[['数学','搜索']]; raise exception 'Nested tags accepted';
    exception when check_violation then null; end;
  begin update public.problems set source_urls = array(select 'https://example.org/' || n from generate_series(1,21) as n); raise exception '21 URLs accepted';
    exception when check_violation then null; end;
  begin update public.problems set source_urls = array['https://example.org/a','https://example.org/a']; raise exception 'Duplicate URL accepted';
    exception when check_violation then null; end;
  begin update public.problems set source_urls = array['https://example.org/a',null]::text[]; raise exception 'Null URL accepted';
    exception when check_violation then null; end;
  begin update public.problems set source_urls = array['ftp://example.org/a']; raise exception 'Non-HTTP URL accepted';
    exception when check_violation then null; end;
  begin update public.problems set similar_urls = array['https://example.org/' || repeat('x',2049)]; raise exception 'Oversized URL accepted';
    exception when check_violation then null; end;
  begin update public.solutions set original_url = 'https://example.org/with space'; raise exception 'Whitespace URL accepted';
    exception when check_violation then null; end;
  begin update public.solutions set content_md = repeat('🙂',1001); raise exception 'Oversized summary accepted';
    exception when check_violation then null; end;
  begin update public.solutions set content_md = E'\t'; raise exception 'Blank summary accepted';
    exception when check_violation then null; end;
  begin insert into public.comments(target_type,target_id,content_md) values ('solution','c2000000-0000-4000-8000-000000000001',repeat('🙂',101)); raise exception 'Oversized comment accepted';
    exception when check_violation then null; end;
  begin insert into public.comments(target_type,target_id,content_md) values ('solution','c2000000-0000-4000-8000-000000000001',' '); raise exception 'Blank comment accepted';
    exception when check_violation then null; end;
end;
$$;
rollback;
