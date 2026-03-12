import { ensureDbReady, TrackModel } from "./db";
import { isAudioFile, pickAudioDirectory, pickAudioFiles } from "../utils/file";
import { extractMetadata } from "./metadata";
import { cacheLocalFile, makeFileKey } from "./local-cache";

function guessTitle(fileName: string) {
  const base = fileName.replace(/\.[^/.]+$/, "");
  return base || fileName;
}

export async function importLocalFiles() {
  const handles = await pickAudioFiles();
  return importFileHandles(handles);
}

export async function importLocalDirectory() {
  const handles = await pickAudioDirectory();
  return importFileHandles(handles);
}

export async function importFileHandles(handles: FileSystemFileHandle[]) {
  await ensureDbReady();
  const created = [] as number[];

  for (const handle of handles) {
    if (handle.kind !== "file") continue;
    if (!isAudioFile(handle.name)) continue;

    const file = await handle.getFile();
    let metadata = {};
    try {
      metadata = await extractMetadata(file);
    } catch (error) {
      console.warn("Metadata parse failed", handle.name, error);
    }

    const parsed = metadata as Awaited<ReturnType<typeof extractMetadata>>;
    const title = parsed.title || guessTitle(handle.name);
    const fileKey = makeFileKey(file, handle.name);
    const filePath =
      (handle as any).path || (handle as any)._path || (file as any)._path;
    (file as any).path || (file as any).webkitRelativePath || undefined;
    cacheLocalFile(fileKey, file);

    let track;
    try {
      track = await TrackModel.create({
        title,
        artist: parsed.artist,
        album: parsed.album,
        duration: parsed.duration,
        cover: parsed.cover,
        lyric: parsed.lyric,
        sourceType: "local",
        fileHandle: handle,
        fileKey,
        filePath,
        fileName: handle.name,
      });
    } catch (error) {
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
          filePath,
          ...(filePath ? {} : { fileBlob: file }),
          fileName: handle.name,
        });
      } else {
        throw error;
      }
    }
    created.push(track.id as number);
  }

  return created;
}

export async function listLocalTracks() {
  await ensureDbReady();
  return TrackModel.findMany({
    where: { sourceType: "local" },
    orderBy: { createdAt: "desc" },
  });
}

export async function clearLocalTracks() {
  await ensureDbReady();
  await TrackModel.deleteMany({ sourceType: "local" });
}
