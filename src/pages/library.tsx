import { LibraryPanel, SongInfoPanel } from "../components/feature";
import { useMediaQuery } from "../utils";

export function LibraryPage() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  return (
    <div class="flex flex-col gap-6">
      {isDesktop && <LibraryPanel />}
      <SongInfoPanel />
    </div>
  );
}
