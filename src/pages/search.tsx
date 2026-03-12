import { useEffect, useState } from 'preact/hooks';
import { Button, Input } from '../components/ui';
import { getLyricWithPlugin, getMediaSourceWithPlugin, listPlugins, searchWithPlugin } from '../services';
import type { PluginRecord } from '../services/plugins';
import { playTrack, setQueue, updateCurrentTrack } from '../services/player';
import type { TrackRecord } from '../services/db';

export function SearchPage() {
  const [plugins, setPlugins] = useState<PluginRecord[]>([]);
  const [pluginId, setPluginId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activePluginUrl, setActivePluginUrl] = useState<string>('');

  useEffect(() => {
    listPlugins('musicfree').then((list) => {
      setPlugins(list.filter((item) => item.enabled));
      setPluginId(list.find((item) => item.enabled)?.id ?? null);
    });
  }, []);

  const handleSearch = async () => {
    if (!query.trim() || !pluginId) return;
    const plugin = plugins.find((item) => item.id === pluginId);
    if (!plugin) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await searchWithPlugin(plugin.url, query.trim(), 1);
      setResults(res.data ?? []);
      setActivePluginUrl(plugin.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const buildTrack = (item: any): TrackRecord => ({
    id: Date.now() + Math.floor(Math.random() * 1000),
    title: item.title ?? item.name ?? '未知歌曲',
    artist: item.artist ?? '',
    album: item.album ?? '',
    duration: item.duration,
    cover: item.artwork ?? item.cover,
    sourceType: 'online',
    sourceId: String(item.id ?? ''),
    sourceUrl: item.url,
  });

  const handlePlay = async (item: any) => {
    if (!activePluginUrl) return;
    setLoading(true);
    try {
      const media = await getMediaSourceWithPlugin(activePluginUrl, item, 'standard');
      const track = buildTrack({ ...item, url: media?.url });
      setQueue([track], 0);
      const lyric = await getLyricWithPlugin(activePluginUrl, item);
      if (lyric?.rawLrc) {
        updateCurrentTrack({ lyric: lyric.rawLrc });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex h-full min-h-0 flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6">
      <p class="text-xs uppercase tracking-[0.3em] text-emerald-300/80">Search</p>
      <h2 class="text-xl font-semibold text-white">在线搜索</h2>
      <div class="flex flex-wrap gap-3">
        <select
          class="h-11 rounded-2xl border border-white/10 bg-neutral-950/40 px-3 text-sm text-neutral-100"
          value={pluginId ?? ''}
          onChange={(event) => setPluginId(Number((event.target as HTMLSelectElement).value))}
        >
          <option value="">选择插件</option>
          {plugins.map((plugin) => (
            <option key={plugin.id} value={plugin.id}>
              {plugin.name}
            </option>
          ))}
        </select>
        <Input
          value={query}
          placeholder="输入歌曲名"
          onInput={(event) => setQuery((event.target as HTMLInputElement).value)}
        />
        <Button onClick={handleSearch} disabled={loading}>搜索</Button>
      </div>
      {message && <p class="text-xs text-neutral-400">{message}</p>}
      <div class="flex-1 min-h-0 overflow-y-auto">
        {results.length === 0 ? (
          <p class="text-sm text-neutral-400">暂无搜索结果。</p>
        ) : (
          <div class="space-y-3 text-sm">
            {results.map((item, index) => (
              <div
                key={`${item.id ?? index}`}
                class="rounded-2xl border border-white/10 bg-neutral-950/60 px-4 py-3"
              >
                <p class="text-white">{item.title ?? item.name ?? '未知歌曲'}</p>
                <p class="text-xs text-neutral-500">{item.artist ?? ''}</p>
                <div class="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => handlePlay(item)}>播放</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
