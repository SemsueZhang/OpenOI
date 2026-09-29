\set ON_ERROR_STOP on
-- Authenticated database writes and RPC calls bypass the Next.js validators.
-- Fixtures and accepted boundary writes are rolled back after assertion.
begin;

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data)
values
('a2000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'openoi-limits-a@example.invalid', '', '{"username":"limits_author"}'),
('a2000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'openoi-limits-b@example.invalid', '', '{"username":"limits_hacker"}');
insert into public.problems(id, created_by, title, difficulty, statement_md)
values ('b2000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'Limits fixture', 'easy', 'Statement');
insert into public.solutions(id, problem_id, author_id, title, content_md)
values ('c2000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'Limits solution', 'Content');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-000000000001', true);

-- Maximum accepted values prove the checks are inclusive.
update public.problems set statement_md = repeat('x', 100000),
  tags = array(select repeat('t', 30) || lpad(n::text, 2, '0') from generate_series(1, 12) as n)
where id = 'b2000000-0000-4000-8000-000000000001';
update public.solutions set content_md = repeat('x', 100000), code = repeat('x', 100000)
where id = 'c2000000-0000-4000-8000-000000000001';

do $$
begin
  begin
    update public.problems set statement_md = repeat('x', 100001) where id = 'b2000000-0000-4000-8000-000000000001';
    raise exception 'Oversized statement accepted';
  exception when check_violation then null; end;
  begin
    update public.problems set tags = array(select 'tag' || n from generate_series(1, 13) as n) where id = 'b2000000-0000-4000-8000-000000000001';
    raise exception 'Thirteen tags accepted';
  exception when check_violation then null; end;
  begin
    update public.problems set tags = array[repeat('x', 33)] where id = 'b2000000-0000-4000-8000-000000000001';
    raise exception 'Oversized tag accepted';
  exception when check_violation then null; end;
  begin
    update public.problems set tags = array['valid', null]::text[] where id = 'b2000000-0000-4000-8000-000000000001';
    raise exception 'Null tag accepted';
  exception when check_violation then null; end;
  begin
    update public.problems set tags = array['  '] where id = 'b2000000-0000-4000-8000-000000000001';
    raise exception 'Blank tag accepted';
  exception when check_violation then null; end;
  begin
    update public.problems set tags = array[E'\t'] where id = 'b2000000-0000-4000-8000-000000000001';
    raise exception 'Tab-only tag accepted';
  exception when check_violation then null; end;
  begin
    update public.problems set tags = array[E'\n'] where id = 'b2000000-0000-4000-8000-000000000001';
    raise exception 'Newline-only tag accepted';
  exception when check_violation then null; end;
  begin
    update public.problems set tags = array[' padded '] where id = 'b2000000-0000-4000-8000-000000000001';
    raise exception 'Untrimmed tag accepted';
  exception when check_violation then null; end;
  begin
    update public.problems set tags = array[E'\tpadded'] where id = 'b2000000-0000-4000-8000-000000000001';
    raise exception 'Tab-padded tag accepted';
  exception when check_violation then null; end;
  begin
    update public.problems set tags = array['duplicate', 'duplicate'] where id = 'b2000000-0000-4000-8000-000000000001';
    raise exception 'Duplicate tags accepted';
  exception when check_violation then null; end;
  begin
    update public.problems set tags = array[['nested', 'tags']] where id = 'b2000000-0000-4000-8000-000000000001';
    raise exception 'Multidimensional tags accepted';
  exception when check_violation then null; end;
  begin
    update public.solutions set content_md = repeat('x', 100001) where id = 'c2000000-0000-4000-8000-000000000001';
    raise exception 'Oversized solution accepted';
  exception when check_violation then null; end;
  begin
    update public.solutions set code = repeat('x', 100001) where id = 'c2000000-0000-4000-8000-000000000001';
    raise exception 'Oversized code accepted';
  exception when check_violation then null; end;
end;
$$;

select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-000000000002', true);
select public.create_hack('c2000000-0000-4000-8000-000000000001', 'logic', 'Evidence', '', '', '') as hack_id \gset
select set_config('openoi.limits_hack_id', :'hack_id', true);

update public.hacks set content_md = repeat('x', 100000), input_data = repeat('x', 30000),
  expected_output = repeat('x', 30000), actual_output = repeat('x', 30000)
where id = current_setting('openoi.limits_hack_id')::uuid;
insert into public.comments(target_type, target_id, content_md)
values ('solution', 'c2000000-0000-4000-8000-000000000001', repeat('x', 20000));

do $$
begin
  begin
    perform public.create_hack('c2000000-0000-4000-8000-000000000001', 'logic', repeat('x', 100001), '', '', '');
    raise exception 'Oversized hack RPC accepted';
  exception when check_violation then null; end;
  begin
    update public.hacks set content_md = repeat('x', 100001) where id = current_setting('openoi.limits_hack_id')::uuid;
    raise exception 'Oversized hack content accepted';
  exception when check_violation then null; end;
  begin
    update public.hacks set input_data = repeat('x', 30001) where id = current_setting('openoi.limits_hack_id')::uuid;
    raise exception 'Oversized input accepted';
  exception when check_violation then null; end;
  begin
    update public.hacks set expected_output = repeat('x', 30001) where id = current_setting('openoi.limits_hack_id')::uuid;
    raise exception 'Oversized expected output accepted';
  exception when check_violation then null; end;
  begin
    update public.hacks set actual_output = repeat('x', 30001) where id = current_setting('openoi.limits_hack_id')::uuid;
    raise exception 'Oversized actual output accepted';
  exception when check_violation then null; end;
  begin
    insert into public.comments(target_type, target_id, content_md)
    values ('solution', 'c2000000-0000-4000-8000-000000000001', repeat('x', 20001));
    raise exception 'Oversized comment insert accepted';
  exception when check_violation then null; end;
  begin
    update public.comments set content_md = repeat('x', 20001)
    where target_id = 'c2000000-0000-4000-8000-000000000001';
    raise exception 'Oversized comment edit accepted';
  exception when check_violation then null; end;
end;
$$;

rollback;
