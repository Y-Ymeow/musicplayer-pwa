import { useEffect, useState } from 'preact/hooks';
import { Button, Input } from '../components/ui';
import { addTrackToPlaylist, getLyricWithPlugin, getMediaSourceWithPlugin, listPlaylists, listPlugins, searchWithPlugin, upsertOnlineTrack } from '../services';
import type { PluginRecord } from '../services/plugins';
import { playTrack, setQueue, updateCurrentTrack } from '../services/player';
import type { PlaylistRecord, TrackRecord } from '../services/db';
import { getCurrentTheme, THEME_COLORS } from '../utils/theme';

export function SearchPage() {
  const theme = THEME_COLORS[getCurrentTheme()];
  const [plugins, setPlugins] = useState<PluginRecord[]>([]);
  const [pluginId, setPluginId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [isEnd, setIsEnd] = useState(false);
  const [message, setMessage] = useState('');
  const [activePluginUrl, setActivePluginUrl] = useState<string>('');
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>([]);
  const [playlistId, setPlaylistId] = useState<number | ''>('');

  useEffect(() => {
    listPlugins('musicfree').then((list) => {
      setPlugins(list.filter((item) => item.enabled));
      setPluginId(list.find((item) => item.enabled)?.id ?? null);
    });
    listPlaylists().then(setPlaylists);
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
      setPage(1);
      setIsEnd(Boolean(res.isEnd));
      setActivePluginUrl(plugin.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!query.trim() || !activePluginUrl || isEnd) return;
    setLoading(true);
    setMessage('');
    try {
      const nextPage = page + 1;
      const res = await searchWithPlugin(activePluginUrl, query.trim(), nextPage);
      setResults((prev) => [...prev, ...(res.data ?? [])]);
      setPage(nextPage);
      setIsEnd(Boolean(res.isEnd));
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

  const handleAddToPlaylist = async (item: any) => {
    if (!activePluginUrl || !playlistId) return;
    setLoading(true);
    setMessage('');
    try {
      const media = await getMediaSourceWithPlugin(activePluginUrl, item, 'standard');
      const track = await upsertOnlineTrack({
        title: item.title ?? item.name ?? '未知歌曲',
        artist: item.artist ?? '',
        album: item.album ?? '',
        duration: item.duration,
        cover: item.artwork ?? item.cover,
        sourceId: String(item.id ?? ''),
        sourceUrl: media?.url,
      });
      if (track?.id) {
        await addTrackToPlaylist(playlistId, track.id);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex h-full min-h-0 flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6">
      <p class="text-xs uppercase tracking-[0.3em]" style={{ color: theme.primaryLight }}>Search</p>
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
        <select
          class="h-11 rounded-2xl border border-white/10 bg-neutral-950/40 px-3 text-sm text-neutral-100"
          value={playlistId}
          onChange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            setPlaylistId(value ? Number(value) : '');
          }}
        >
          <option value="">加入播放列表</option>
          {playlists.map((playlist) => (
            <option key={playlist.id} value={playlist.id}>
              {playlist.name}
            </option>
          ))}
        </select>
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
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!playlistId}
                    onClick={() => handleAddToPlaylist(item)}
                  >
                    加入列表
                  </Button>
                </div>
              </div>
            ))}
            <div class="pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleLoadMore}
                disabled={loading || isEnd}
              >
                {isEnd ? '没有更多了' : '加载更多'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
