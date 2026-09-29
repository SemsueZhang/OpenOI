'use client';
import { Markdown } from '@/components/markdown';

const aliases: Record<string, string> = { 'c++': 'cpp', 'c++17': 'cpp', 'c++20': 'cpp', 'c++23': 'cpp', 'python3': 'python', 'py3': 'python', 'js': 'javascript', 'ts': 'typescript', 'golang': 'go' };
export function CodeBlock({ code, language }: { code: string; language: string | null }) {
  const fence = '`'.repeat(Math.max(3, ...Array.from(code.matchAll(/`+/g), match => match[0].length + 1)));
  const normalized = (language || '').trim().toLowerCase();
  const safeLanguage = (aliases[normalized] || normalized).replace(/[^a-z0-9-]/g, '').slice(0, 30);
  return <Markdown>{`${fence}${safeLanguage}\n${code}\n${fence}`}</Markdown>;
}
