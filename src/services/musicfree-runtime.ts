import axiosLib from "axios";
import * as cheerio from "cheerio";
import CryptoJS from "crypto-js";
import he from "he";
import dayjs from "dayjs";
import qs from "qs";
import bigInt from "big-integer";
import { requestManager, requestText } from "./request";
import { addLog } from "./logs";
import { StorageManager } from "../framework/storages";
import type { StorageType } from "../framework/storages";

const PLUGIN_ADDR_CACHE_KEY = "plugin:addr:cache";
const PLUGIN_FILE_PREFIX = "plugin:file:";
const DEFAULT_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface MusicFreeSearchResult<T = unknown> {
  isEnd: boolean;
  data: T[];
}

export interface MusicFreePlugin {
  platform?: string;
  author?: string;
  version?: string;
  supportedSearchType?: string[];
  search?: (
    query: string,
    page: number,
    type: string,
  ) => Promise<MusicFreeSearchResult>;
  getMediaSource?: (
    musicItem: any,
    quality: string,
  ) => Promise<{ url: string }>;
  getLyric?: (musicItem: any) => Promise<{ rawLrc: string }>;
}

const pluginCache = new Map<string, MusicFreePlugin>();
let storageManager: StorageManager | null = null;
let storageInitialized = false;

async function initStorageIfNeeded() {
  if (storageInitialized) return;
  try {
    const storage = getStorageManager();
    await storage.initAll();
    storageInitialized = true;
  } catch (error) {
    addLog({
      level: "warn",
      scope: "plugin:cache",
      message: `Failed to init storage: ${error}`,
      data: [error],
    });
  }
}

function getStorageManager() {
  if (!storageManager) {
    storageManager = new StorageManager({
      defaultStorage: "localStorage",
    });
  }
  return storageManager;
}

interface PluginAddrCache {
  [url: string]: {
    code: string;
    cachedAt: number;
  };
}

async function getCachedPluginCode(url: string): Promise<string | null> {
  await initStorageIfNeeded();
  try {
    const storage = getStorageManager();
    const cache = await storage.getValue<PluginAddrCache>(
      PLUGIN_ADDR_CACHE_KEY,
      "localStorage",
    );
    if (!cache || !cache[url]) return null;

    const cached = cache[url];
    // Check if cache is expired (default 7 days)
    if (Date.now() - cached.cachedAt > DEFAULT_CACHE_TTL) {
      return null;
    }
    return cached.code;
  } catch {
    return null;
  }
}

async function setCachedPluginCode(url: string, code: string): Promise<void> {
  await initStorageIfNeeded();
  try {
    const storage = getStorageManager();
    const existing =
      (await storage.getValue<PluginAddrCache>(
        PLUGIN_ADDR_CACHE_KEY,
        "localStorage",
      )) || {};
    existing[url] = {
      code,
      cachedAt: Date.now(),
    };
    await storage.set(
      PLUGIN_ADDR_CACHE_KEY,
      existing,
      DEFAULT_CACHE_TTL,
      undefined,
      "localStorage",
    );
  } catch (error) {
    addLog({
      level: "warn",
      scope: `plugin:${url}`,
      message: `Failed to cache plugin code: ${error}`,
      data: [error],
    });
  }
}

async function getCachedPluginFromOPFS(
  url: string,
): Promise<MusicFreePlugin | null> {
  await initStorageIfNeeded();
  try {
    const storage = getStorageManager();
    const key = `${PLUGIN_FILE_PREFIX}${btoa(url)}`;
    const entry = await storage.get<{ code: string; cachedAt: number }>(
      key,
      "opfs",
    );
    if (!entry) return null;

    if (Date.now() - entry.value.cachedAt > DEFAULT_CACHE_TTL) {
      await storage.delete(key, "opfs");
      return null;
    }

    // Execute cached code
    return executePluginCode(entry.value.code, url);
  } catch {
    return null;
  }
}

