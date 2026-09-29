\set ON_ERROR_STOP on
-- Run only against a disposable database. All fixture writes roll back.
begin;

do $$
begin
  if to_regclass('public.hacks') is not null or to_regclass('public.votes') is not null
     or to_regclass('public.hack_summaries') is not null
     or to_regprocedure('public.set_vote(text,uuid,integer)') is not null
     or to_regprocedure('public.create_hack(uuid,text,text,text,text,text)') is not null then
    raise exception 'Removed hack/vote schema remains';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'problems' and column_name in ('source','external_url','difficulty'))
    or exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'solutions' and column_name in ('algorithm','code','language','time_complexity','space_complexity','status')) then
    raise exception 'Removed columns remain';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'comments' and column_name = 'hack_target_id') then
    raise exception 'Hack comment FK remains';
  end if;
  if not has_table_privilege('anon','public.problem_summaries','SELECT')
    or not has_table_privilege('anon','public.solution_summaries','SELECT') then
    raise exception 'Summary view read grants missing';
  end if;
end;
$$;

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data)
values
('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'openoi-a@example.invalid', '', '{"username":"author_a"}'),
('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'openoi-b@example.invalid', '', '{"username":"author_b"}');

insert into public.problems(id,created_by,title,source_urls,similar_urls,tags,statement_md)
values ('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Fixture',array['https://example.org/problem'],array['https://example.org/similar'],array['图论','数学'],'Statement');
insert into public.solutions(id,problem_id,author_id,title,content_md,original_url)
values ('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Solution','Summary','https://example.org/solution');

do $$
begin
  if (select solution_count from public.problem_summaries where id = 'b0000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'Problem solution count incorrect';
  end if;
  if (select original_url from public.solution_summaries where id = 'c0000000-0000-4000-8000-000000000001') <> 'https://example.org/solution' then
    raise exception 'Solution view incorrect';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
do $$
begin
  update public.problems set title = 'Hijacked' where id = 'b0000000-0000-4000-8000-000000000001';
  if found then raise exception 'Other author edited problem'; end if;
  update public.solutions set content_md = 'Hijacked' where id = 'c0000000-0000-4000-8000-000000000001';
  if found then raise exception 'Other author edited solution'; end if;
  begin
    execute 'update public.problems set created_by = ''a0000000-0000-4000-8000-000000000002'' where id = ''b0000000-0000-4000-8000-000000000001''';
    raise exception 'Creator edit accepted';
  exception when insufficient_privilege then null; end;
  begin
    execute 'update public.solutions set problem_id = ''b0000000-0000-4000-8000-000000000001'' where id = ''c0000000-0000-4000-8000-000000000001''';
    raise exception 'Solution target edit accepted';
  exception when insufficient_privilege then null; end;
  begin
    execute 'insert into public.problems(created_by,title,statement_md) values (''a0000000-0000-4000-8000-000000000001'',''Forged'',''x'')';
    raise exception 'Forged problem author accepted';
  exception when insufficient_privilege then null; end;
  begin
    execute 'insert into public.solutions(problem_id,author_id,title,content_md,original_url) values (''b0000000-0000-4000-8000-000000000001'',''a0000000-0000-4000-8000-000000000001'',''Forged'',''x'',''https://example.org/x'')';
    raise exception 'Forged solution author accepted';
  exception when insufficient_privilege then null; end;
  begin
    execute 'insert into public.comments(author_id,target_type,target_id,content_md) values (''a0000000-0000-4000-8000-000000000001'',''solution'',''c0000000-0000-4000-8000-000000000001'',''Forged'')';
    raise exception 'Forged comment author accepted';
  exception when insufficient_privilege then null; end;
  begin
    execute 'insert into public.comments(solution_target_id,target_type,target_id,content_md) values (''c0000000-0000-4000-8000-000000000001'',''solution'',''c0000000-0000-4000-8000-000000000001'',''Forged'')';
    raise exception 'Generated target spoof accepted';
  exception when insufficient_privilege or sqlstate '428C9' then null; end;
  begin
    insert into public.comments(target_type,target_id,content_md)
    values ('hack','c0000000-0000-4000-8000-000000000001','No');
    raise exception 'Hack target comment accepted';
  exception when check_violation then null; end;
  begin
    insert into public.comments(target_type,target_id,content_md)
    values ('solution','c0000000-0000-4000-8000-000000000099','No');
    raise exception 'Orphan comment accepted';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.comments(target_type,content_md) values ('solution','No');
    raise exception 'Null comment target accepted';
  exception when not_null_violation then null; end;
  insert into public.comments(target_type,target_id,content_md)
  values ('solution','c0000000-0000-4000-8000-000000000001','Useful comment');
  begin
    execute 'update public.comments set target_id = ''c0000000-0000-4000-8000-000000000099'' where content_md = ''Useful comment''';
    raise exception 'Comment target edit accepted';
  exception when insufficient_privilege then null; end;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
do $$
begin
  update public.comments set content_md = 'Hijacked' where content_md = 'Useful comment';
  if found then raise exception 'Other author edited comment'; end if;
  delete from public.comments where content_md = 'Useful comment';
  if found then raise exception 'Other author deleted comment'; end if;
  update public.problems set title = 'Owner edit' where id = 'b0000000-0000-4000-8000-000000000001';
  if not found then raise exception 'Problem owner could not edit'; end if;
  update public.solutions set content_md = 'Owner summary' where id = 'c0000000-0000-4000-8000-000000000001';
  if not found then raise exception 'Solution owner could not edit'; end if;
  delete from public.problems where id = 'b0000000-0000-4000-8000-000000000001';
  if not found then raise exception 'Problem owner could not delete'; end if;
  if exists(select 1 from public.solutions where id='c0000000-0000-4000-8000-000000000001')
    or exists(select 1 from public.comments where target_id='c0000000-0000-4000-8000-000000000001') then
    raise exception 'Solution/comment cascade failed';
  end if;
end;
$$;

set local role anon;
select count(*) from public.problem_summaries;
select count(*) from public.solution_summaries;
do $$
begin
  begin
    insert into public.problems(title,statement_md) values ('Anonymous','x');
    raise exception 'Anonymous write accepted';
  exception when insufficient_privilege then null; end;
end;
$$;
rollback;
