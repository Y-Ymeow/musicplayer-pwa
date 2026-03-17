/**
 * 插件管理服务 - 使用 LocalStorage 存储
 */

import { LocalStorage } from "../framework/storages";
import type { PluginRecord } from "./db";

export type { PluginRecord };

// 插件存储
const storage = new LocalStorage("musicplayer:plugins");
const PLUGINS_KEY = "data";

/**
 * 从存储中获取所有插件
 */
async function getAllPlugins(): Promise<PluginRecord[]> {
  try {
    await storage.init();
    const entry = await storage.get<PluginRecord[]>(PLUGINS_KEY);
    return entry?.value ?? [];
  } catch (e) {
    console.error('[plugins] getAllPlugins failed:', e);
    return [];
  }
}

/**
 * 保存所有插件到存储
 */
async function saveAllPlugins(plugins: PluginRecord[]): Promise<void> {
  try {
    await storage.init();
    await storage.set(PLUGINS_KEY, plugins);
  } catch (e) {
    console.error('Failed to save plugins:', e);
  }
}

export async function listPlugins(source: "musicfree" | "all" = "all") {
  const plugins = await getAllPlugins();
  console.log("[plugins] listPlugins plugins:", plugins);

  // 确保 plugins 是数组
  if (!Array.isArray(plugins)) {
    console.warn("[plugins] plugins is not an array:", plugins);
    return [];
  }

  if (source === "all") {
    return plugins.sort((a, b) => {
      const timeA = (a.createdAt as number) ?? 0;
      const timeB = (b.createdAt as number) ?? 0;
      return timeB - timeA;
    });
  }

  return plugins
    .filter((p) => p?.source === source)
    .sort((a, b) => {
      const timeA = (a.createdAt as number) ?? 0;
      const timeB = (b.createdAt as number) ?? 0;
      return timeB - timeA;
    });
}

export async function replacePlugins(
  source: "musicfree",
  items: Omit<PluginRecord, "id">[],
) {
  const plugins = await getAllPlugins();

  // 删除指定来源的插件
  const filtered = plugins.filter((p) => p.source !== source);

  // 添加新插件
  const now = Date.now();
  const newPlugins: PluginRecord[] = items.map((item, index) => {
    const itemRecord = item as Record<string, unknown>;
    const plugin: PluginRecord = {
      id: now + index,
      source: "musicfree",
      name: String(itemRecord.name ?? ""),
      url: String(itemRecord.url ?? ""),
      version: itemRecord.version as string | undefined,
      enabled: Boolean(itemRecord.enabled ?? true),
      createdAt: now,
      updatedAt: now,
    };
    return plugin;
  });

  await saveAllPlugins([...filtered, ...newPlugins]);
}

export async function togglePlugin(id: number | string, enabled: boolean) {
  const plugins = await getAllPlugins();

  const updated = plugins.map((p) => {
    if (p.id === id) {
      return { ...p, enabled, updatedAt: Date.now() };
    }
    return p;
  });

  await saveAllPlugins(updated);
}
