\set ON_ERROR_STOP on
-- Run only against a disposable Supabase database. The transaction always rolls back.
begin;

do $$
declare view_name text; role_name text; privilege_name text;
begin
  foreach view_name in array array['public.problem_summaries','public.solution_summaries','public.hack_summaries'] loop
    foreach role_name in array array['anon','authenticated'] loop
      if not has_table_privilege(role_name, view_name, 'SELECT') then
        raise exception '% cannot read %', role_name, view_name;
      end if;
      foreach privilege_name in array array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
        if has_table_privilege(role_name, view_name, privilege_name) then
          raise exception '% has unexpected % on %', role_name, privilege_name, view_name;
        end if;
      end loop;
    end loop;
  end loop;
end;
$$;

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data)
values
('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'openoi-a@example.invalid', '', '{"username":"author_a"}'),
('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'openoi-b@example.invalid', '', '{"username":"author_b"}'),
('a0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'openoi-c@example.invalid', '', '{"username":"voter_c"}'),
('a0000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'openoi-d@example.invalid', '', '{"username":"voter_d"}');

do $$
begin
  if (select count(*) from public.profiles where username in ('author_a','author_b','voter_c','voter_d')) <> 4 then
    raise exception 'Registration profile trigger failed';
  end if;
  begin
    insert into auth.users(id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data)
    values ('a0000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'openoi-bad@example.invalid', '', '{"username":"Bad Name"}');
    raise exception 'Invalid username accepted';
  exception when check_violation then null;
  end;
end;
$$;

insert into public.problems(id,created_by,title,difficulty,statement_md)
values ('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Fixture','easy','Statement');
insert into public.solutions(id,problem_id,author_id,title,content_md)
values ('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Solution','Content');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);

do $$
begin
  begin
    perform public.set_vote('solution','c0000000-0000-4000-8000-000000000001',1);
    raise exception 'Self-vote accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'update public.solutions set status = ''hacked'' where id = ''c0000000-0000-4000-8000-000000000001''';
    raise exception 'Direct status edit accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'insert into public.solutions(problem_id,author_id,title,content_md) values (''b0000000-0000-4000-8000-000000000001'',''a0000000-0000-4000-8000-000000000002'',''Forged'',''x'')';
    raise exception 'Forged author accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'insert into public.hacks(solution_id,type,content_md) values (''c0000000-0000-4000-8000-000000000001'',''logic'',''x'')';
    raise exception 'Direct hack insert accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'insert into public.votes(target_type,target_id,value) values (''solution'',''c0000000-0000-4000-8000-000000000001'',1)';
    raise exception 'Direct vote insert accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'update public.problems set created_by = ''a0000000-0000-4000-8000-000000000002'' where id = ''b0000000-0000-4000-8000-000000000001''';
    raise exception 'Creator edit accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
select public.create_hack('c0000000-0000-4000-8000-000000000001','counterexample','Evidence','','1','2') as hack_id \gset
select set_config('openoi.test_hack_id', :'hack_id', true);

do $$
begin
  if (select status from public.solutions where id = 'c0000000-0000-4000-8000-000000000001') <> 'disputed' then
    raise exception 'Unvoted hack must dispute solution';
  end if;
  begin
    perform public.set_vote('hack', current_setting('openoi.test_hack_id')::uuid, 1);
    raise exception 'Hack self-vote accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.comments(target_type,target_id,content_md)
    values ('hack','d0000000-0000-4000-8000-000000000099','orphan');
    raise exception 'Orphan comment accepted';
  exception when foreign_key_violation then null;
  end;
  begin
    perform public.set_vote('hack','d0000000-0000-4000-8000-000000000099',1);
    raise exception 'Orphan vote accepted';
  exception when no_data_found then null;
  end;
  begin
    update public.problems set title = 'Hijacked' where id = 'b0000000-0000-4000-8000-000000000001';
    if found then raise exception 'Other author problem edit accepted'; end if;
  end;
  begin
    update public.solutions set content_md = 'Hijacked' where id = 'c0000000-0000-4000-8000-000000000001';
    if found then raise exception 'Other author solution edit accepted'; end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000003', true);
select public.set_vote('hack', current_setting('openoi.test_hack_id')::uuid, 1);
do $$ begin
  if (select status from public.hacks where id = current_setting('openoi.test_hack_id')::uuid) <> 'valid' then raise exception 'Valid vote missed'; end if;
  if (select status from public.solutions where id = 'c0000000-0000-4000-8000-000000000001') <> 'hacked' then raise exception 'Solution not hacked'; end if;
end $$;
select public.set_vote('solution', 'c0000000-0000-4000-8000-000000000001', 1);
do $$ begin
  if (select vote_count from public.solution_summaries where id = 'c0000000-0000-4000-8000-000000000001') <> 1 then raise exception 'Solution useful vote missed'; end if;
  begin
    perform public.set_vote('solution', 'c0000000-0000-4000-8000-000000000001', -1);
    raise exception 'Negative solution vote accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.set_vote(null, 'c0000000-0000-4000-8000-000000000001', 1);
    raise exception 'Missing vote type accepted';
  exception when invalid_parameter_value then null;
  end;
end $$;
select public.set_vote('solution', 'c0000000-0000-4000-8000-000000000001', null);
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
update public.solutions set content_md = 'Edited response' where id = 'c0000000-0000-4000-8000-000000000001';
do $$ begin
  if (select status from public.solutions where id = 'c0000000-0000-4000-8000-000000000001') <> 'hacked' then raise exception 'Editing content cleared hack status'; end if;
  begin
    perform public.delete_hack(current_setting('openoi.test_hack_id')::uuid);
    raise exception 'Other author hack deletion accepted';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000004', true);
select public.set_vote('hack', current_setting('openoi.test_hack_id')::uuid, -1);
do $$ begin
  if (select status from public.hacks where id = current_setting('openoi.test_hack_id')::uuid) <> 'pending' then raise exception 'Tie not pending'; end if;
end $$;
select public.set_vote('hack', current_setting('openoi.test_hack_id')::uuid, 1);
do $$ begin
  if (select status from public.hacks where id = current_setting('openoi.test_hack_id')::uuid) <> 'valid' then raise exception 'Vote switch failed'; end if;
end $$;
select public.set_vote('hack', current_setting('openoi.test_hack_id')::uuid, null);
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000003', true);
select public.set_vote('hack', current_setting('openoi.test_hack_id')::uuid, -1);
do $$ begin
  if (select status from public.hacks where id = current_setting('openoi.test_hack_id')::uuid) <> 'invalid' then raise exception 'Retract/revote failed'; end if;
  if (select status from public.solutions where id = 'c0000000-0000-4000-8000-000000000001') <> 'normal' then raise exception 'Invalid-only solution not normal'; end if;
end $$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
select public.create_hack('c0000000-0000-4000-8000-000000000001','logic','Second evidence','','','') as second_hack_id \gset
select set_config('openoi.test_second_hack_id', :'second_hack_id', true);
do $$ begin
  if (select status from public.solutions where id = 'c0000000-0000-4000-8000-000000000001') <> 'disputed' then raise exception 'Pending priority failed'; end if;
end $$;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000004', true);
select public.set_vote('hack', current_setting('openoi.test_second_hack_id')::uuid, 1);
do $$ begin
  if (select status from public.solutions where id = 'c0000000-0000-4000-8000-000000000001') <> 'hacked' then raise exception 'Valid priority failed'; end if;
end $$;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
select public.delete_hack(:'second_hack_id');
do $$ begin
  if (select status from public.solutions where id = 'c0000000-0000-4000-8000-000000000001') <> 'normal' then raise exception 'Delete last valid failed'; end if;
end $$;
select public.delete_hack(:'hack_id');

insert into public.comments(target_type,target_id,content_md)
values ('solution','c0000000-0000-4000-8000-000000000001','Author reply');
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
delete from public.problems where id = 'b0000000-0000-4000-8000-000000000001';
do $$ begin
  if exists(select 1 from public.solutions where id = 'c0000000-0000-4000-8000-000000000001') then raise exception 'Solution cascade failed'; end if;
  if exists(select 1 from public.comments where target_id = 'c0000000-0000-4000-8000-000000000001') then raise exception 'Comment cascade failed'; end if;
end $$;

set local role anon;
select count(*) from public.problem_summaries;
select count(*) from public.solution_summaries;
select count(*) from public.hack_summaries;
do $$
begin
  begin
    insert into public.problems(title,difficulty,statement_md) values ('Anonymous','easy','x');
    raise exception 'Anonymous write accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;
rollback;
