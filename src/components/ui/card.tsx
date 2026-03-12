import type { JSX } from 'preact';
import { cn } from '../../utils/cn';

type DivProps = JSX.HTMLAttributes<HTMLDivElement>;

type HeadingProps = JSX.HTMLAttributes<HTMLHeadingElement>;

type ParagraphProps = JSX.HTMLAttributes<HTMLParagraphElement>;

export function Card({ class: className, ...props }: DivProps) {
  return (
    <div
      class={cn(
        'rounded-3xl border border-white/10 bg-white/5 shadow-[0_24px_60px_rgba(0,0,0,0.4)]',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ class: className, ...props }: DivProps) {
  return <div class={cn('space-y-2 p-6', className)} {...props} />;
}

export function CardTitle({ class: className, ...props }: HeadingProps) {
  return <h3 class={cn('text-lg font-semibold text-white', className)} {...props} />;
}

export function CardDescription({ class: className, ...props }: ParagraphProps) {
  return <p class={cn('text-sm text-neutral-400', className)} {...props} />;
}

export function CardContent({ class: className, ...props }: DivProps) {
  return <div class={cn('px-6 pb-6', className)} {...props} />;
}

export function CardFooter({ class: className, ...props }: DivProps) {
  return <div class={cn('flex items-center gap-3 px-6 pb-6', className)} {...props} />;
}
