export { initDb, ensureDbReady } from './db';
export { importLocalDirectory, importLocalFiles, listLocalTracks, clearLocalTracks, upsertOnlineTrack } from './library';
export { initOnlineSources } from './online/sources';
export { getSources } from './online/registry';
export { importMusicFreePlugins } from './musicfree';
export { listPlugins, togglePlugin } from './plugins';
export { hasExternalAdapter } from './request';
export { searchWithPlugin, getMediaSourceWithPlugin, getLyricWithPlugin } from './musicfree-runtime';
export { clearLogs, getLogs, subscribeLogs } from './logs';
export type { LogEntry } from './logs';
export { 
  addTrackToPlaylist, 
  listPlaylistTracks,
  removeTrackFromPlaylist,
  clearPlaylist,
  deletePlaylist,
} from './playlists';
export { listPlaylists, createPlaylist } from './playlists';
