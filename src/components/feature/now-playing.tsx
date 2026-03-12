import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input } from '../ui';

export function NowPlayingCard() {
  return (
    <Card class="overflow-hidden">
      <CardHeader>
        <CardTitle>Now Playing</CardTitle>
        <CardDescription>本地与在线音乐统一播放控制</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="rounded-2xl border border-white/10 bg-neutral-950/60 p-4">
          <p class="text-sm text-neutral-400">当前曲目</p>
          <p class="mt-2 text-base font-semibold text-white">Space Walk - Demo Track</p>
          <p class="text-xs text-neutral-500">Artist · Album · 03:24</p>
        </div>
        <Input placeholder="搜索本地/在线音乐" />
      </CardContent>
      <CardFooter>
        <Button>播放</Button>
        <Button variant="secondary">加入列表</Button>
        <Button variant="ghost">更多</Button>
      </CardFooter>
    </Card>
  );
}
