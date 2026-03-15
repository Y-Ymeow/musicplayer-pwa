import { useEffect, useState } from "preact/hooks";
import { Button } from "../components/ui";
import {
  addTrackToPlaylist,
  clearLocalTracks,
  importLocalDirectory,
  importLocalFiles,
  listLocalTracks,
  listPlaylists,
  migrateLocalTracks,
} from "../services";
import type { PlaylistRecord, TrackRecord } from "../services/db";
import { playTrack, setQueue } from "../services/player";
import { usePagination } from "../utils";

export function LocalPage() {
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>([]);
  const [playlistId, setPlaylistId] = useState<number | "">("");

  const refresh = async () => {
    const data = await listLocalTracks();
    setTracks(data);
    const list = await listPlaylists();
    setPlaylists(list);
  };

  useEffect(() => {
    // 先执行迁移，再刷新列表
    migrateLocalTracks().then(() => refresh());
  }, []);

  const handleImportFiles = async () => {
    setLoading(true);

    try {
      // 优先使用 Tauri 文件对话框（adapt.js 会提供真实路径）
      if ("tauri" in window) {
        console.log("[LocalPage] Using Tauri openFileDialog");
        const paths = await (window.tauri as any).fs.openFileDialog({
          multiple: true,
          directory: false,
          types: [
            {
              description: "Audio files",
              accept: {
                "audio/*": [
                  ".mp3",
                  ".flac",
                  ".wav",
                  ".aac",
                  ".m4a",
                  ".ogg",
                  ".opus",
                ],
              },
            },
          ],
        });
        console.log("[LocalPage] Selected paths:", paths);

        if (paths && paths.length > 0) {
          // 将路径转换为 handle 对象
          const handles = paths.map((path: string) => ({
            kind: "file" as const,
            name: path.split(/[\\/]/).pop() || "file",
            _path: path,
            async getFile() {
              // 通过 Tauri API 获取文件内容
              const result = await (window.tauri as any).getFileInfo(path);
              if (result && result.blob) {
                return new File([result.blob], this.name, { type: result.mimeType });
              }
              throw new Error("Failed to get file");
            },
            getPath: () => path,
          }));

          console.log("[LocalPage] Converting paths to handles:", handles.length);

          const { importFileHandles } = await import("../services/library");
          await importFileHandles(handles as any);
        }
      } else {
        // 降级到 input 方式（但无法获取真实路径）
        console.warn("[LocalPage] Tauri not available");
        alert("您的浏览器不支持文件选择器，请使用 Tauri 环境。");
      }
    } catch (error) {
      if ((error as any).name !== "AbortError") {
        console.error("[LocalPage] Import failed:", error);
      }
    } finally {
      await refresh();
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    await clearLocalTracks();
    await refresh();
    setLoading(false);
  };

  const { page, totalPages, next, prev, range } = usePagination(
    tracks.length,
    20,
  );
  const visibleTracks = tracks.slice(range.start, range.end);

  return (
    <div class="flex h-full flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6">
      <div>
        <p
          class="text-xs uppercase tracking-[0.3em]"
          style={{ color: "var(--theme-primary-light)" }}
        >
          Local Library
        </p>
        <h2 class="mt-2 text-xl font-semibold text-white">本地音乐</h2>
      </div>
      <div class="flex flex-wrap gap-3">
        <Button onClick={handleImportFiles} disabled={loading}>
          选择文件
        </Button>
        <Button variant="outline" onClick={handleClear} disabled={loading}>
          清空列表
        </Button>
        <select
          class="h-11 rounded-2xl border border-white/10 bg-neutral-950/40 px-3 text-sm text-neutral-100"
          value={playlistId}
          onChange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            setPlaylistId(value ? Number(value) : "");
          }}
        >
          <option value="">选择播放列表</option>
          {playlists.map((playlist) => (
            <option key={playlist.id} value={playlist.id}>
              {playlist.name}
            </option>
          ))}
        </select>
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
                    {track.artist
                      ? `${track.artist} · ${track.album ?? ""}`
                      : track.fileName}
                  </p>
                </div>
                <div class="flex items-center gap-2 max-lg:flex-col">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => playTrack(track, tracks)}
                  >
                    播放
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!playlistId}
                    onClick={async () => {
                      if (!playlistId || !track.id) return;
                      await addTrackToPlaylist(playlistId, track.id);
                      await refresh();
                    }}
                  >
                    加入列表
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {tracks.length > 0 && (
        <div class="flex items-center justify-between text-xs text-neutral-400">
          <span>
            第 {page} / {totalPages} 页
          </span>
          <div class="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={prev}
              disabled={page <= 1}
            >
              上一页
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={next}
              disabled={page >= totalPages}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
