import { getCurrentTheme, THEME_COLORS } from '../utils/theme';

export function DownloadsPage() {
  const theme = THEME_COLORS[getCurrentTheme()];
  return (
    <div class="flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6">
      <p class="text-xs uppercase tracking-[0.3em]" style={{ color: theme.primaryLight }}>Downloads</p>
      <h2 class="text-xl font-semibold text-white">下载管理</h2>
      <p class="text-sm text-neutral-400">暂无下载任务。</p>
    </div>
  );
}
