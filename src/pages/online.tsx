import { useEffect, useState } from 'preact/hooks';
import { Button, Input } from '../components/ui';
import { clearLogs, hasExternalAdapter, importMusicFreePlugins, listPlugins, subscribeLogs, togglePlugin, type PluginRecord } from '../services';
import { LocalStorage } from '../framework/storages';
import type { LogEntry } from '../services';

// 插件列表 URL 存储
const storage = new LocalStorage('musicplayer:online');
const PLUGIN_LIST_URL_KEY = 'plugin-list-url';

export function OnlinePage() {
  const [plugins, setPlugins] = useState<PluginRecord[]>([]);
  const [payload, setPayload] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [corsTip, setCorsTip] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    // 从 localStorage 读取上次输入的地址
    storage.init();
    storage.get<string>(PLUGIN_LIST_URL_KEY).then((entry) => {
      if (entry?.value) setPayload(entry.value);
    });
    
    listPlugins('musicfree').then(setPlugins);
    if (!hasExternalAdapter()) {
      setCorsTip('未检测到油猴/插件/容器适配，跨域接口可能失败。');
    }
    return subscribeLogs(setLogs);
  }, []);

  const handleImport = async () => {
    if (!payload.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const count = await importMusicFreePlugins(payload.trim());
      setMessage(`已导入 ${count} 个插件`);
      const list = await listPlugins('musicfree');
      setPlugins(list);
      // 保存输入的地址到 localStorage
      await storage.set(PLUGIN_LIST_URL_KEY, payload.trim());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex h-full min-h-0 flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6">
      <div>
        <p class="text-xs uppercase tracking-[0.3em]" style={{ color: "var(--theme-primary-light)" }}>Online Sources</p>
        <h2 class="mt-2 text-xl font-semibold text-white">在线音乐</h2>
      </div>
      <div class="space-y-3">
        <Input
          value={payload}
          placeholder="粘贴 MusicFree 插件 JSON 或输入列表地址"
          onInput={(event) => setPayload((event.target as HTMLInputElement).value)}
        />
        <Button onClick={handleImport} disabled={loading}>导入插件列表</Button>
        {message && <p class="text-xs text-neutral-400">{message}</p>}
        {corsTip && <p class="text-xs text-amber-300">{corsTip}</p>}
      </div>
      <div class="flex-1 min-h-0 overflow-y-auto space-y-3">
        {plugins.map((plugin) => (
          <div
            key={String(plugin.id)}
            class="flex items-center justify-between rounded-2xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm"
          >
            <div>
              <p class="text-white">{plugin.name}</p>
              <p class="text-xs text-neutral-500">{plugin.version ?? 'unknown'}</p>
            </div>
            <Button
              variant={plugin.enabled ? 'secondary' : 'outline'}
              onClick={async () => {
                if (!plugin.id) return;
                await togglePlugin(String(plugin.id), !plugin.enabled);
                const list = await listPlugins('musicfree');
                setPlugins(list);
              }}
            >
              {plugin.enabled ? '已启用' : '启用'}
            </Button>
          </div>
        ))}
        {plugins.length === 0 && (
          <p class="text-sm text-neutral-400">暂无可用在线源。</p>
        )}
      </div>
      <div class="rounded-2xl border border-white/10 bg-neutral-950/40 p-4 text-sm">
        <div class="flex items-center justify-between">
          <p class="text-white">插件日志</p>
          <div class="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => clearLogs()}>清空</Button>
            <Button size="sm" variant="secondary" onClick={() => setShowLogs((prev) => !prev)}>
              {showLogs ? '收起' : '展开'}
            </Button>
          </div>
        </div>
        {showLogs && (
          <div class="mt-3 max-h-52 overflow-y-auto rounded-2xl bg-black/40 px-3 py-2 text-xs text-neutral-300">
            {logs.length === 0 ? (
              <p class="text-neutral-500">暂无日志。</p>
            ) : (
              logs
                .slice()
                .reverse()
                .map((entry) => (
                  <p key={entry.id} class="whitespace-pre-wrap">
                    [{new Date(entry.ts).toLocaleTimeString()}] {entry.scope ? `${entry.scope} ` : ''}{entry.level.toUpperCase()} {entry.message}
                  </p>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
