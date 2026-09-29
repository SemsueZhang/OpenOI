'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

function safeUrl(url: string, image: boolean) {
  try {
    if (image) return /^https?:\/\//i.test(url) && ['http:', 'https:'].includes(new URL(url).protocol) ? new URL(url).toString() : '';
    if (url.startsWith('#')) return url;
    const parsed = new URL(url, 'https://openoi.invalid');
    if (parsed.origin === 'https://openoi.invalid' && !url.startsWith('//')) return url;
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') return url;
  } catch { /* Invalid URL. */ }
  return '';
}

export function Markdown({ children, className = '' }: { children: string; className?: string }) {
  return <div className={`prose prose-invert max-w-none break-words prose-headings:text-ink prose-p:text-ink/90 prose-strong:text-ink prose-a:text-electric hover:prose-a:text-violet prose-blockquote:border-violet prose-blockquote:text-muted prose-pre:overflow-x-auto prose-pre:border prose-pre:border-edge prose-pre:bg-void prose-img:max-w-full ${className}`}>
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { trust: false, strict: 'warn' }], rehypeHighlight]}
      skipHtml
      urlTransform={(url, key) => safeUrl(url, key === 'src')}
      components={{
        a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer nofollow" />,
        // User supplied URLs are validated above and must not be fetched by the Next image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        img: ({ node: _node, src, alt, ...props }) => typeof src === 'string' && safeUrl(src, true) ? <img {...props} src={src} alt={alt || ''} loading="lazy" /> : null,
      }}>
      {children}
    </ReactMarkdown>
  </div>;
}
