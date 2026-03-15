import { useEffect, useState } from "preact/hooks";
import type { TrackRecord } from "./db";
import { resolveLocalFileUrl } from "../framework/utils/local-file";
import { getCachedFile } from "./local-cache";
import { getFileHandleURL } from "../utils/file";

export type RepeatMode = "off" | "one" | "all";

export interface PlayerState {
  queue: TrackRecord[];
  index: number;
  current?: TrackRecord;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  repeat: RepeatMode;
}

// 使用原生音频播放器（ExoPlayer / libmpv2）
let progressTimer: number | null = null;

let state: PlayerState = {
  queue: [],
  index: -1,
  current: undefined,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  repeat: "off",
};

const subscribers = new Set<(next: PlayerState) => void>();

function emit() {
  const snapshot = { ...state };
  subscribers.forEach((fn) => fn(snapshot));
}

function setState(partial: Partial<PlayerState>) {
  state = { ...state, ...partial };
  emit();
}

function stopProgressTimer() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

/**
 * 启动进度跟踪定时器
 * 定期从原生播放器获取播放进度
 */
function startProgressTimer() {
  stopProgressTimer();
  progressTimer = window.setInterval(async () => {
    if (state.isPlaying && window.__TAURI__?.audio) {
      try {
        const [positionMs, durationMs] = await Promise.all([
          window.__TAURI__.audio.getPosition(),
          window.__TAURI__.audio.getDuration(),
        ]);
        
        setState({ 
          currentTime: positionMs / 1000, // 转换为秒
          duration: durationMs / 1000,
        });
        
        // 检查是否播放结束
        if (durationMs > 0 && positionMs >= durationMs - 100) {
          handleEnded();
        }
      } catch (e) {
        console.error("[Player] Failed to get position:", e);
      }
    }
  }, 500); // 每 500ms 更新一次
}

function handleEnded() {
  stopProgressTimer();

  if (state.repeat === "one") {
    void playIndex(state.index);
    return;
  }

  if (state.index < state.queue.length - 1) {
    void playIndex(state.index + 1);
    return;
  }

  if (state.repeat === "all" && state.queue.length > 0) {
    void playIndex(0);
    return;
  }

  setState({ isPlaying: false, currentTime: 0 });
}

/**
 * 获取音频播放 URL
 * 本地文件通过 resolveLocalFileUrl 转换为可播放的 URL
 */
async function getTrackPlayUrl(track: TrackRecord): Promise<string> {
  // 本地文件：转换为可播放的 URL
  if (track.sourceType === "local") {
    console.log("[Player] Getting play URL for local track:", {
      fileName: track.fileName,
      filePath: track.filePath,
      sourceUrl: track.sourceUrl,
      hasFileHandle: !!track.fileHandle,
      hasFileBlob: !!track.fileBlob,
    });

    // 1. 优先使用 sourceUrl（导入时保存的播放 URL）
    if (track.sourceUrl) {
      console.log("[Player] Using saved sourceUrl:", track.sourceUrl);
      return track.sourceUrl;
    }

    // 2. 使用 fileHandle.getURL()（adapt.js 提供的播放 URL）
    if (track.fileHandle) {
      const handleUrl = getFileHandleURL(track.fileHandle as any);
      if (handleUrl) {
        console.log("[Player] Got URL from fileHandle.getURL():", handleUrl);
        return handleUrl;
      }
    }

    // 3. 使用 filePath + resolveLocalFileUrl
    if (track.filePath) {
      console.log("[Player] Resolving filePath:", track.filePath);
      const url = await resolveLocalFileUrl({
        filePath: track.filePath,
        fileName: track.fileName,
        sourceType: track.sourceType,
      });
      console.log("[Player] resolveLocalFileUrl result:", url);
      if (url) return url;
    }

    // 4. 尝试从 fileBlob 创建 URL
    if (track.fileBlob) {
      console.log("[Player] Creating URL from fileBlob");
      const blobUrl = URL.createObjectURL(track.fileBlob);
      console.log("[Player] Created blob URL from fileBlob:", blobUrl);
      return blobUrl;
    }

    // 5. 尝试从 fileKey 获取缓存文件
    if (track.fileKey) {
      const cachedFile = getCachedFile(track.fileKey);
      if (cachedFile) {
        console.log("[Player] Creating URL from cached file");
        const blobUrl = URL.createObjectURL(cachedFile);
        console.log("[Player] Created blob URL from cached file:", blobUrl);
        return blobUrl;
      }
    }
  }

  // 在线音源：直接使用 sourceUrl
  if (track.sourceUrl) {
    console.log("[Player] Using online sourceUrl:", track.sourceUrl);
    return track.sourceUrl;
  }

  throw new Error("No playable source found for track");
}

