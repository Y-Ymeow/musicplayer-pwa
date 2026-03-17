import { ensureDbReady, PlaylistModel, TrackModel } from './db';
import type { TrackRecord } from './db';

export async function listPlaylists() {
  await ensureDbReady();
  return PlaylistModel.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function createPlaylist(name: string) {
  await ensureDbReady();
  return PlaylistModel.create({ name, trackIds: [] });
}

export async function addTrackToPlaylist(playlistId: number | string, trackId: number | string) {
  await ensureDbReady();
  const playlist = await PlaylistModel.findById(playlistId);
  if (!playlist) return null;
  const trackIds = Array.isArray(playlist.trackIds) ? [...playlist.trackIds] : [];
  // 使用字符串比较确保类型一致
  const trackIdStr = String(trackId);
  if (!trackIds.some(id => String(id) === trackIdStr)) {
    trackIds.push(trackId);
  }
  return PlaylistModel.update(playlistId, { trackIds });
}

/**
 * 从播放列表删除歌曲
 */
export async function removeTrackFromPlaylist(playlistId: number | string, trackId: number | string) {
  await ensureDbReady();
  const playlist = await PlaylistModel.findById(playlistId);
  if (!playlist) return null;
  const trackIdStr = String(trackId);
  const trackIds = (Array.isArray(playlist.trackIds) ? [...playlist.trackIds] : []).filter(
    id => String(id) !== trackIdStr
  );
  return PlaylistModel.update(playlistId, { trackIds });
}

/**
 * 清空播放列表
 */
export async function clearPlaylist(playlistId: number | string) {
  await ensureDbReady();
  return PlaylistModel.update(playlistId, { trackIds: [] });
}

/**
 * 删除播放列表
 */
export async function deletePlaylist(playlistId: number | string) {
  await ensureDbReady();
  return PlaylistModel.delete(playlistId);
}

export async function listPlaylistTracks(playlistId: number | string): Promise<TrackRecord[]> {
  await ensureDbReady();
  const playlist = await PlaylistModel.findById(playlistId);
  if (!playlist) return [];
  const ids = new Set(playlist.trackIds || []);
  const all = await TrackModel.findMany();
  const map = new Map(all.map((track) => [track.id, track]));
  return (playlist.trackIds || [])
    .map((id) => map.get(id))
    .filter((item): item is TrackRecord => Boolean(item));
}
