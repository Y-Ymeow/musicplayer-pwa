export interface LyricSegment {
  time: number;
  text: string;
}

export interface LyricLine {
  time: number;
  segments: LyricSegment[];
  raw: string;
}

export interface ParsedLyrics {
  meta: Record<string, string>;
  offset: number;
  lines: LyricLine[];
}

const timeTagRegex = /\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
const metaRegex = /^\[(\w+):([^\]]+)\]$/;

function toMs(min: string, sec: string, ms?: string) {
  const minutes = Number(min);
  const seconds = Number(sec);
  const millis = ms ? Number(ms.padEnd(3, '0')) : 0;
  return minutes * 60_000 + seconds * 1000 + millis;
}

function normalizeText(text: string) {
  return text.replace(/\r/g, '');
}

export function parseWordLrc(raw: string): ParsedLyrics {
  const meta: Record<string, string> = {};
  let offset = 0;
  const lines: LyricLine[] = [];

  const rows = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const row of rows) {
    const metaMatch = row.match(metaRegex);
    if (metaMatch) {
      const key = metaMatch[1].toLowerCase();
      const value = metaMatch[2];
      meta[key] = value;
      if (key === 'offset') {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) offset = parsed;
      }
      continue;
    }

    const tags = [...row.matchAll(timeTagRegex)];
    if (tags.length === 0) continue;

    const segments: LyricSegment[] = [];
    let lastIndex = 0;

    tags.forEach((tag, index) => {
      const tagIndex = tag.index ?? 0;
      const tagLength = tag[0].length;
      const nextIndex = index + 1 < tags.length ? tags[index + 1].index ?? row.length : row.length;
      const text = normalizeText(row.slice(tagIndex + tagLength, nextIndex));
      const time = toMs(tag[1], tag[2], tag[3]) + offset;

      if (text) {
        segments.push({ time: Math.max(0, time) / 1000, text });
      }

      lastIndex = tagIndex + tagLength;
    });

    if (segments.length === 0) {
      const first = tags[0];
      const text = normalizeText(row.replace(timeTagRegex, ''));
      if (!text) continue;
      const time = toMs(first[1], first[2], first[3]) + offset;
      segments.push({ time: Math.max(0, time) / 1000, text });
    }

    const lineTime = segments[0].time;
    lines.push({ time: lineTime, segments, raw: row });
  }

  lines.sort((a, b) => a.time - b.time);

  return { meta, offset, lines };
}

export function getActiveLineIndex(lines: LyricLine[], currentTime: number) {
  let active = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (currentTime >= lines[i].time) {
      active = i;
    } else {
      break;
    }
  }
  return active;
}

export function getActiveSegmentIndex(line: LyricLine, currentTime: number) {
  let active = -1;
  for (let i = 0; i < line.segments.length; i += 1) {
    if (currentTime >= line.segments[i].time) {
      active = i;
    } else {
      break;
    }
  }
  return active;
}

export interface LyricGroup {
  time: number;
  lines: LyricLine[];
}

export function groupLinesByTime(lines: LyricLine[], threshold = 0.02): LyricGroup[] {
  const groups: LyricGroup[] = [];
  for (const line of lines) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(line.time - last.time) <= threshold) {
      last.lines.push(line);
    } else {
      groups.push({ time: line.time, lines: [line] });
    }
  }
  return groups;
}
