import { replacePlugins, type PluginRecord } from './plugins';
import { requestJson } from './request';

export interface MusicFreePluginList {
  desc?: string;
  plugins: Array<{ name: string; url: string; version?: string }>;
}

export async function importMusicFreePlugins(payload: string) {
  let data: MusicFreePluginList;
  try {
    data = JSON.parse(payload) as MusicFreePluginList;
  } catch {
    data = await requestJson<MusicFreePluginList>(payload);
  }

  if (!data.plugins || !Array.isArray(data.plugins)) {
    throw new Error('Invalid plugin list');
  }

  const items: Omit<PluginRecord, 'id'>[] = data.plugins.map((plugin) => {
    const url = String(plugin.url ?? '').trim();
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid plugin url: ${url || 'empty'}`);
    }
    return {
      source: 'musicfree',
      name: plugin.name,
      url,
      version: plugin.version,
      enabled: true,
    };
  });

  await replacePlugins('musicfree', items);
  return items.length;
}
