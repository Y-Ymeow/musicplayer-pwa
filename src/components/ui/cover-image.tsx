import { getCurrentTheme, THEME_COLORS } from '../../utils/theme';

interface CoverImageProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  class?: string;
}

const sizeClasses = {
  sm: 'h-11 w-11',
  md: 'h-20 w-20',
  lg: 'h-32 w-32',
};

export function CoverImage({ src, alt = '', size = 'md', class: className = '' }: CoverImageProps) {
  const theme = THEME_COLORS[getCurrentTheme()];
  const sizeClass = sizeClasses[size];

  return (
    <div class={`${sizeClass} overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradientFrom} ${theme.gradientTo} ${className}`}>
      {src ? (
        <img src={src} alt={alt} class="h-full w-full object-cover" />
      ) : (
        <img src="/logo.png" alt={alt} class="h-full w-full object-cover" />
      )}
    </div>
  );
}
