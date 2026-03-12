import { useEffect, useState } from 'preact/hooks';
import { Button } from '../components/ui';
import { clearLocalTracks, importLocalDirectory, importLocalFiles, listLocalTracks } from '../services';
import type { TrackRecord } from '../services/db';
import { playTrack, setQueue } from '../services/player';
import { usePagination } from '../utils';

export function LocalPage() {
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const data = await listLocalTracks();
    setTracks(data);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleImportFiles = async () => {
    setLoading(true);
    await importLocalFiles();
    await refresh();
    setLoading(false);
  };

  const handleClear = async () => {
    setLoading(true);
    await clearLocalTracks();
    await refresh();
    setLoading(false);
  };

  const { page, totalPages, next, prev, range } = usePagination(tracks.length, 20);
  const visibleTracks = tracks.slice(range.start, range.end);

  return (
    <div class="flex h-full flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-emerald-300/80">Local Library</p>
        <h2 class="mt-2 text-xl font-semibold text-white">本地音乐</h2>
      </div>
      <div class="flex flex-wrap gap-3">
        <Button onClick={handleImportFiles} disabled={loading}>选择文件</Button>
        <Button variant="outline" onClick={handleClear} disabled={loading}>
          清空列表
        </Button>
      </div>
      <div class="flex-1 overflow-y-auto">
        {tracks.length === 0 ? (
          <p class="text-sm text-neutral-400">还没有导入本地音乐。</p>
        ) : (
          <div class="space-y-3 text-sm">
            {visibleTracks.map((track) => (
              <div
                key={track.id}
                class="flex items-center justify-between rounded-2xl border border-white/10 bg-neutral-950/60 px-4 py-3"
              >
                <div class="min-w-0">
                  <p class="text-white">{track.title}</p>
                  <p class="text-xs text-neutral-500">
                    {track.artist ? `${track.artist} · ${track.album ?? ''}` : track.fileName}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => playTrack(track, tracks)}>
                    播放
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setQueue(tracks, 0)}>
                    设为列表
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {tracks.length > 0 && (
        <div class="flex items-center justify-between text-xs text-neutral-400">
          <span>第 {page} / {totalPages} 页</span>
          <div class="flex gap-2">
            <Button size="sm" variant="ghost" onClick={prev} disabled={page <= 1}>
              上一页
            </Button>
            <Button size="sm" variant="ghost" onClick={next} disabled={page >= totalPages}>
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
