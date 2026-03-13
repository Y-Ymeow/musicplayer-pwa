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

export async function addTrackToPlaylist(playlistId: number, trackId: number) {
  await ensureDbReady();
  const playlist = await PlaylistModel.findById(playlistId);
  if (!playlist) return null;
  const trackIds = Array.isArray(playlist.trackIds) ? [...playlist.trackIds] : [];
  if (!trackIds.includes(trackId)) {
    trackIds.push(trackId);
  }
  return PlaylistModel.update(playlistId, { trackIds });
}

/**
 * 从播放列表删除歌曲
 */
export async function removeTrackFromPlaylist(playlistId: number, trackId: number) {
  await ensureDbReady();
  const playlist = await PlaylistModel.findById(playlistId);
  if (!playlist) return null;
  const trackIds = (Array.isArray(playlist.trackIds) ? [...playlist.trackIds] : []).filter(
    id => id !== trackId
  );
  return PlaylistModel.update(playlistId, { trackIds });
}

/**
 * 清空播放列表
 */
export async function clearPlaylist(playlistId: number) {
  await ensureDbReady();
  return PlaylistModel.update(playlistId, { trackIds: [] });
}

/**
 * 删除播放列表
 */
export async function deletePlaylist(playlistId: number) {
  await ensureDbReady();
  return PlaylistModel.delete(playlistId);
}

export async function listPlaylistTracks(playlistId: number): Promise<TrackRecord[]> {
  await ensureDbReady();
  const playlist = await PlaylistModel.findById(playlistId);
  if (!playlist) return [];
  const ids = new Set(playlist.trackIds || []);
  const all = await TrackModel.findMany();
  const map = new Map(all.map((track) => [track.id, track]));
  return (playlist.trackIds || [])
    .map((id) => map.get(id))
    .filter((item): item is TrackRecord => Boolean(item && ids.has(item.id as number)));
}
