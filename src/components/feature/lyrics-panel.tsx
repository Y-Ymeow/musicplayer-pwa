import { useEffect, useMemo, useRef } from "preact/hooks";
import { usePlayerState } from "../../services/player";
import {
  getActiveLineIndex,
  groupLinesByTime,
  parseWordLrc,
} from "../../utils";
import { getCurrentMode, BASE_COLORS } from "../../utils/theme";

export function LyricsPanel() {
  const player = usePlayerState();
  const track = player.current;
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
        <div class="h-20 w-20 overflow-hidden rounded-3xl theme-gradient-bg">
          {track?.cover ? (
            <img src={track.cover} alt="" class="h-full w-full object-cover" />
          ) : (
            <img src="./logo.png" alt="" class="h-full w-full object-cover" />
          )}
        </div>
        <div class="min-w-[180px] flex-1">
          <p
            class="text-xs uppercase tracking-[0.3em]"
            style={{ color: "var(--theme-primary-light)" }}
          >
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
                  const isActiveLine = isActiveGroup && lineIndex === 0;
                  const hasWordTiming = line.segments.length > 1;
                  const colorMode = getCurrentMode();

                  const lyricTextColor =
                    colorMode == "dark"
                      ? BASE_COLORS.lyricBaseDark
                      : BASE_COLORS.lyricBaseLight;
                  const lyricBgColor =
                    colorMode == "dark"
                      ? BASE_COLORS.lyricsDarkTextColor
                      : BASE_COLORS.lyricsLightTextColor;

                  // 非逐字歌词：激活 group 的所有行都高亮（主题色）
                  if (!hasWordTiming) {
                    return (
                      <p
                        key={`${line.time}-${lineIndex}`}
                        class={isActiveGroup ? "" : "text-gray-500"}
                        style={{
                          whiteSpace: "pre-wrap",
                          color: isActiveGroup ? "var(--theme-primary)" : undefined,
                        }}
                      >
                        {line.segments.map((seg, segIndex) => (
                          <span key={`${line.time}-${segIndex}`}>
                            {seg.text}
                          </span>
                        ))}
                      </p>
                    );
                  }

                  // 逐字歌词：使用整行连续渐变动画
                  const lineStartTime = line.segments[0].time;
                  const lineEndTime = line.segments[line.segments.length - 1].time;
                  const lineDuration = lineEndTime - lineStartTime;

                  // 计算当前时间相对于整行的进度（0-100%）
                  const elapsed = player.currentTime - lineStartTime;
                  const progressPercent = isActiveGroup
                    ? Math.min(100, Math.max(0, (elapsed / lineDuration) * 100))
                    : 0;

                  return (
                    <p
                      key={`${line.time}-${lineIndex}`}
                      class="relative inline-block"
                      style={{
                        whiteSpace: "pre-wrap",
                        color: isActiveGroup ? "white" : "text-gray-500",
                      }}
                    >
                      {/* 背景文字层（用于占位） */}
                      <span aria-hidden="true" style={{ visibility: "hidden" }}>
                        {line.segments.map((seg, segIndex) => (
                          <span key={`${line.time}-${segIndex}`}>{seg.text}</span>
                        ))}
                      </span>

                      {/* 前景渐变层 - 霓虹灯效果 */}
                      {isActiveGroup && (
                        <span
                          class="absolute inset-0 pointer-events-none"
                          style={{
                            background: `linear-gradient(90deg, var(--theme-primary) ${progressPercent}%, white ${progressPercent}%)`,
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            color: "transparent",
                          }}
                        >
                          {line.segments.map((seg, segIndex) => (
                            <span key={`${line.time}-${segIndex}`}>{seg.text}</span>
                          ))}
                        </span>
                      )}

                      {/* 非激活时的文字层（灰色） */}
                      {!isActiveGroup && (
                        <span class="absolute inset-0" style={{ color: "#6b7280" }}>
                          {line.segments.map((seg, segIndex) => (
                            <span key={`${line.time}-${segIndex}`}>{seg.text}</span>
                          ))}
                        </span>
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
