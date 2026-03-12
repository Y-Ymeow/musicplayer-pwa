import { Model, field } from '../framework/indexeddb';
import type { ModelData } from '../framework/indexeddb';
import { db, ensureDbReady } from './db';

export interface PluginRecord extends ModelData {
  id?: number;
  source: 'musicfree';
  name: string;
  url: string;
  version?: string;
  enabled: boolean;
}

export const PluginModel = new Model<PluginRecord>(db, 'plugins', {
  id: field.primary(),
  source: field.string({ required: true }),
  name: field.string({ required: true }),
  url: field.string({ required: true }),
  version: field.string(),
  enabled: field.boolean({ required: true }),
});

export async function listPlugins(source: 'musicfree' | 'all' = 'all') {
  await ensureDbReady();
  if (source === 'all') return PluginModel.findMany({ orderBy: { createdAt: 'desc' } });
  return PluginModel.findMany({ where: { source }, orderBy: { createdAt: 'desc' } });
}

export async function replacePlugins(source: 'musicfree', items: Omit<PluginRecord, 'id'>[]) {
  await ensureDbReady();
  await PluginModel.deleteMany({ source });
  for (const item of items) {
    await PluginModel.create(item);
  }
}

export async function togglePlugin(id: number, enabled: boolean) {
  await ensureDbReady();
  await PluginModel.update(id, { enabled });
}
