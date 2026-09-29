import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' };
export const Button = forwardRef<HTMLButtonElement, Props>(function Button({ className = '', variant = 'primary', size = 'md', ...props }, ref) {
  return <button ref={ref} className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric disabled:cursor-not-allowed disabled:opacity-50 ${size === 'sm' ? 'min-h-8 px-3 text-sm' : 'min-h-10 px-4 text-sm'} ${variant === 'primary' ? 'btn-electric text-white ' : variant === 'secondary' ? 'border border-edge bg-panel text-ink hover:bg-panel-elevated' : variant === 'danger' ? 'border border-rose-400/30 bg-panel text-rose-300 hover:bg-rose-500/10' : 'text-muted hover:bg-panel-elevated'} ${className}`} {...props} />;
});
