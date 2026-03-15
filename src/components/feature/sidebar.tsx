import { Button, ThemeSwitcher } from "../ui";
import { navigate, useHashRoute } from "../../utils";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const route = useHashRoute("/library");
  const items = [
    { label: "歌曲信息", path: "/library" },
    { label: "歌词", path: "/lyrics" },
    { label: "本地音乐", path: "/local" },
    { label: "在线音乐", path: "/online" },
    { label: "搜索", path: "/search" },
    { label: "播放列表", path: "/playlist" },
    { label: "下载管理", path: "/downloads" },
  ];

  return (
    <div class="flex h-full flex-col gap-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-emerald-300/70">
            Library
          </p>
          <h2 class="mt-2 text-lg font-semibold text-white">音乐库</h2>
        </div>
        <ThemeSwitcher />
      </div>
      <nav class="space-y-2 text-sm">
        {items.map((item) => (
          <button
            key={item.path}
            onClick={() => {
              navigate(item.path);
              onNavigate?.();
            }}
            class={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-neutral-200 transition hover:border-emerald-400/30 hover:text-white ${
              route === item.path
                ? "border-emerald-400/50 bg-emerald-400/10"
                : "border-white/5 bg-white/5"
            }`}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div class="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-neutral-400">
        <p>在线源：MusicFree</p>
        <p class="mt-2">支持下载与离线播放</p>
        <Button class="mt-4 w-full" size="sm">
          配置音乐源
        </Button>
      </div>
    </div>
  );
}
