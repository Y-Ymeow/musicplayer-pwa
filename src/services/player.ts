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

let audio: HTMLAudioElement | null = null;
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
let lastTimeUpdate = 0;

function emit() {
  const snapshot = { ...state };
  subscribers.forEach((fn) => fn(snapshot));
}

function setState(partial: Partial<PlayerState>) {
  state = { ...state, ...partial };
  emit();
}

function destroyAudio() {
  if (!audio) return;
  try {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  } catch {}
  audio = null;
}

function bindAudioEvents(target: HTMLAudioElement) {
  target.addEventListener("timeupdate", () => {
    const now = target.currentTime || 0;
    if (Math.abs(now - lastTimeUpdate) < 0.2) return;
    lastTimeUpdate = now;
    setState({ currentTime: now });
  });

  target.addEventListener("loadedmetadata", () => {
    setState({ duration: target.duration || 0 });
  });

  target.addEventListener("play", () => {
    setState({ isPlaying: true });
  });

  target.addEventListener("pause", () => {
    setState({ isPlaying: false });
  });

  target.addEventListener("ended", () => {
    if (state.repeat === "one") {
      target.currentTime = 0;
      target.play();
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

    setState({ isPlaying: false });
  });
}

async function prepareAudioSource(track: TrackRecord, requestId: number) {
  if (track.sourceType === "local" && track.filePath) {
    const url = await resolveLocalFileUrl({
      filePath: track.filePath,
      fileName: track.fileName,
      sourceType: track.sourceType,
    });
    if (requestId !== playRequestId) return null;
    if (url) return { url };
  }

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
    const type = blob.type || "audio/mpeg";
    if (audio?.canPlayType(type) === "" && type !== "audio/mpeg") {
      throw new Error("Audio format not supported in this WebView.");
    }
    currentUrl = URL.createObjectURL(blob);
    return { url: currentUrl };
  }

  if (track.sourceUrl) {
    return { url: track.sourceUrl };
  }

  return null;
}

async function playIndex(index: number) {
  const next = state.queue[index];
  if (!next) return;
  const requestId = ++playRequestId;

  setState({ index, current: next, currentTime: 0, duration: 0 });

  destroyAudio();
  audio = new Audio();
  bindAudioEvents(audio);

  const source = await prepareAudioSource(next, requestId);
  if (!source || requestId !== playRequestId || !audio) return;

  if (currentUrl && source.url !== currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }

  audio.src = source.url;
  audio.load();
  await audio.play();
  if (requestId !== playRequestId) return;
  setState({ isPlaying: true });
}

export function setQueue(queue: TrackRecord[], startIndex = 0) {
  setState({ queue, index: startIndex, current: queue[startIndex] });
  void playIndex(startIndex);
}

export function playTrack(track: TrackRecord, queue?: TrackRecord[]) {
  if (queue) {
    setQueue(queue, 0);
    return;
  }
  setQueue([track], 0);
}

export function togglePlay() {
  if (!state.current) return;
  if (!audio) {
    void playIndex(state.index);
    return;
  }
  if (audio.paused) {
    void audio.play();
  } else {
    audio.pause();
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

export function seekTo(time: number) {
  if (!audio) return;
  audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
  setState({ currentTime: audio.currentTime });
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
