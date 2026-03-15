import type { JSX } from 'preact';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        default: 'bg-[var(--theme-primary)] text-neutral-950 hover:bg-[var(--theme-primary-hover)]',
        secondary: 'bg-white/10 text-white hover:bg-white/20',
        outline: 'border border-white/20 text-white hover:bg-white/10',
        ghost: 'text-white hover:bg-white/10',
      },
      size: {
        sm: 'h-8 px-4',
        md: 'h-10 px-5',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    type?: 'button' | 'submit' | 'reset';
  };

export function Button({ class: className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      class={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
