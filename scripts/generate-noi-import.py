#!/usr/bin/env python3
"""Generate the reviewed NOI problem import migration from data/noi-*.json."""
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
METADATA = ROOT / 'data/noi-metadata.json'
EDITORIAL = ROOT / 'data/noi-editorial.json'
MIGRATION = ROOT / 'supabase/migrations/20260930000000_import_noi_problems.sql'


def sql(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def generate() -> str:
    problems = json.loads(METADATA.read_text())
    editorial = json.loads(EDITORIAL.read_text())
    ids = [p['pid'] for p in problems]
    years = Counter(p['year'] for p in problems)
    assert len(problems) == len(editorial) == len(set(ids)) == 150
    assert set(ids) == set(editorial)
    assert years == {year: 6 for year in range(2001, 2027) if year != 2004}

    rows = []
    for problem in problems:
        pid = problem['pid']
        summary, bounds = editorial[pid]
        assert summary.strip() and bounds.strip() and 2001 <= problem['year'] <= 2026
        statement = f'### 形式化题意\n\n{summary}\n\n### 数据范围\n\n{bounds}'
        assert len(statement) <= 1000, pid
        assert problem['url'].startswith('https://')
        urls = [problem['url']]
        if problem.get('archive_url'):
            assert problem['archive_url'].startswith('https://')
            urls.append(problem['archive_url'])
        key = f'noi:{problem["year"]}:{pid.lower()}'
        title = f'[NOI{problem["year"]}] {problem["title"]}'
        assert len(title) <= 200
        rows.append('  (' + ', '.join(map(sql, (key, title, statement)))
                    + ', array[' + ', '.join(map(sql, urls)) + '])')

    return '''-- Import each QOJ NOI category problem as a normal OpenOI problem.
-- These editorial summaries have no user owner; user-authored problems retain
-- the auth.uid() default and existing owner-only RLS/grants.
begin;

alter table public.problems alter column created_by drop not null;
alter table public.problems add column import_key text;
alter table public.problems add constraint problems_import_key_length_check
  check (import_key is null or char_length(import_key) between 1 and 80);
alter table public.problems add constraint problems_import_key_unique unique (import_key);

insert into public.problems (import_key, created_by, title, statement_md, source_urls)
select import_key, null, title, statement_md, source_urls
from (values
''' + ',\n'.join(rows) + '''
) as source(import_key, title, statement_md, source_urls)
on conflict (import_key) do update
set title = excluded.title,
    statement_md = excluded.statement_md,
    source_urls = excluded.source_urls;

do $$
begin
  if (select count(*) from public.problems where import_key like 'noi:%') <> 150 then
    raise exception 'NOI import must contain exactly 150 problems';
  end if;
end;
$$;

commit;
'''


if __name__ == '__main__':
    content = generate()
    if len(sys.argv) == 2 and sys.argv[1] == '--check':
        assert MIGRATION.read_text() == content, 'NOI import migration is out of date'
        print('NOI import migration matches 150 reviewed problems')
    elif len(sys.argv) == 1:
        MIGRATION.write_text(content)
        print(f'Generated {MIGRATION}')
    else:
        raise SystemExit('usage: generate-noi-import.py [--check]')
