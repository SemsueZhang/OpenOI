import type { ReactNode } from 'react';
export function Badge({ children, tone = 'stone' }: { children: ReactNode; tone?: 'stone' | 'green' | 'amber' | 'red' | 'blue' }) {
  const colors = { stone: 'border-edge bg-panel-elevated text-muted', green: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300', amber: 'border-amber-400/30 bg-amber-400/10 text-amber-300', red: 'border-rose-400/30 bg-rose-500/10 text-rose-300', blue: 'border-electric/30 bg-electric/10 text-electric' };
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide ${colors[tone]}`}>{children}</span>;
}
