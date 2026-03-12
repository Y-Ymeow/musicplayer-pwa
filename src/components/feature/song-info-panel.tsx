import { usePlayerState } from '../../services/player';

export function SongInfoPanel() {
  const player = usePlayerState();
  const total = player.queue.length;

  return (
    <div class="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-300">
      <p>播放队列：{total} 首</p>
      <p class="mt-2 text-xs text-neutral-500">本地 · 在线</p>
    </div>
  );
}
