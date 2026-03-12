import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui';

export function PagePanel() {
  return (
    <div class="grid gap-6">
      <Card class="bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900">
        <CardHeader>
          <CardTitle>播放器详情</CardTitle>
          <CardDescription>歌词、封面与播放队列</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4 sm:grid-cols-[160px_1fr]">
            <div class="h-40 w-full rounded-3xl bg-gradient-to-br from-emerald-400/40 to-cyan-400/40" />
            <div class="space-y-3 text-sm text-neutral-300">
              <p class="text-base font-semibold text-white">Space Walk - Demo Track</p>
              <p>Artist · Album · 2024</p>
              <div class="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-neutral-400">
                <p>逐字歌词</p>
                <p class="mt-2 text-white">When the night falls ...</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button>打开歌词</Button>
          <Button variant="secondary">编辑标签</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>音乐源</CardTitle>
          <CardDescription>本地与在线源状态</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-3">
          {['本地文件夹', 'LX Music', 'MusicFree'].map((item) => (
            <div
              key={item}
              class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
            >
              <span class="text-neutral-200">{item}</span>
              <span class="text-xs text-emerald-300">已连接</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
