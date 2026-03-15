import type { JSX } from 'preact';
import { cn } from '../../utils/cn';
import { getCurrentTheme, THEME_COLORS } from '../../utils/theme';

export type RangeProps = JSX.InputHTMLAttributes<HTMLInputElement> & {
  progress?: number;
};

export function Range({ class: className, progress = 0, ...props }: RangeProps) {
  return (
    <input
      type="range"
      class={cn(
        'h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10',
        className
      )}
      style={{
        background: `linear-gradient(90deg, var(--theme-primary) ${progress * 100}%, rgba(255,255,255,0.1) 0%)`,
      }}
      {...props}
    />
  );
}
