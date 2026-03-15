import { useEffect, useState } from 'preact/hooks';
import { getCurrentTheme, setTheme, getAvailableThemes, type ThemeColor } from '../../utils/theme';

export function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState<ThemeColor>('emerald');
  const [isOpen, setIsOpen] = useState(false);
  const themes = getAvailableThemes();

  useEffect(() => {
    setCurrentTheme(getCurrentTheme());
  }, []);

  const handleThemeChange = (theme: ThemeColor) => {
    setTheme(theme);
    setCurrentTheme(theme);
    setIsOpen(false);
  };

  return (
    <div class="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        class="rounded-full border border-white/10 bg-neutral-900/70 px-3 py-2 text-xs text-white hover:bg-neutral-800"
        title="切换主题色"
      >
        🎨
      </button>

      {isOpen && (
        <>
          <div
            class="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div class="absolute right-0 top-full mt-2 z-50 w-48 rounded-2xl border border-white/10 bg-neutral-900 p-3 shadow-xl">
            <p class="mb-2 text-xs font-semibold text-neutral-400">选择主题色</p>
            <div class="grid grid-cols-3 gap-2">
              {themes.map(({ key, config }) => (
                <button
                  key={key}
                  onClick={() => handleThemeChange(key)}
                  class={`flex flex-col items-center gap-1 rounded-xl p-2 transition-colors ${
                    currentTheme === key
                      ? 'bg-white/10'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div
                    class="h-8 w-8 rounded-full shadow-md"
                    style={`background: linear-gradient(135deg, ${config.primary}, ${config.primaryHover})`}
                  />
                  <span class="text-[10px] text-neutral-300">{config.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
