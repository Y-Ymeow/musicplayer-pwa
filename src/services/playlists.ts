import { PlaylistModel } from './db';
import { ensureDbReady } from './db';

export async function listPlaylists() {
  await ensureDbReady();
  return PlaylistModel.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function createPlaylist(name: string) {
  await ensureDbReady();
  return PlaylistModel.create({ name, trackIds: [] });
}
