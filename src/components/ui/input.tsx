import type { JSX } from 'preact';
import { cn } from '../../utils/cn';

export type InputProps = JSX.InputHTMLAttributes<HTMLInputElement> & {
  type?: string;
};

export function Input({ class: className, type = 'text', ...props }: InputProps) {
  return (
    <input
      type={type}
      class={cn(
        'h-11 w-full rounded-2xl border border-white/10 bg-neutral-950/40 px-4 text-sm text-neutral-100 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60',
        className
      )}
      {...props}
    />
  );
}
