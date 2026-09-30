#!/usr/bin/env python3
"""Collect public NOI problem statements for editorial review."""
import concurrent.futures
import html
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

OUT = Path('/tmp/openoi-noi-source.json')
HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; OpenOI editorial research)'}


def get_context(url):
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=30) as response:
        page = response.read().decode('utf-8')
    match = re.search(r'<script id="lentille-context" type="application/json">(.*?)</script>', page)
    if not match:
        raise ValueError(f'Missing page data: {url}')
    return json.loads(html.unescape(match.group(1)))


def list_year(year):
    keyword = f'NOI{year}'
    url = 'https://www.luogu.com.cn/problem/list?' + urllib.parse.urlencode({'keyword': keyword, 'page': 1})
    info = get_context(url)['data']['problems']
    found = [p for p in info['result'] if re.match(r'^\[NOI\s*' + str(year) + r'\]', p['name'], re.I)]
    if len(found) < 6 and info['count'] > info['perPage']:
        for page in range(2, min(20, (info['count'] - 1) // info['perPage'] + 2)):
            u = 'https://www.luogu.com.cn/problem/list?' + urllib.parse.urlencode({'keyword': keyword, 'page': page})
            found += [p for p in get_context(u)['data']['problems']['result'] if re.match(r'^\[NOI\s*' + str(year) + r'\]', p['name'], re.I)]
            if len(found) >= 6:
                break
    return year, [{'pid': p['pid'], 'name': p['name']} for p in found]


def get_problem(problem):
    p = get_context('https://www.luogu.com.cn/problem/' + problem['pid'])['data']['problem']
    c = p.get('content') or p.get('contenu') or {}
    return {**problem, 'description': c.get('description', ''), 'hint': c.get('hint', ''),
            'formatI': c.get('formatI', ''), 'formatO': c.get('formatO', ''),
            'url': 'https://www.luogu.com.cn/problem/' + problem['pid']}


def main():
    years = [y for y in range(2001, 2027) if y != 2004]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = dict(pool.map(list_year, years))
    for year in years:
        print(year, len(results[year]), [p['pid'] for p in results[year]], flush=True)
    problems = [{**p, 'year': y} for y in years for p in results[y]]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        details = list(pool.map(get_problem, problems))
    OUT.write_text(json.dumps(details, ensure_ascii=False, indent=2) + '\n')
    print('Saved', len(details), 'problems to', OUT)


if __name__ == '__main__':
    main()
