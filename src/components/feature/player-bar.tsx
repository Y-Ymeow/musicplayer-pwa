import { Button } from '../ui';
import { nextTrack, prevTrack, seekTo, togglePlay, toggleRepeat, usePlayerState } from '../../services/player';
import { getCurrentTheme, THEME_COLORS } from '../../utils/theme';

export function PlayerBar() {
  const player = usePlayerState();
  const progress = player.duration ? player.currentTime / player.duration : 0;
  const repeatLabel = player.repeat === 'off' ? '↻' : player.repeat === 'all' ? '🔁' : '🔂';
  const theme = THEME_COLORS[getCurrentTheme()];

  return (
    <div class="border-t border-white/10 bg-neutral-950/90 backdrop-blur">
      <div class="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6">
        <div class="flex items-center gap-4">
          <div class={`h-11 w-11 overflow-hidden rounded-2xl bg-gradient-to-br ${theme.gradientFrom} ${theme.gradientTo}`}>
            {player.current?.cover ? (
              <img src={player.current.cover} alt="" class="h-full w-full object-cover" />
            ) : (
              <img src="/logo.png" alt="" class="h-full w-full object-cover" />
            )}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-white">{player.current?.title ?? '暂无播放'}</p>
            <p class="truncate text-xs text-neutral-400">
              {player.current?.artist ? `${player.current.artist} · ${player.current.album ?? ''}` : '选择一首歌曲'}
              {player.current?.sourceType ? ` · ${player.current.sourceType === 'local' ? '本地' : '在线'}` : ''}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={prevTrack}>⏮</Button>
            <Button size="icon" onClick={togglePlay} disabled={!player.current}>
              {player.isPlaying ? '⏸' : '▶'}
            </Button>
            <Button variant="ghost" size="icon" onClick={nextTrack}>⏭</Button>
            <Button variant="outline" size="icon" onClick={toggleRepeat}>{repeatLabel}</Button>
          </div>
        </div>
        <div class="flex items-center gap-3 text-xs text-neutral-400">
          <span>{formatTime(player.currentTime)}</span>
          <input
            class="h-2 w-full flex-1 cursor-pointer appearance-none rounded-full bg-white/10"
            type="range"
            min="0"
            max={player.duration || 0}
            step="0.1"
            value={player.currentTime}
            onInput={(event) => seekTo(Number((event.target as HTMLInputElement).value))}
            style={{ background: `linear-gradient(90deg, ${theme.primary} ${progress * 100}%, rgba(255,255,255,0.1) 0%)` }}
          />
          <span>{formatTime(player.duration)}</span>
        </div>
      </div>
    </div>
  );
}

function formatTime(value: number) {
  if (!value || Number.isNaN(value)) return '00:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
