import jsmediatags from "jsmediatags/dist/jsmediatags.min.js";

export interface ParsedMetadata {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  cover?: string;
  lyric?: string;
}

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

export function extractMetadata(file: File): Promise<ParsedMetadata> {
  return new Promise((resolve, reject) => {
    jsmediatags.read(file, {
      onSuccess: (result) => {
        const tags = result.tags as Record<string, any>;
        const picture = tags.picture as
          | { data: number[] | Uint8Array; format: string }
          | undefined;

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

        resolve({
          title: tags.title,
          artist: tags.artist,
          album: tags.album,
          cover: picture ? pictureToDataUrl(picture) : undefined,
          lyric,
        });
      },
      onError: (error) => reject(error),
    });
  });
}
