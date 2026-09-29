import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Markdown } from '../components/markdown';

function render(source: string) { return renderToStaticMarkup(createElement(Markdown, null, source)); }

test('rendered Markdown drops raw HTML and unsafe URL schemes', () => {
  const html = render('<script>alert(1)</script>\n\n[click](javascript:alert(1))\n\n![x](data:image/svg+xml,<svg/onload=alert(1)>)\n\n<img src=x onerror=alert(1)>');
  assert.doesNotMatch(html, /<script|<img|javascript:|data:image|onerror=/i);
});

test('KaTeX does not trust commands that could create unsafe links', () => {
  const html = render('$\\href{javascript:alert(1)}{click}$');
  assert.match(html, /katex/);
  assert.doesNotMatch(html, /href="javascript:/i);
});

test('GFM, mathematics and code highlighting render safely', () => {
  const html = render('| A | B |\n|---|---|\n| 1 | 2 |\n\n$x^2$\n\n```js\nconst s = "<script>";\n```');
  assert.match(html, /<table>/);
  assert.match(html, /katex/);
  assert.match(html, /hljs/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('code fences preserve C++17, Python, unknown languages and embedded backticks', () => {
  const html = render('```cpp\nstd::cout << "ok";\n```\n\n```python\nprint("ok")\n```\n\n```madeup-language\n<unsafe>\n```\n\n````text\ninside ``` fence\n````');
  assert.match(html, /std::cout/);
  assert.match(html, /print/);
  assert.match(html, /&lt;unsafe&gt;/);
  assert.match(html, /inside ``` fence/);
  assert.doesNotMatch(html, /<unsafe>/);
});
