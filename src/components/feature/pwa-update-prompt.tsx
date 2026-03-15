import { useEffect, useState } from "preact/hooks";
import { Button } from "../ui";

export function PWAUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        // Service Worker 已更新并激活，刷新页面
        window.location.reload();
      });

      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdate(true);
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShowUpdate(true);
            }
          });
        });
      });
    }
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div class="fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-4 rounded-2xl border border-white/10 bg-neutral-900/95 p-4 shadow-xl backdrop-blur">
      <div class="flex-1">
        <p class="text-sm font-semibold text-white">新版本已就绪</p>
        <p class="text-xs text-neutral-400">刷新页面以应用更新</p>
      </div>
      <div class="flex gap-2">
        <Button variant="ghost" size="sm" onClick={handleDismiss}>
          稍后
        </Button>
        <Button size="sm" onClick={handleUpdate}>
          更新
        </Button>
      </div>
    </div>
  );
}
