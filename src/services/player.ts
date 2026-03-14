import { useEffect, useState } from "preact/hooks";
import type { TrackRecord } from "./db";
import { resolveLocalFileUrl } from "../framework/utils/local-file";
import { getCachedFile } from "./local-cache";

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

// Web Audio API 相关
let audioCtx: AudioContext | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let audioBuffer: AudioBuffer | null = null;
let startTime = 0;
let pausedAt = 0;
let progressTimer: number | null = null;

let currentUrl: string | null = null;
let state: PlayerState = {
  queue: [],
  index: -1,
  current: undefined,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  repeat: "off",
};

let playRequestId = 0;

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

function startProgressTimer() {
  stopProgressTimer();
  progressTimer = window.setInterval(() => {
    if (audioCtx && audioBuffer && state.isPlaying) {
      const elapsed = audioCtx.currentTime - startTime + pausedAt;
      const newTime = Math.min(elapsed, audioBuffer.duration);
      if (newTime >= audioBuffer.duration) {
        // 播放结束
        handleEnded();
      } else {
        setState({ currentTime: newTime });
      }
    }
  }, 250);
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

function destroySource() {
  stopProgressTimer();
  if (sourceNode) {
    try {
      sourceNode.stop();
    } catch {}
    sourceNode.disconnect();
    sourceNode = null;
  }
  pausedAt = 0;
}

async function getAudioContext(): Promise<AudioContext> {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
  return audioCtx;
}

async function prepareAudioBuffer(track: TrackRecord, requestId: number): Promise<AudioBuffer | null> {
  const ctx = await getAudioContext();
  
  // 本地文件：在 Tauri 环境下直接读取整个文件
  if (track.sourceType === "local" && track.filePath) {
    const win = window as any;

    // 检查是否在 Tauri 环境
    if (win.__TAURI__?.read_file_content) {
      try {
        // 使用 Tauri API 读取整个文件（返回 base64）
        const result = await win.__TAURI__.read_file_content(track.filePath);
        if (requestId !== playRequestId) return null;

        if (result?.data?.content) {
          const base64 = result.data.content;
          
          // 将 base64 解码为 ArrayBuffer
          const binaryString = atob(base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // 解码为 AudioBuffer
          const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
          if (requestId !== playRequestId) return null;
          
          return audioBuffer;
        }
      } catch (err) {
        console.warn("Tauri read_file_content failed, falling back:", err);
      }
    }
  }

  // 尝试从 fileHandle 获取
  let blob: Blob | null = null;
  if (track.sourceType === "local" && track.fileHandle) {
    blob = await track.fileHandle.getFile();
    if (requestId !== playRequestId) return null;
  } else if (track.sourceType === "local" && track.fileBlob) {
    blob = track.fileBlob;
  } else if (track.sourceType === "local" && track.fileKey) {
    const file = getCachedFile(track.fileKey);
    if (file) blob = file;
  }

  if (blob) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      if (requestId !== playRequestId) return null;
      
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      if (requestId !== playRequestId) return null;
      
      return audioBuffer;
    } catch (err) {
      console.warn("decodeAudioData failed:", err);
      return null;
    }
  }

  // 在线音轨：尝试从 URL 获取
  if (track.sourceUrl) {
    try {
      const response = await fetch(track.sourceUrl);
      const arrayBuffer = await response.arrayBuffer();
      if (requestId !== playRequestId) return null;
      
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      if (requestId !== playRequestId) return null;
      
      return audioBuffer;
    } catch (err) {
      console.warn("fetch and decode failed:", err);
      return null;
    }
  }

  return null;
}

async function playIndex(index: number) {
  const next = state.queue[index];
  if (!next) return;
  const requestId = ++playRequestId;

  setState({ index, current: next, currentTime: 0, duration: 0 });

  destroySource();

  const buffer = await prepareAudioBuffer(next, requestId);
  if (!buffer || requestId !== playRequestId) return;

  audioBuffer = buffer;
  setState({ duration: buffer.duration });

  const ctx = await getAudioContext();
  
  sourceNode = ctx.createBufferSource();
  sourceNode.buffer = buffer;
  sourceNode.connect(ctx.destination);
  
  sourceNode.onended = () => {
    // 只有在自然结束时才触发（不是手动 stop）
    if (state.isPlaying && audioCtx && sourceNode) {
      const elapsed = audioCtx.currentTime - startTime + pausedAt;
      if (elapsed >= buffer.duration - 0.1) {
        handleEnded();
      }
    }
  };

  startTime = ctx.currentTime;
  pausedAt = 0;
  sourceNode.start(0);
  
  startProgressTimer();
  setState({ isPlaying: true });
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

  // 如果音频缓冲不存在，重新加载
  if (!audioBuffer) {
    void playIndex(state.index);
    return;
  }

  if (state.isPlaying) {
    // 暂停
    pauseAudio();
  } else {
    // 继续播放
    resumeAudio();
  }
}

function pauseAudio() {
  if (!sourceNode || !audioCtx || !audioBuffer) return;
  
  stopProgressTimer();
  
  // 计算暂停位置
  const elapsed = audioCtx.currentTime - startTime + pausedAt;
  const pausePosition = Math.min(elapsed, audioBuffer.duration);
  
  try {
    sourceNode.stop();
  } catch {}
  sourceNode.disconnect();
  sourceNode = null;
  
  // 保存暂停位置
  pausedAt = pausePosition;
  
  setState({ isPlaying: false, currentTime: pausePosition });
}

function resumeAudio() {
  if (!audioBuffer || !audioCtx) return;
  
  sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.connect(audioCtx.destination);
  
  sourceNode.onended = () => {
    if (state.isPlaying && audioCtx && sourceNode && audioBuffer) {
      const elapsed = audioCtx.currentTime - startTime + pausedAt;
      if (elapsed >= audioBuffer.duration - 0.1) {
        handleEnded();
      }
    }
  };

  // 从暂停位置继续
  startTime = audioCtx.currentTime;
  sourceNode.start(0, pausedAt);
  
  startProgressTimer();
  setState({ isPlaying: true });
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

export function seekTo(time: number) {
  if (!audioBuffer) return;

  const clampedTime = Math.max(0, Math.min(time, audioBuffer.duration));
  pausedAt = clampedTime;
  setState({ currentTime: clampedTime });

  // 如果正在播放，重新开始
  if (state.isPlaying) {
    if (sourceNode) {
      try {
        sourceNode.stop();
      } catch {}
      sourceNode.disconnect();
    }

    const ctx = audioCtx!;
    sourceNode = ctx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(ctx.destination);

    sourceNode.onended = () => {
      if (state.isPlaying && audioCtx && sourceNode && audioBuffer) {
        const elapsed = audioCtx.currentTime - startTime + pausedAt;
        if (elapsed >= audioBuffer.duration - 0.1) {
          handleEnded();
        }
      }
    };

    startTime = ctx.currentTime;
    pausedAt = 0;
    sourceNode.start(0, clampedTime);

    startProgressTimer();
  }
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
