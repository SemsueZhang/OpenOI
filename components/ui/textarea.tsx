import { forwardRef, type TextareaHTMLAttributes } from 'react';
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className = '', ...props }, ref) {
  return <textarea ref={ref} className={`w-full rounded-lg border border-edge bg-panel-elevated px-3 py-2 text-sm leading-6 text-ink outline-none placeholder:text-muted focus:border-electric focus:ring-2 focus:ring-electric/20 ${className}`} {...props} />;
});
