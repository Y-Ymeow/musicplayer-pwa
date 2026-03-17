/**
 * 数据库服务 - 支持 IndexedDB 和 SQLite 双后端
 * 
 * - 浏览器环境：使用 IndexedDB
 * - Tauri 环境：使用 SQLite（避免 IndexedDB 被莫名清空）
 */

import { createDatabase, field, Model, type ModelData } from '../framework/indexeddb';
import { SQLiteModel, createSQLiteModel, setGlobalBridge, getGlobalBridge, getSQLite } from '../framework/sqlite';
import { isAdaptEnvironment } from '../utils/file';

export type TrackSourceType = 'local' | 'online';

/**
 * 统一的记录接口（兼容两种后端）
 * - IndexedDB: id 是自增数字
 * - SQLite: id = dataId（字符串）
 */
export interface MusicPlayerRecord extends ModelData {
  id?: number | string;
  createdAt?: number;
  updatedAt?: number;
}

export interface TrackRecord extends MusicPlayerRecord {
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  cover?: string;
  sourceType: TrackSourceType;
  sourceId?: string;
  sourceUrl?: string;
  sourcePluginUrl?: string;
  fileHandle?: FileSystemFileHandle;
  fileKey?: string;
  filePath?: string;
  fileBlob?: Blob;
  fileName?: string;
  lyric?: string;
}

export interface PlaylistRecord extends MusicPlayerRecord {
  name: string;
  trackIds: (number | string)[];
}

