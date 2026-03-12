import { createDatabase, field, Model } from '../framework/indexeddb';
import type { ModelData } from '../framework/indexeddb';

export type TrackSourceType = 'local' | 'online';

export interface TrackRecord extends ModelData {
  id?: number;
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  cover?: string;
  sourceType: TrackSourceType;
  sourceId?: string;
  sourceUrl?: string;
  fileHandle?: FileSystemFileHandle;
  fileKey?: string;
  filePath?: string;
  fileBlob?: Blob;
  fileName?: string;
  lyric?: string;
}

export interface PlaylistRecord extends ModelData {
  id?: number;
  name: string;
  trackIds: number[];
}

export interface SourceRecord extends ModelData {
  id?: number;
  name: string;
  type: 'lx' | 'musicfree' | 'custom';
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface DownloadRecord extends ModelData {
  id?: number;
  trackId?: number;
  status: 'idle' | 'downloading' | 'done' | 'error';
  progress?: number;
}

export const db = createDatabase({
  name: 'musicplayer-db',
  version: 3,
  migrations: [
    {
      version: 1,
      description: 'Initial schema',
      steps: [
        { action: 'create', model: 'tracks', changes: { keyPath: 'id', autoIncrement: true } },
        { action: 'create', model: 'playlists', changes: { keyPath: 'id', autoIncrement: true } },
        { action: 'create', model: 'sources', changes: { keyPath: 'id', autoIncrement: true } },
        { action: 'create', model: 'downloads', changes: { keyPath: 'id', autoIncrement: true } },
      ],
    },
    {
      version: 2,
      description: 'Add plugin registry',
      steps: [
        { action: 'create', model: 'plugins', changes: { keyPath: 'id', autoIncrement: true } },
      ],
    },
    {
      version: 3,
      description: 'Ensure base stores exist',
      steps: [
        { action: 'create', model: 'tracks', changes: { keyPath: 'id', autoIncrement: true } },
        { action: 'create', model: 'playlists', changes: { keyPath: 'id', autoIncrement: true } },
        { action: 'create', model: 'sources', changes: { keyPath: 'id', autoIncrement: true } },
        { action: 'create', model: 'downloads', changes: { keyPath: 'id', autoIncrement: true } },
        { action: 'create', model: 'plugins', changes: { keyPath: 'id', autoIncrement: true } },
      ],
    },
  ],
});

let dbReady: Promise<void> | null = null;

export async function initDb() {
  await db.init();
}

export async function ensureDbReady() {
  if (!dbReady) {
    dbReady = db.init();
  }
  await dbReady;
}

export const TrackModel = new Model<TrackRecord>(db, 'tracks', {
  id: field.primary(),
  title: field.string({ required: true }),
  artist: field.string(),
  album: field.string(),
  duration: field.number(),
  cover: field.string(),
  sourceType: field.string({ required: true }),
  sourceId: field.string(),
  sourceUrl: field.string(),
  fileName: field.string(),
  fileKey: field.string(),
  filePath: field.string(),
  fileHandle: field.json(),
  fileBlob: field.json(),
  lyric: field.string(),
});

export const PlaylistModel = new Model<PlaylistRecord>(db, 'playlists', {
  id: field.primary(),
  name: field.string({ required: true }),
  trackIds: field.array({ required: true }),
});

export const SourceModel = new Model<SourceRecord>(db, 'sources', {
  id: field.primary(),
  name: field.string({ required: true }),
  type: field.string({ required: true }),
  enabled: field.boolean({ required: true }),
  config: field.json(),
});

export const DownloadModel = new Model<DownloadRecord>(db, 'downloads', {
  id: field.primary(),
  trackId: field.number(),
  status: field.string({ required: true }),
  progress: field.number(),
});
