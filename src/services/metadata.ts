/**
 * 元数据提取模块
 * 
 * 支持从完整文件或文件片段中提取音频元数据
 * - 使用 jsmediatags 解析 ID3 等标签
 * - 支持从 ArrayBuffer 范围读取（优化大文件处理）
 */

import jsmediatags from "jsmediatags/dist/jsmediatags.min.js";

export interface ParsedMetadata {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  cover?: string;
  lyric?: string;
}

/**
 * 将图片数据转换为 DataURL
 */
function pictureToDataUrl(picture: {
  data: number[] | Uint8Array;
  format: string;
}) {
  const data =
    picture.data instanceof Uint8Array
      ? picture.data
      : new Uint8Array(picture.data);
  let binary = "";
  for (let i = 0; i < data.length; i += 1) {
    binary += String.fromCharCode(data[i]);
  }
  const base64 = btoa(binary);
  return `data:${picture.format};base64,${base64}`;
}

/**
 * 从完整文件提取元数据
 */
export function extractMetadata(file: File): Promise<ParsedMetadata> {
  return new Promise((resolve, reject) => {
    jsmediatags.read(file, {
      onSuccess: (result: { tags: Record<string, unknown> }) => {
        const tags = result.tags as Record<string, any>;
        const metadata = parseTags(tags);
        resolve(metadata);
      },
      onError: (error: unknown) => reject(error),
    });
  });
}

/**
 * 从文件片段（ArrayBuffer）提取元数据
 * 
 * 用于优化大文件处理，只读取前 256KB 通常足够获取元数据
 * 
 * @param arrayBuffer 文件片段的 ArrayBuffer
 * @param fileName 文件名（用于确定文件类型）
 * @param fileOffset 片段在原文件中的偏移量（用于计算尾部元数据）
 */
export function extractMetadataFromRange(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  fileOffset: number = 0
): Promise<ParsedMetadata> {
  return new Promise((resolve, reject) => {
    try {
      // jsmediatags 不支持直接读取 ArrayBuffer
      // 需要将 ArrayBuffer 转换为 Blob
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      
      jsmediatags.read(blob, {
        onSuccess: (result: { tags: Record<string, unknown> }) => {
          const tags = result.tags as Record<string, any>;
          const metadata = parseTags(tags);
          resolve(metadata);
        },
        onError: (error: unknown) => {
          // 如果片段读取失败，可能需要更多数据
          reject(error);
        },
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 解析标签数据
 */
function parseTags(tags: Record<string, any>): ParsedMetadata {
  const picture = tags.picture as
    | { data: number[] | Uint8Array; format: string }
    | undefined;

  // 提取歌词
  const rawLyric =
    tags.lyrics?.lyrics ??
    tags.lyrics ??
    tags.unsynchronizedLyrics ??
    tags.synchronizedLyrics ??
    undefined;
    
  const extractText = (value: unknown): string[] => {
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) {
      return value.flatMap(extractText);
    }
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const stringKeys = ["text", "lyrics", "content", "line", "value"];
      for (const key of stringKeys) {
        const v = obj[key];
        if (typeof v === "string") return [v];
      }
      const arrayKeys = ["lines", "text", "lyrics", "content"];
      for (const key of arrayKeys) {
        const v = obj[key];
        if (Array.isArray(v)) return v.flatMap(extractText);
      }
    }
    return [];
  };

  const lines = extractText(rawLyric)
    .map((line) => line.trim())
    .filter(Boolean);
  const lyric = lines.length > 0 ? lines.join("\n") : undefined;

  return {
    title: tags.title,
    artist: tags.artist,
    album: tags.album,
    cover: picture ? pictureToDataUrl(picture) : undefined,
    lyric,
  };
}

/**
 * 从文件尾部读取元数据（用于某些 FLAC 文件）
 * 
 * 某些 FLAC 文件的元数据可能在文件尾部
 * 
 * @param handle 文件句柄
 * @param tailSize 从尾部读取的字节数（默认 64KB）
 */
export async function extractMetadataFromTail(
  handle: { slice(start: number, end: number): Promise<Blob> },
  fileSize: number,
  tailSize: number = 65536
): Promise<ParsedMetadata | null> {
  try {
    const start = Math.max(0, fileSize - tailSize);
    const blob = await handle.slice(start, fileSize);
    const arrayBuffer = await blob.arrayBuffer();
    
    return await extractMetadataFromRange(arrayBuffer, '', start);
  } catch (error) {
    console.warn('Failed to extract metadata from file tail:', error);
    return null;
  }
}