export interface SourceRecord extends MusicPlayerRecord {
  name: string;
  type: 'lx' | 'musicfree' | 'custom';
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface DownloadRecord extends MusicPlayerRecord {
  trackId?: number | string;
  status: 'idle' | 'downloading' | 'done' | 'error';
  progress?: number;
}

export interface PluginRecord extends MusicPlayerRecord {
  source?: 'musicfree';
  name: string;
  url: string;
  version?: string;
  enabled?: boolean;
}

// ==================== IndexedDB 实现 ====================

const idbDatabase = createDatabase({
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

// ==================== SQLite 模型类 ====================

/**
 * 创建 SQLite 模型（使用 dataId 作为主键）
 */
function createSQLiteModelInstance<T extends MusicPlayerRecord>(
  tableName: string
): SQLiteModel<T> {
  const storage = getSQLite();
  return new SQLiteModel<T>(storage, tableName, { tableName, primaryKey: 'dataId' });
}

// ==================== 模型封装 ====================

/**
 * 统一 Model 包装器 - 在两种后端上提供一致的 API
 */
class UnifiedModel<T extends MusicPlayerRecord> {
  private idbModel?: Model<T>;
  private sqliteModel?: SQLiteModel<T>;
  private tableName: string;

  constructor(idbModel: Model<T>, tableName: string) {
    this.idbModel = idbModel;
    this.tableName = tableName;
  }

  /**
   * 检查是否在 Tauri 环境且已初始化
   */
  private get isSQLite(): boolean {
    // 安全地检查 bridge 是否存在
    try {
      const bridge = getGlobalBridge();
      return isAdaptEnvironment() && bridge !== null;
    } catch {
      // getGlobalBridge 抛出错误说明还没设置
      return false;
    }
  }

  /**
   * 获取或创建 SQLite 模型
   */
  private getSQLiteModel(): SQLiteModel<T> | null {
    if (!this.sqliteModel) {
      try {
        this.sqliteModel = createSQLiteModelInstance<T>(this.tableName);
      } catch (e) {
        console.warn('[UnifiedModel] Failed to create SQLite model:', e);
        return null;
      }
    }
    return this.sqliteModel;
  }

  /**
   * 确保 SQLite 模型已初始化
   */
  private ensureSQLiteModel() {
    if (!this.sqliteModel && this.isSQLite) {
      this.getSQLiteModel();
    }
  }

  async create(data: Partial<T>): Promise<T> {
    if (this.isSQLite) {
      this.ensureSQLiteModel();
      if (this.sqliteModel) {
        const result = await this.sqliteModel.create(data);
        // 为 SQLite 结果添加 id 字段（id = dataId）
        return { ...result, id: result.dataId } as T;
      }
    }
    return await this.idbModel!.create(data);
  }

  async createMany(dataList: Partial<T>[]): Promise<{ success: number; failed: number; errors: Array<{ item: Partial<T>; error: Error }> }> {
    if (this.isSQLite) {
      this.ensureSQLiteModel();
      if (this.sqliteModel) {
        const result = await this.sqliteModel.createMany(dataList);
        // 转换错误类型
        return {
          success: result.success,
          failed: result.failed,
          errors: result.errors.map(e => ({ item: e.item as Partial<T>, error: e.error })),
        };
      }
    }
    // IndexedDB 降级处理
    const result = { success: 0, failed: 0, errors: [] as Array<{ item: Partial<T>; error: Error }> };
    for (const data of dataList) {
      try {
        await this.create(data);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({ item: data, error: error as Error });
      }
    }
    return result;
  }

  async findById(id: number | string): Promise<T | null> {
    if (this.isSQLite) {
      this.ensureSQLiteModel();
      if (this.sqliteModel) {
        const result = await this.sqliteModel.findById(String(id));
        // 为 SQLite 结果添加 id 字段（id = dataId）
        return result ? { ...result, id: result.dataId } : null;
      }
    }
    return await this.idbModel!.findOne({ where: { id } });
  }

  async findOne(options: { where: Partial<T> }): Promise<T | null> {
    if (this.isSQLite) {
      this.ensureSQLiteModel();
      if (this.sqliteModel) {
        // 转换查询条件
        const where = options.where as Record<string, unknown>;
        const id = where.id;
        if (id !== undefined) {
          const result = await this.sqliteModel.findOne(String(id));
          return result ? { ...result, id: result.dataId } : null;
        }
        // 使用 findMany 并取第一条
        const results = await this.sqliteModel.findMany({ where });
        return results.length > 0 ? { ...results[0], id: results[0].dataId } : null;
      }
    }
    return await this.idbModel!.findOne(options);
  }

  async findMany(options?: { where?: Partial<T>; orderBy?: Record<string, 'asc' | 'desc'>; limit?: number; offset?: number }): Promise<T[]> {
    if (this.isSQLite) {
      this.ensureSQLiteModel();
      if (this.sqliteModel) {
        const results = await this.sqliteModel.findMany(options as any);
        // 为 SQLite 结果添加 id 字段（id = dataId）
        return results.map(r => ({ ...r, id: r.dataId } as T));
      }
    }
    return await this.idbModel!.findMany(options as any);
  }

  async findAll(): Promise<T[]> {
    if (this.isSQLite) {
      this.ensureSQLiteModel();
      if (this.sqliteModel) {
        const results = await this.sqliteModel.findAll();
        // 为 SQLite 结果添加 id 字段（id = dataId）
        return results.map(r => ({ ...r, id: r.dataId } as T));
      }
    }
    return await this.idbModel!.findMany();
  }

  async update(id: number | string, data: Partial<T>): Promise<T | null> {
    if (this.isSQLite) {
      this.ensureSQLiteModel();
      if (this.sqliteModel) {
        const result = await this.sqliteModel.update(String(id), data);
        // 为 SQLite 结果添加 id 字段（id = dataId）
        return result ? { ...result, id: result.dataId } : null;
      }
    }
    return await this.idbModel!.update(typeof id === 'number' ? id : Number(id), data);
  }

  async updateMany(where: Partial<T>, data: Partial<T>): Promise<{ updated: number; failed: number }> {
    if (this.isSQLite) {
      this.ensureSQLiteModel();
      if (this.sqliteModel) {
        return await this.sqliteModel.updateMany(where as any, data);
      }
    }
    // IndexedDB 降级处理
    const records = await this.findMany({ where });
    let updated = 0;
    let failed = 0;
    for (const record of records) {
      try {
        await this.update(record.id as number, data);
        updated++;
      } catch {
        failed++;
      }
    }
    return { updated, failed };
  }

  async delete(id: number | string): Promise<boolean> {
    if (this.isSQLite) {
      this.ensureSQLiteModel();
      if (this.sqliteModel) {
        return await this.sqliteModel.delete(String(id));
      }
    }
    return await this.idbModel!.delete(typeof id === 'number' ? id : Number(id));
  }

  async deleteMany(where: Partial<T>): Promise<{ deleted: number; failed: number }> {
    if (this.isSQLite) {
      this.ensureSQLiteModel();
      if (this.sqliteModel) {
        return await this.sqliteModel.deleteMany(where as any);
      }
    }
    // IndexedDB 降级处理
    const records = await this.findMany({ where });
    let deleted = 0;
    let failed = 0;
    for (const record of records) {
      try {
        await this.delete(record.id as number);
        deleted++;
      } catch {
        failed++;
      }
    }
    return { deleted, failed };
  }

  async clear(): Promise<void> {
    if (this.isSQLite) {
      this.ensureSQLiteModel();
      if (this.sqliteModel) {
        await this.sqliteModel.clear();
        return;
      }
    }
    await this.idbModel!.clear();
  }

  async count(where?: Partial<T>): Promise<number> {
    if (this.isSQLite) {
      this.ensureSQLiteModel();
      if (this.sqliteModel) {
        return await this.sqliteModel.count(where ? { where } as any : undefined);
      }
    }
    return await this.idbModel!.count(where ? { where } as any : undefined);
  }

  async exists(id: number | string): Promise<boolean> {
    if (this.isSQLite) {
      this.ensureSQLiteModel();
      if (this.sqliteModel) {
        return await this.sqliteModel.exists(String(id));
      }
    }
    const record = await this.idbModel!.findOne({ where: { id } });
    return record !== null;
  }

  async upsert(data: Partial<T> & { id?: number | string }): Promise<T> {
    if (this.isSQLite) {
      this.ensureSQLiteModel();
      if (this.sqliteModel) {
        return await this.sqliteModel.upsert(data);
      }
    }
    // IndexedDB 的 upsert 逻辑
    const id = data.id;
    if (id !== undefined) {
      const existing = await this.findById(id);
      if (existing?.id) {
        return (await this.update(id, data))!;
      }
    }
    return this.create(data);
  }
}

// ==================== 导出模型 ====================

const idbTrackModel = new Model<TrackRecord>(idbDatabase, 'tracks', {
  id: field.primary(),
  title: field.string({ required: true }),
  artist: field.string(),
  album: field.string(),
  duration: field.number(),
  cover: field.string(),
  sourceType: field.string({ required: true }),
  sourceId: field.string(),
  sourceUrl: field.string(),
  sourcePluginUrl: field.string(),
  fileName: field.string(),
  fileKey: field.string(),
  filePath: field.string(),
  fileHandle: field.json(),
  fileBlob: field.json(),
  lyric: field.string(),
});

export const TrackModel = new UnifiedModel<TrackRecord>(idbTrackModel, 'tracks');

const idbPlaylistModel = new Model<PlaylistRecord>(idbDatabase, 'playlists', {
  id: field.primary(),
  name: field.string({ required: true }),
  trackIds: field.array({ required: true }),
});

export const PlaylistModel = new UnifiedModel<PlaylistRecord>(idbPlaylistModel, 'playlists');

const idbSourceModel = new Model<SourceRecord>(idbDatabase, 'sources', {
  id: field.primary(),
  name: field.string({ required: true }),
  type: field.string({ required: true }),
  enabled: field.boolean({ required: true }),
  config: field.json(),
});

export const SourceModel = new UnifiedModel<SourceRecord>(idbSourceModel, 'sources');

const idbDownloadModel = new Model<DownloadRecord>(idbDatabase, 'downloads', {
  id: field.primary(),
  trackId: field.number(),
  status: field.string({ required: true }),
  progress: field.number(),
});

export const DownloadModel = new UnifiedModel<DownloadRecord>(idbDownloadModel, 'downloads');

const idbPluginModel = new Model<PluginRecord>(idbDatabase, 'plugins', {
  id: field.primary(),
  name: field.string({ required: true }),
  url: field.string({ required: true }),
  version: field.string(),
  enabled: field.boolean(),
});

export const PluginModel = new UnifiedModel<PluginRecord>(idbPluginModel, 'plugins');

// ==================== 初始化函数 ====================

let dbReady: Promise<void> | null = null;
let sqliteInitialized = false;

/**
 * 初始化 SQLite（仅在 Tauri 环境）
 */
async function initSQLiteDB() {
  if (sqliteInitialized) return;
  
  const win = window as any;
  if (win.__TAURI__) {
    setGlobalBridge(win.__TAURI__);
    const { initSQLiteDB } = await import('../framework/sqlite');
    const db = initSQLiteDB(win.__TAURI__, { name: 'musicplayer-db', debug: false });
    await db.init();
    sqliteInitialized = true;
    console.log('[db.ts] SQLite initialized for Tauri environment');
  }
}

export async function initDb() {
  if (isAdaptEnvironment()) {
    await initSQLiteDB();
  } else {
    await idbDatabase.init();
  }
}

export async function ensureDbReady() {
  if (!dbReady) {
    dbReady = initDb();
  }
  await dbReady;
}

/**
 * 检查当前使用的数据库类型
 */
export function getDatabaseType(): 'indexeddb' | 'sqlite' {
  return isAdaptEnvironment() ? 'sqlite' : 'indexeddb';
}