/**
 * 播放指定索引的歌曲
 */
async function playIndex(index: number) {
  const next = state.queue[index];
  if (!next) return;

  setState({ index, current: next, currentTime: 0, duration: 0 });

  // 停止之前的播放
  stopAudio();

  try {
    // 获取可播放的 URL
    const playUrl = await getTrackPlayUrl(next);

    // 使用原生播放器播放（ExoPlayer / libmpv2）
    if (window.__TAURI__?.audio?.play) {
      console.log("[Player] Using native audio player:", playUrl);
      await window.__TAURI__.audio.play(playUrl);
    } else if (window.__TAURI__) {
      console.log("[Player] Using legacy invoke API:", playUrl);
      // 兼容旧的 invoke 方式
      await window.__TAURI__.invoke("audio_play", { url: playUrl });
    } else {
      console.warn("[Player] No Tauri bridge, falling back to HTML5 Audio:", playUrl);
      // 兜底：使用 HTML5 Audio
      const audio = new Audio(playUrl);
      audio.play().catch(console.error);
    }

    // 启动进度跟踪
    startProgressTimer();
    setState({ isPlaying: true });
  } catch (err) {
    console.error("[Player] Failed to play track:", err);
    setState({ isPlaying: false });
  }
}

export function setQueue(queue: TrackRecord[], startIndex = 0) {
  setState({ queue, index: startIndex, current: queue[startIndex] });
  void playIndex(startIndex);
}

export function playTrack(track: TrackRecord, queue?: TrackRecord[]) {
  if (queue && queue.length > 0) {
    // 找到当前 track 在队列中的索引
    const trackId = track.id;
    const startIndex = queue.findIndex(t => t.id === trackId);
    setQueue(queue, startIndex >= 0 ? startIndex : 0);
    return;
  }
  setQueue([track], 0);
}

export function togglePlay() {
  if (!state.current) return;

  if (state.isPlaying) {
    // 暂停
    pauseAudio();
  } else {
    // 继续播放
    resumeAudio();
  }
}

/**
 * 暂停播放
 */
function pauseAudio() {
  stopProgressTimer();

  if (window.__TAURI__?.audio?.pause) {
    window.__TAURI__.audio.pause();
  } else if (window.__TAURI__) {
    window.__TAURI__.invoke("audio_pause", {});
  }

  setState({ isPlaying: false });
}

/**
 * 继续播放
 */
function resumeAudio() {
  if (window.__TAURI__?.audio?.resume) {
    window.__TAURI__.audio.resume();
  } else if (window.__TAURI__) {
    window.__TAURI__.invoke("audio_resume", {});
  }

  startProgressTimer();
  setState({ isPlaying: true });
}

/**
 * 停止播放
 */
function stopAudio() {
  stopProgressTimer();

  if (window.__TAURI__?.audio?.stop) {
    window.__TAURI__.audio.stop();
  } else if (window.__TAURI__) {
    window.__TAURI__.invoke("audio_stop", {});
  }
}

export function nextTrack() {
  if (state.index < state.queue.length - 1) {
    void playIndex(state.index + 1);
  }
}

export function prevTrack() {
  if (state.index > 0) {
    void playIndex(state.index - 1);
  }
}

/**
 * 跳转到指定位置（秒）
 */
export function seekTo(time: number) {
  const timeMs = time * 1000; // 转换为毫秒

  if (window.__TAURI__?.audio?.seek) {
    window.__TAURI__.audio.seek(timeMs);
  } else if (window.__TAURI__) {
    window.__TAURI__.invoke("audio_seek", { positionMs: timeMs });
  }

  setState({ currentTime: time });
}

export function toggleRepeat() {
  const next: RepeatMode =
    state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off";
  setState({ repeat: next });
}

export function updateCurrentTrack(partial: Partial<TrackRecord>) {
  if (!state.current) return;
  const updated = { ...state.current, ...partial } as TrackRecord;
  const nextQueue = state.queue.map((item) =>
    item.id === updated.id ? updated : item,
  );
  setState({ current: updated, queue: nextQueue });
}

export function usePlayerState() {
  const [player, setPlayer] = useState(state);

  useEffect(() => {
    const handler = (next: PlayerState) => setPlayer(next);
    subscribers.add(handler);
    return () => {
      subscribers.delete(handler);
    };
  }, []);

  return player;
}
