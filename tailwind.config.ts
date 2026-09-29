import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: { colors: {
    void: 'rgb(var(--void-rgb) / <alpha-value>)', panel: 'rgb(var(--panel-rgb) / <alpha-value>)', 'panel-elevated': 'rgb(var(--panel-elevated-rgb) / <alpha-value>)', edge: 'rgb(var(--edge-rgb) / <alpha-value>)',
    ink: 'rgb(var(--ink-rgb) / <alpha-value>)', muted: 'rgb(var(--muted-rgb) / <alpha-value>)', dim: 'rgb(var(--dim-rgb) / <alpha-value>)', electric: 'rgb(var(--electric-rgb) / <alpha-value>)', violet: 'rgb(var(--violet-rgb) / <alpha-value>)'
  }, fontFamily: { mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'] } } },
  plugins: [typography]
} satisfies Config;
