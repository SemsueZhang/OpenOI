import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const usernameSchema = z.string().trim().regex(/^[a-z0-9_]{3,32}$/, 'invalid_username');
export const httpUrlSchema = z.string().trim().max(2048).url().refine((value) => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}, '仅支持 HTTP 或 HTTPS URL');

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
  if (tags.length > 12 || tags.some((tag) => tag.length > 32)) throw new Error('标签最多 12 个，每个不超过 32 字');
  return tags;
}
