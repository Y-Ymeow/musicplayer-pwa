/**
 * 音乐库管理服务
 *
 * 提供音乐文件的导入、管理等功能
 * - 支持浏览器 File System Access API
 * - 支持 adapt.js 环境（Tauri 容器）
 * - 优化元数据读取，使用文件片段读取
 */

import { ensureDbReady, TrackModel } from "./db";
import {
  isAudioFile,
  pickAudioDirectory,
  pickAudioFiles,
  type ExtendedFileHandle,
  getFileHandlePath,
  getFileHandleURL,
  readFileRange,
  requestStoragePermission,
  isAdaptEnvironment,
} from "../utils/file";
import { extractMetadata, extractMetadataFromRange } from "./metadata";
import { cacheLocalFile, makeFileKey } from "./local-cache";

function guessTitle(fileName: string) {
  const base = fileName.replace(/\.[^/.]+$/, "");
  return base || fileName;
}

/**
 * 导入本地音频文件
 */
export async function importLocalFiles() {
  // 在 adapt.js 环境，先请求权限
  if (isAdaptEnvironment()) {
    const granted = await requestStoragePermission(
      "需要访问您的音乐文件才能播放，请在设置中允许存储权限。",
    );
    if (!granted) {
      console.warn("Storage permission denied");
      return [];
    }
  }

  const handles = await pickAudioFiles();
  return importFileHandles(handles);
}

/**
 * 导入本地音频目录
 */
export async function importLocalDirectory() {
  // 在 adapt.js 环境，先请求权限
  if (isAdaptEnvironment()) {
    const granted = await requestStoragePermission(
      "需要访问您的音乐文件才能播放，请在设置中允许存储权限。",
    );
    if (!granted) {
      console.warn("Storage permission denied");
      return [];
    }
  }

  const handles = await pickAudioDirectory();
  return importFileHandles(handles);
}

/**
 * 导入文件句柄列表
 */
export async function importFileHandles(handles: ExtendedFileHandle[]) {
  await ensureDbReady();
  const created = [] as number[];
  console.log("[library.ts] Importing handles:", handles);
  for (const handle of handles) {
    if (handle.kind !== "file") continue;
    if (!isAudioFile(handle.name)) continue;

    // 获取文件路径（adapt.js 会提供真实路径）
    let filePath = getFileHandlePath(handle);

    // 调试日志
    console.log("[library.ts] Importing file:", {
      name: handle.name,
      kind: handle.kind,
      hasGetPath: typeof handle.getPath === "function",
      has_path: !!(handle as any)._path,
      getPathResult: handle.getPath?.(),
      _pathResult: (handle as any)._path,
      filePath,
    });

    // 如果 getFileHandlePath 返回 null，尝试直接从 handle 读取
    if (!filePath) {
      if (typeof handle.getPath === "function") {
        filePath = handle.getPath();
        console.log(
          "[library.ts] Got filePath from handle.getPath():",
          filePath,
        );
      } else if ((handle as any)._path) {
        filePath = (handle as any)._path;
        console.log("[library.ts] Got filePath from handle._path:", filePath);
      }
    }

    // 获取文件 URL（adapt.js 会提供播放 URL）
    let fileUrl = getFileHandleURL(handle);

    // 如果 getFileHandleURL 返回 null，尝试直接从 handle 读取
    if (!fileUrl) {
      if (typeof handle.getURL === "function") {
        fileUrl = handle.getURL();
        console.log("[library.ts] Got fileUrl from handle.getURL():", fileUrl);
      } else if ((handle as any)._url) {
        fileUrl = (handle as any)._url;
        console.log("[library.ts] Got fileUrl from handle._url:", fileUrl);
      }
    }

    // 如果还是没有 URL，但有 filePath，尝试调用 resolveLocalFileUrl 获取
    if (!fileUrl && filePath) {
      try {
        const win = window as any;
        if (win.tauri?.resolveLocalFileUrl) {
          fileUrl = filePath;
          console.log(
            "[library.ts] Got fileUrl from resolveLocalFileUrl:",
            fileUrl,
          );
        }
      } catch (error) {
        console.warn("[library.ts] resolveLocalFileUrl failed:", error);
      }
    }

    console.log("[library.ts] Final paths:", { filePath, fileUrl });

    // 优化：只读取文件片段来获取元数据（256KB 通常足够）
    let metadata = {};
    try {
      // 尝试使用范围读取
      const rangeBuffer = await readFileRange(handle, 0, 262144);

      if (rangeBuffer) {
        metadata = await extractMetadataFromRange(rangeBuffer, handle.name);
      } else {
        // 降级到读取整个文件
        const file = await handle.getFile();
        metadata = await extractMetadata(file);
      }
    } catch (error) {
      console.warn("Metadata parse failed", handle.name, error);
    }

    const parsed = metadata as Awaited<ReturnType<typeof extractMetadata>>;
    const title = parsed.title || guessTitle(handle.name);

    // 生成文件 key
    const file = await handle.getFile();
    const fileKey = makeFileKey(file, handle.name);

    // 缓存文件
    cacheLocalFile(fileKey, file);

    // 在 Tauri 环境下，不存储 fileHandle（无法序列化），只存储 filePath 和 sourceUrl
    const isTauri = !!(window as any).__TAURI__;
    
    let track;
    if (isTauri) {
      // Tauri 环境：使用 filePath 和 sourceUrl
      track = await TrackModel.create({
        title,
        artist: parsed.artist,
        album: parsed.album,
        duration: parsed.duration,
        cover: parsed.cover,
        lyric: parsed.lyric,
        sourceType: "local",
        fileKey,
        filePath: filePath || undefined,
        sourceUrl: fileUrl || undefined,
        fileName: handle.name,
      } as any);
    } else {
      // 浏览器环境：尝试存储 fileHandle
      try {
        track = await TrackModel.create({
          title,
          artist: parsed.artist,
          album: parsed.album,
          duration: parsed.duration,
          cover: parsed.cover,
          lyric: parsed.lyric,
          sourceType: "local",
          fileHandle: handle as any,
          fileKey,
          filePath: filePath || undefined,
          sourceUrl: fileUrl || undefined,
          fileName: handle.name,
        });
      } catch (error) {
        // DataCloneError: fileHandle 无法被克隆时，降级存储
        if (error instanceof DOMException && error.name === "DataCloneError") {
          track = await TrackModel.create({
            title,
            artist: parsed.artist,
            album: parsed.album,
            duration: parsed.duration,
            cover: parsed.cover,
            lyric: parsed.lyric,
            sourceType: "local",
            fileKey,
            filePath: filePath || undefined,
            sourceUrl: fileUrl || undefined,
            fileBlob: file,
            fileName: handle.name,
          });
        } else {
          throw error;
        }
      }
    }
    created.push(track.id as number);
  }

  return created;
}

