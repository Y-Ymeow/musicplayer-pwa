import { useEffect, useMemo, useRef } from "preact/hooks";
import { usePlayerState } from "../../services/player";
import {
  getActiveLineIndex,
  getActiveSegmentIndex,
  groupLinesByTime,
  parseWordLrc,
} from "../../utils";
import { getCurrentTheme, THEME_COLORS } from "../../utils/theme";

export function LyricsPanel() {
  const player = usePlayerState();
  const track = player.current;
  const theme = THEME_COLORS[getCurrentTheme()];
  const lyricText =
    track?.lyric && track.lyric !== "[object Object]" ? track.lyric : "";
  const parsed = useMemo(
    () => (lyricText ? parseWordLrc(lyricText) : null),
    [lyricText],
  );
  const lines = parsed?.lines ?? [];
  const activeLineIndex = getActiveLineIndex(lines, player.currentTime);
  const groups = useMemo(() => groupLinesByTime(lines), [lines]);
  const activeGroupIndex = useMemo(() => {
    if (activeLineIndex < 0) return -1;
    let cursor = 0;
    for (let i = 0; i < groups.length; i += 1) {
      const groupSize = groups[i].lines.length;
      if (activeLineIndex >= cursor && activeLineIndex < cursor + groupSize) {
        return i;
      }
      cursor += groupSize;
    }
    return -1;
  }, [activeLineIndex, groups]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef(new Map<number, HTMLDivElement>());

  useEffect(() => {
    const container = scrollRef.current;
    const lineEl = lineRefs.current.get(activeGroupIndex);
    if (!container || !lineEl) return;
    const targetTop =
      lineEl.offsetTop - container.clientHeight / 2 + lineEl.clientHeight / 2;
    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  }, [activeLineIndex]);

  return (
    <div class="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6">
      <div class="flex flex-wrap items-start gap-4">
        <div class={`h-20 w-20 overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradientFrom} ${theme.gradientTo}`}>
          {track?.cover ? (
            <img src={track.cover} alt="" class="h-full w-full object-cover" />
          ) : (
            <img src="/logo.png" alt="" class="h-full w-full object-cover" />
          )}
        </div>
        <div class="min-w-[180px] flex-1">
          <p class="text-xs uppercase tracking-[0.3em]" style={{ color: theme.primaryLight }}>
            Lyrics & Song Info
          </p>
          <h2 class="mt-2 text-xl font-semibold text-white">
            {track?.title ?? "暂无播放"}
          </h2>
          <p class="mt-1 text-sm text-neutral-400">
            {track?.artist
              ? `${track.artist} · ${track.album ?? ""}`
              : "选择一首歌曲"}
            {track?.sourceType
              ? ` · ${track.sourceType === "local" ? "本地" : "在线"}`
              : ""}
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        class="mt-6 flex-1 space-y-4 overflow-y-auto pr-3 text-center text-lg leading-relaxed text-neutral-200"
        style={{ scrollbarGutter: "stable" }}
      >
        {groups.length === 0 ? (
          <p class="text-neutral-500">暂无歌词。</p>
        ) : (
          groups.map((group, groupIndex) => {
            const isActiveGroup = groupIndex === activeGroupIndex;
            return (
              <div
                key={`${group.time}-${groupIndex}`}
                ref={(el) => {
                  if (!el) return;
                  lineRefs.current.set(groupIndex, el);
                }}
                class="space-y-2"
              >
                {group.lines.map((line, lineIndex) => {
                  const activeSegment = getActiveSegmentIndex(
                    line,
                    player.currentTime,
                  );
                  const hasWordTiming = line.segments.length > 1;
                  const isActiveLine = isActiveGroup && lineIndex === 0;
                  return (
                    <p
                      key={`${line.time}-${lineIndex}`}
                      class={isActiveGroup ? "text-white" : "text-gray-500"}
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {line.segments.map((seg, segIndex) => {
                        const isBefore =
                          hasWordTiming &&
                          isActiveGroup &&
                          segIndex < activeSegment;
                        const isActive =
                          hasWordTiming &&
                          isActiveGroup &&
                          segIndex === activeSegment;
                        const nextTime =
                          segIndex + 1 < line.segments.length
                            ? line.segments[segIndex + 1].time
                            : (lines[lines.indexOf(line) + 1]?.time ??
                              seg.time + 1);
                        const duration = Math.max(0.2, nextTime - seg.time);
                        const progress = isActive
                          ? Math.min(
                              1,
                              Math.max(
                                0,
                                (player.currentTime - seg.time) / duration,
                              ),
                            )
                          : 0;
                        const text = seg.text;
                        return (
                          <span
                            key={`${line.time}-${segIndex}`}
                            class={isBefore ? "text-[var(--theme-primary)]" : ""}
                            style={{
                              position: "relative",
                              display: "inline-block",
                              color: isActiveGroup
                                ? isBefore
                                  ? theme.primary
                                  : "#ffffff"
                                : "#6a7282",
                            }}
                          >
                            {text}
                            {isActive && (
                              <span
                                aria-hidden="true"
                                class="pointer-events-none absolute inset-0 bg-clip-text text-transparent"
                                style={{
                                  background: `linear-gradient(90deg, ${theme.primary}, ${theme.primaryHover})`,
                                  backgroundSize: `${Math.max(5, progress * 100)}% 100%`,
                                  backgroundRepeat: "no-repeat",
                                  transition: "background-size 120ms linear",
                                  WebkitTextFillColor: "transparent",
                                }}
                              >
                                {text}
                              </span>
                            )}
                          </span>
                        );
                      })}
                      {!hasWordTiming && isActiveLine && (
                        <span style={{ color: theme.primary }}> </span>
                      )}
                    </p>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
