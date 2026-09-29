import { forwardRef, type InputHTMLAttributes } from 'react';
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`h-10 w-full rounded-lg border border-edge bg-panel-elevated px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-electric focus:ring-2 focus:ring-electric/20 ${className}`} {...props} />;
});
