import { useEffect, useState } from 'preact/hooks';
import { Button, Input } from '../components/ui';
import { createPlaylist, listPlaylists } from '../services';
import type { PlaylistRecord } from '../services/db';
import { usePagination } from '../utils';

export function PlaylistPage() {
  const [name, setName] = useState('');
  const [items, setItems] = useState<PlaylistRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const data = await listPlaylists();
    setItems(data);
  };

  useEffect(() => {
    refresh();
  }, []);

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
            class="rounded-2xl border border-white/10 bg-neutral-950/60 p-4 text-sm"
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
    </div>
  );
}
