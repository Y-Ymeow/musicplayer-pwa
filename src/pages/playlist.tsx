import { useEffect, useState } from 'preact/hooks';
import { Button, Input } from '../components/ui';
import { createPlaylist, listPlaylists, listPlaylistTracks } from '../services';
import type { PlaylistRecord, TrackRecord } from '../services/db';
import { usePagination } from '../utils';
import { setQueue } from '../services/player';

export function PlaylistPage() {
  const [name, setName] = useState('');
  const [items, setItems] = useState<PlaylistRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const data = await listPlaylists();
    setItems(data);
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setTracks([]);
      return;
    }
    listPlaylistTracks(selectedId).then(setTracks);
  }, [selectedId]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await createPlaylist(name.trim());
    setName('');
    await refresh();
    setLoading(false);
  };

  const { page, totalPages, next, prev, range } = usePagination(items.length, 12);
  const visible = items.slice(range.start, range.end);

  return (
    <div class="flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6">
      <p class="text-xs uppercase tracking-[0.3em] text-emerald-300/80">Playlists</p>
      <h2 class="text-xl font-semibold text-white">播放列表</h2>
      <div class="flex flex-wrap gap-3">
        <Input
          value={name}
          placeholder="新建播放列表名称"
          onInput={(event) => setName((event.target as HTMLInputElement).value)}
        />
        <Button onClick={handleCreate} disabled={loading}>创建</Button>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        {visible.map((item) => (
          <div
            key={item.id}
            class={`cursor-pointer rounded-2xl border bg-neutral-950/60 p-4 text-sm ${
              selectedId === item.id ? 'border-emerald-400/50' : 'border-white/10'
            }`}
            onClick={() => setSelectedId(item.id ?? null)}
          >
            <p class="text-white">{item.name}</p>
            <p class="text-xs text-neutral-500">{item.trackIds?.length ?? 0} 首</p>
          </div>
        ))}
        {visible.length === 0 && (
          <p class="text-sm text-neutral-400">暂无播放列表。</p>
        )}
      </div>
      {items.length > 0 && (
        <div class="mt-auto flex items-center justify-between text-xs text-neutral-400">
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
      <div class="flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-neutral-950/40 p-4 text-sm">
        {selectedId ? (
          tracks.length > 0 ? (
            <div class="space-y-3">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  class="flex items-center justify-between rounded-2xl border border-white/10 bg-neutral-950/60 px-4 py-3"
                >
                  <div class="min-w-0">
                    <p class="text-white">{track.title}</p>
                    <p class="text-xs text-neutral-500">{track.artist ?? track.fileName}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const index = tracks.findIndex((item) => item.id === track.id);
                      setQueue(tracks, index >= 0 ? index : 0);
                    }}
                  >
                    播放
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p class="text-sm text-neutral-400">这个播放列表还没有歌曲。</p>
          )
        ) : (
          <p class="text-sm text-neutral-400">选择一个播放列表查看歌曲。</p>
        )}
      </div>
    </div>
  );
}
