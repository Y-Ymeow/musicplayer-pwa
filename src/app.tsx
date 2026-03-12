import { useEffect, useRef, useState } from 'preact/hooks';
import { LibraryPanel, PlayerBar, SidebarContent, SongInfoPanel } from './components/feature';
import {
  DownloadsPage,
  LibraryPage,
  LocalPage,
  LyricsPage,
  OnlinePage,
  PlaylistPage,
  SearchPage,
} from './pages';
import { initDb } from './services';
import { navigate, useHashRoute, useMediaQuery } from './utils';

export function App() {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const route = useHashRoute('/library');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    initDb().catch((error: unknown) => {
      console.error('IndexedDB init failed', error);
    });
  }, []);

  const renderRoute = () => {
    switch (route) {
      case '/lyrics':
        return <LyricsPage />;
      case '/local':
        return <LocalPage />;
      case '/online':
        return <OnlinePage />;
      case '/search':
        return <SearchPage />;
      case '/playlist':
        return <PlaylistPage />;
      case '/downloads':
        return <DownloadsPage />;
      case '/library':
      default:
        return isDesktop ? <LyricsPage /> : <LibraryPage />;
    }
  };

  return (
    <div class="min-h-screen bg-neutral-950 text-neutral-100">
      {!isDesktop && drawerOpen && (
        <div class="fixed inset-0 z-50">
          <div
            class="absolute inset-0 bg-black/70"
            onClick={() => setDrawerOpen(false)}
          />
          <div class="absolute left-0 top-0 h-full w-72 bg-neutral-950 p-6 shadow-2xl">
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
      <div class="grid min-h-screen w-full gap-6 px-4 pb-28 pt-4 md:px-6 md:pt-6 lg:grid-cols-[360px_1fr]">
        <section class="hidden lg:flex lg:flex-col lg:gap-6">
          <div class="flex-1">
            <LibraryPanel />
          </div>
          <div class="mt-auto">
            <SongInfoPanel />
          </div>
        </section>

        <section
          class="relative flex min-h-[70vh] flex-col lg:h-[calc(100vh-7rem)]"
          onTouchStart={(event) => {
            const touch = event.touches[0];
            touchStartX.current = touch?.clientX ?? null;
            touchStartY.current = touch?.clientY ?? null;
          }}
          onTouchEnd={(event) => {
            if (drawerOpen) return;
            if (route !== '/library' && route !== '/lyrics') return;
            const touch = event.changedTouches[0];
            if (!touch) return;
            const startX = touchStartX.current;
            const startY = touchStartY.current;
            if (startX === null || startY === null) return;
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;
            if (Math.abs(deltaX) < 80 || Math.abs(deltaX) < Math.abs(deltaY)) return;
            if (deltaX < 0) navigate('/lyrics');
            if (deltaX > 0) navigate('/library');
          }}
        >
          {!isDesktop && (
            <button
              class="absolute left-3 top-3 z-20 rounded-full border border-white/10 bg-neutral-900/70 px-3 py-2 text-xs text-white"
              onClick={() => setDrawerOpen(true)}
            >
              菜单
            </button>
          )}
          <div class="lg:hidden h-full overflow-y-auto">{renderRoute()}</div>
          <div class="hidden h-full lg:block overflow-y-auto">{renderRoute()}</div>
        </section>
      </div>

      <div class="fixed inset-x-0 bottom-0 z-40">
        <PlayerBar />
      </div>
    </div>
  );
}