async function setCachedPluginToOPFS(
  url: string,
  plugin: MusicFreePlugin,
  code: string,
): Promise<void> {
  await initStorageIfNeeded();
  try {
    const storage = getStorageManager();
    const key = `${PLUGIN_FILE_PREFIX}${btoa(url)}`;
    await storage.set(
      key,
      { code, cachedAt: Date.now() },
      DEFAULT_CACHE_TTL,
      undefined,
      "opfs",
    );
    // Also cache the parsed plugin in memory
    pluginCache.set(url, plugin);
  } catch (error) {
    addLog({
      level: "warn",
      scope: `plugin:${url}`,
      message: `Failed to cache plugin to OPFS: ${error}`,
      data: [error],
    });
  }
}

function executePluginCode(code: string, url: string): MusicFreePlugin {
  const module = { exports: {} as any };
  const exports = module.exports;
  const require = createRequire(url);
  const pluginConsole = createPluginConsole(url);
  const fn = new Function(
    "require",
    "module",
    "exports",
    "console",
    `${code}\n; return module.exports;`,
  );
  const result = fn(require, module, exports, pluginConsole);
  const plugin = (result?.default ?? result) as MusicFreePlugin;
  if (!plugin || typeof plugin !== "object") {
    throw new Error("Invalid plugin");
  }
  return plugin;
}

function formatArgs(args: unknown[]) {
  return args
    .map((item) => {
      if (typeof item === "string") return item;
      try {
        return JSON.stringify(item);
      } catch {
        return String(item);
      }
    })
    .join(" ");
}

function createPluginConsole(url: string) {
  const scope = `plugin:${url}`;
  return {
    log: (...args: unknown[]) => {
      addLog({ level: "log", scope, message: formatArgs(args), data: args });
    },
    warn: (...args: unknown[]) => {
      addLog({ level: "warn", scope, message: formatArgs(args), data: args });
    },
    error: (...args: unknown[]) => {
      addLog({ level: "error", scope, message: formatArgs(args), data: args });
    },
  };
}

