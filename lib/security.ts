import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const usernameSchema = z.string().trim().regex(/^[a-z0-9_]{3,32}$/, 'invalid_username');
export const httpUrlSchema = z.string().trim().max(2048).url().refine((value) => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}, '仅支持 HTTP 或 HTTPS URL');

export const PROBLEM_TAGS = ['图论', '数据结构', '组合优化', '数学', '搜索', '计算几何', '字符串', '特殊题型'] as const;

/** JavaScript string length counts UTF-16 units; PostgreSQL char_length counts codepoints. */
export function characterCount(value: string): number { return Array.from(value).length; }

export function contentSchema(max: number) {
  return z.string().refine((value) => value.trim().length > 0 && characterCount(value) <= max);
}

export function optionalHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return httpUrlSchema.parse(trimmed);
}

/** Restrict auth redirects to normal same-origin paths. */
export function safeSitePath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('//') || decoded.includes('\\') || /[\u0000-\u001f\u007f]/.test(decoded)) return fallback;
    const parsed = new URL(value, 'https://openoi.invalid');
    if (parsed.origin !== 'https://openoi.invalid') return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch { return fallback; }
}

export function cleanTags(raw: string): string[] {
  const tags = [...new Set(raw.split(',').map((tag) => tag.trim()).filter(Boolean))];
  if (tags.some((tag) => !(PROBLEM_TAGS as readonly string[]).includes(tag))) throw new Error('无效的标签');
  return tags;
}

export function parseUrlLines(raw: string): string[] {
  const urls = raw.split(/\r?\n/).map((url) => url.trim()).filter(Boolean);
  if (urls.length > 20 || new Set(urls).size !== urls.length || urls.some((url) => !httpUrlSchema.safeParse(url).success)) {
    throw new Error('URL 列表无效');
  }
  return urls;
}