/**
 * 列出所有本地音轨
 */
export async function listLocalTracks() {
  await ensureDbReady();
  return TrackModel.findMany({
    where: { sourceType: "local" },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * 迁移本地音轨：为没有 sourceUrl 的音轨添加播放 URL
 * 用于修复旧版本导入的音乐文件
 */
export async function migrateLocalTracks() {
  await ensureDbReady();

  // 查找所有没有 sourceUrl 的本地音轨
  const tracks = await TrackModel.findMany({
    where: {
      sourceType: "local",
      sourceUrl: undefined,
    },
  });

  if (tracks.length === 0) {
    console.log("[migrateLocalTracks] No tracks need migration");
    return 0;
  }

  console.log(`[migrateLocalTracks] Found ${tracks.length} tracks to migrate`);

  let migrated = 0;

  for (const track of tracks) {
    try {
      // 如果有 filePath，尝试使用 resolveLocalFileUrl 获取播放 URL
      if (track.filePath) {
        const win = window as any;
        if (win.__TAURI__?.resolve_local_file_url) {
          const url = await win.__TAURI__.resolve_local_file_url(
            track.filePath,
          );
          if (url) {
            await TrackModel.update(track.id as number, { sourceUrl: url });
            console.log(
              `[migrateLocalTracks] Migrated track ${track.id}: ${track.fileName} -> ${url}`,
            );
            migrated++;
          }
        }
      }
    } catch (error) {
      console.warn(
        `[migrateLocalTracks] Failed to migrate track ${track.id}:`,
        error,
      );
    }
  }

  console.log(
    `[migrateLocalTracks] Migration complete: ${migrated}/${tracks.length} tracks migrated`,
  );
  return migrated;
}

/**
 * 清空本地音轨
 */
export async function clearLocalTracks() {
  await ensureDbReady();
  await TrackModel.deleteMany({ sourceType: "local" });
}

/**
 * 创建或更新在线音轨
 */
export async function upsertOnlineTrack(data: {
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  cover?: string;
  sourceId?: string;
  sourceUrl?: string;
  sourcePluginUrl?: string; // 保存插件 URL，用于重新获取播放地址
  lyric?: string;
}) {
  await ensureDbReady();
  const sourceId = data.sourceId ? String(data.sourceId) : "";
  let existing = null as Awaited<ReturnType<typeof TrackModel.findOne>> | null;
  if (sourceId) {
    existing = await TrackModel.findOne({
      where: { sourceType: "online", sourceId },
    });
  }

  if (existing?.id) {
    return TrackModel.update(existing.id, {
      ...data,
      sourceType: "online",
      sourceId,
    });
  }

  return TrackModel.create({
    ...data,
    sourceType: "online",
    sourceId,
  });
}

/**
 * 获取音轨的播放 URL
 *
 * 优先级：
 * 1. 在线音轨有 sourceUrl：直接返回
 * 2. 在线音轨有 sourcePluginUrl：从插件重新获取播放地址
 * 3. 本地音轨有 fileUrl（adapt.js 提供）：返回 fileUrl
 * 4. 本地音轨有 filePath：使用 resolve_local_file_url 转换
 * 5. 本地音轨有 fileHandle：创建 object URL
 * 6. 本地音轨有 fileBlob：创建 object URL
 */
export async function getTrackPlaybackUrl(
  track: Awaited<ReturnType<typeof TrackModel.findOne>>,
): Promise<string | null> {
  if (!track) return null;

  // 在线音轨
  if (track.sourceType === "online") {
    // 1. 已有 sourceUrl，直接返回
    if (track.sourceUrl) {
      return track.sourceUrl;
    }

    // 2. 有 sourcePluginUrl，从插件重新获取
    if (track.sourcePluginUrl && track.sourceId) {
      try {
        const { getMediaSourceWithPlugin } =
          await import("./musicfree-runtime");
        const item = { id: track.sourceId };
        const result = await getMediaSourceWithPlugin(
          track.sourcePluginUrl,
          item,
        );
        if (result?.url) {
          // 更新缓存的 sourceUrl
          if (track.id) {
            await TrackModel.update(track.id, { sourceUrl: result.url });
          }
          return result.url;
        }
      } catch (error) {
        console.warn("Failed to get playback URL from plugin:", error);
      }
    }

    return null;
  }

  // 本地音轨
  if (track.sourceType === "local") {
    // 1. 尝试从 fileHandle 获取 URL（adapt.js 环境）
    if (track.fileHandle) {
      const handle = track.fileHandle as ExtendedFileHandle;

      // 使用 adapt.js 提供的 getURL() 方法
      if (handle.getURL && typeof handle.getURL === "function") {
        const url = handle.getURL();
        if (url) {
          console.log("[library.ts] Got URL from handle.getURL():", url);
          return url;
        }
      }

      // 兼容 _url 属性
      if ((handle as any)._url) {
        console.log(
          "[library.ts] Got URL from handle._url:",
          (handle as any)._url,
        );
        return (handle as any)._url;
      }
    }

    // 2. 如果有 filePath，使用 adapt.js 转换
    if (track.filePath) {
      const win = window as any;
      if (win.__TAURI__?.resolve_local_file_url) {
        try {
          const url = await win.__TAURI__.resolve_local_file_url(
            track.filePath,
          );
          console.log("[library.ts] Resolved URL from filePath:", url);
          return url;
        } catch (error) {
          console.warn("Failed to resolve file URL:", error);
        }
      }
    }

    // 3. 创建 object URL（浏览器环境降级方案）
    if (track.fileHandle) {
      try {
        const handle = track.fileHandle as ExtendedFileHandle;
        const file = await handle.getFile();
        const url = URL.createObjectURL(file);
        console.log("[library.ts] Created blob URL:", url);
        return url;
      } catch (error) {
        console.warn("Failed to create object URL:", error);
      }
    }

    // 4. 使用 fileBlob（最降级方案）
    if (track.fileBlob) {
      const url = URL.createObjectURL(track.fileBlob);
      console.log("[library.ts] Created blob URL from fileBlob:", url);
      return url;
    }
  }

  return null;
}

/**
 * 释放音轨的 object URL
 */
export function releaseTrackUrl(url: string) {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

/**
 * 预加载音轨 URL（用于播放列表）
 */
export async function preloadTrackUrls(
  tracks: Awaited<ReturnType<typeof TrackModel.findOne>>[],
) {
  const urlMap = new Map<number | string, string>();

  for (const track of tracks) {
    if (track?.id) {
      const url = await getTrackPlaybackUrl(track);
      if (url) {
        urlMap.set(track.id, url);
      }
    }
  }

  return urlMap;
}

/**
 * 批量释放 URL
 */
export function releaseTrackUrls(urls: string[]) {
  for (const url of urls) {
    releaseTrackUrl(url);
  }
}
