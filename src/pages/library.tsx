import { LibraryPanel, SongInfoPanel } from '../components/feature';

export function LibraryPage() {
  return (
    <div class="flex flex-col gap-6">
      <LibraryPanel />
      <SongInfoPanel />
    </div>
  );
}
