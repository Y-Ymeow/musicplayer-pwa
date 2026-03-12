import { SidebarContent } from './sidebar';
import { Button } from '../ui';
import { navigate } from '../../utils';

export function LibraryPanel() {
  return (
    <div class="rounded-3xl border border-white/10 bg-white/5 p-5">
      <SidebarContent />
      <div class="mt-6 flex gap-3">
        <Button class="flex-1" onClick={() => navigate('/library')}>歌曲信息</Button>
        <Button variant="secondary" class="flex-1" onClick={() => navigate('/lyrics')}>
          歌词
        </Button>
      </div>
    </div>
  );
}
