\set ON_ERROR_STOP on
-- Seed after historical migrations, before the reduction migration.
insert into auth.users(id,email,raw_user_meta_data)
values ('a3000000-0000-4000-8000-000000000001','openoi-migration@example.invalid','{"username":"migration_author"}');
insert into public.problems(id,created_by,title,source,external_url,difficulty,tags,statement_md)
values ('b3000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Legacy','Old source','https://example.org/legacy','medium',array['图论'],'Legacy statement');
insert into public.solutions(id,problem_id,author_id,title,content_md)
values ('c3000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Legacy solution','Legacy summary');
insert into public.hacks(id,solution_id,author_id,type,content_md)
values ('d3000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','logic','Retired hack');
insert into public.comments(id,author_id,target_type,target_id,content_md)
values
('e3000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','solution','c3000000-0000-4000-8000-000000000001','Retained comment'),
('e3000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000001','hack','d3000000-0000-4000-8000-000000000001','Retired comment');