function createAxiosShim(scopeUrl?: string) {
  const scope = scopeUrl ? `plugin:${scopeUrl}` : "plugin";
  const axios = async (config: any) => {
    if (config.method.toUpperCase() == "POST") {
      config.headers["x-requested-with"] = "XMLHttpRequest";
    }
    console.log("Config:", config);

    return axios.request(config);
  };

  const normalizeResponse = (
    data: any,
    headers: Record<string, string>,
    responseType?: string,
  ) => {
    if (responseType) return data;
    const contentType =
      headers["content-type"] || headers["Content-Type"] || "";
    if (typeof data === "string") {
      const trimmed = data.trim();
      const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
      if (contentType.includes("application/json") || looksJson) {
        try {
          return JSON.parse(trimmed);
        } catch {
          return data;
        }
      }
    }
    return data;
  };

  axios.get = async (url: string, config: any = {}) => {
    try {
      const response = await requestManager.get(url, {
        params: config.params,
        headers: { ...config.headers },
        responseType: config.responseType ?? "text",
      });
      return {
        data: normalizeResponse(
          response.data,
          response.headers,
          config.responseType,
        ),
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      addLog({
        level: "error",
        scope,
        message: `request failed: GET ${String(url)} ${error instanceof Error ? error.message : String(error)}`,
        data: [error],
      });
      throw error;
    }
  };

  axios.post = async (url: string, data?: unknown, config: any = {}) => {
    try {
      const response = await requestManager.post(url, data, {
        params: config.params,
        headers: { ...config.headers, "x-requested-with": "XMLHttpRequest" },
        responseType: config.responseType ?? "text",
      });
      return {
        data: normalizeResponse(
          response.data,
          response.headers,
          config.responseType,
        ),
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      addLog({
        level: "error",
        scope,
        message: `request failed: POST ${String(url)} ${error instanceof Error ? error.message : String(error)}`,
        data: [error],
      });
      throw error;
    }
  };

  axios.request = async (config: any) => {
    try {
      const response = await requestManager.request({
        url: config.url,
        method: config.method || "GET",
        headers:
          (config.method || "POST") == "POST"
            ? { ...config.headers, "x-requested-with": "XMLHttpRequest" }
            : config.headers,
        params: config.params,
        body: config.data ?? config.body,
        responseType: config.responseType ?? "text",
      });
      return {
        data: normalizeResponse(
          response.data,
          response.headers,
          config.responseType,
        ),
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      addLog({
        level: "error",
        scope,
        message: `request failed: ${String(config?.method ?? "GET")} ${String(config?.url)} ${
          error instanceof Error ? error.message : String(error)
        }`,
        data: [error],
      });
      throw error;
    }
  };

  axios.create = () => createAxiosShim(scopeUrl);
  (axios as any).defaults = (axiosLib as any).defaults ?? {};
  (axios as any).default = axios;
  (axios as any).__esModule = true;

  return axios;
}

function createRequire(scopeUrl?: string) {
  const axios = createAxiosShim(scopeUrl);
  return (name: string) => {
    if (name === "axios") return axios;
    if (name === "cheerio") return cheerio;
    if (name === "crypto-js") return CryptoJS;
    if (name === "he") return he;
    if (name === "dayjs") return dayjs;
    if (name === "qs") return qs;
    if (name === "big-integer") return bigInt;
    throw new Error(`Unsupported require: ${name}`);
  };
}

export async function loadMusicFreePlugin(
  url: string,
): Promise<MusicFreePlugin> {
  // Check in-memory cache first
  if (pluginCache.has(url)) return pluginCache.get(url)!;

  // Check OPFS cache (parsed plugin)
  const cachedFromOPFS = await getCachedPluginFromOPFS(url);
  if (cachedFromOPFS) {
    addLog({
      level: "log",
      scope: `plugin:${url}`,
      message: "Loaded plugin from OPFS cache",
      data: [],
    });
    return cachedFromOPFS;
  }

  let code = "";

  // Try to get cached code from localStorage
  const cachedCode = await getCachedPluginCode(url);
  if (cachedCode) {
    code = cachedCode;
    addLog({
      level: "log",
      scope: `plugin:${url}`,
      message: "Loaded plugin code from localStorage cache",
      data: [],
    });
  } else {
    // Fetch from remote
    try {
      code = await requestText(url);
      // Cache the code to localStorage
      await setCachedPluginCode(url, code);
    } catch (error) {
      addLog({
        level: "error",
        scope: `plugin:${url}`,
        message: error instanceof Error ? error.message : String(error),
        data: [error],
      });
      throw error;
    }
  }

  // Execute the plugin code
  const plugin = executePluginCode(code, url);

  // Cache the parsed plugin to OPFS
  await setCachedPluginToOPFS(url, plugin, code);

  return plugin;
}

export async function searchWithPlugin(
  url: string,
  query: string,
  page: number,
) {
  const plugin = await loadMusicFreePlugin(url);
  if (!plugin.search) throw new Error("Plugin does not support search");
  try {
    return await plugin.search(query, page, "music");
  } catch (error) {
    addLog({
      level: "error",
      scope: `plugin:${url}`,
      message: error instanceof Error ? error.message : String(error),
      data: [error],
    });
    throw error;
  }
}

export async function getMediaSourceWithPlugin(
  url: string,
  item: any,
  quality = "standard",
) {
  const plugin = await loadMusicFreePlugin(url);
  if (!plugin.getMediaSource)
    throw new Error("Plugin does not support getMediaSource");

  const qualities = [quality, "standard", "high", "low", "super"].filter(
    (q, index, arr) => q && arr.indexOf(q) === index,
  );

  let lastError: unknown = null;
  for (const q of qualities) {
    try {
      const res = await plugin.getMediaSource(item, q);
      if (res?.url) return res;
    } catch (error) {
      addLog({
        level: "error",
        scope: `plugin:${url}`,
        message: error instanceof Error ? error.message : String(error),
        data: [error],
      });
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to get media source");
}

export async function getLyricWithPlugin(url: string, item: any) {
  const plugin = await loadMusicFreePlugin(url);
  if (!plugin.getLyric) return null;
  try {
    return await plugin.getLyric(item);
  } catch (error) {
    addLog({
      level: "error",
      scope: `plugin:${url}`,
      message: error instanceof Error ? error.message : String(error),
      data: [error],
    });
    throw error;
  }
}
