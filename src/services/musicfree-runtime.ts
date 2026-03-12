import axiosLib from 'axios';
import * as cheerio from 'cheerio';
import CryptoJS from 'crypto-js';
import he from 'he';
import dayjs from 'dayjs';
import qs from 'qs';
import bigInt from 'big-integer';
import { requestManager, requestText } from './request';
import { addLog } from './logs';

export interface MusicFreeSearchResult<T = unknown> {
  isEnd: boolean;
  data: T[];
}

export interface MusicFreePlugin {
  platform?: string;
  author?: string;
  version?: string;
  supportedSearchType?: string[];
  search?: (query: string, page: number, type: string) => Promise<MusicFreeSearchResult>;
  getMediaSource?: (musicItem: any, quality: string) => Promise<{ url: string }>;
  getLyric?: (musicItem: any) => Promise<{ rawLrc: string }>;
}

const pluginCache = new Map<string, MusicFreePlugin>();

function formatArgs(args: unknown[]) {
  return args
    .map((item) => {
      if (typeof item === 'string') return item;
      try {
        return JSON.stringify(item);
      } catch {
        return String(item);
      }
    })
    .join(' ');
}

function createPluginConsole(url: string) {
  const scope = `plugin:${url}`;
  return {
    log: (...args: unknown[]) => {
      addLog({ level: 'log', scope, message: formatArgs(args), data: args });
    },
    warn: (...args: unknown[]) => {
      addLog({ level: 'warn', scope, message: formatArgs(args), data: args });
    },
    error: (...args: unknown[]) => {
      addLog({ level: 'error', scope, message: formatArgs(args), data: args });
    },
  };
}

function createAxiosShim(scopeUrl?: string) {
  const scope = scopeUrl ? `plugin:${scopeUrl}` : 'plugin';
  const axios = async (config: any) => {
    return axios.request(config);
  };

  const normalizeResponse = (data: any, headers: Record<string, string>, responseType?: string) => {
    if (responseType) return data;
    const contentType = headers['content-type'] || headers['Content-Type'] || '';
    if (typeof data === 'string') {
      const trimmed = data.trim();
      const looksJson = trimmed.startsWith('{') || trimmed.startsWith('[');
      if (contentType.includes('application/json') || looksJson) {
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
        headers: config.headers,
        responseType: config.responseType ?? 'text',
      });
      return {
        data: normalizeResponse(response.data, response.headers, config.responseType),
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      addLog({
        level: 'error',
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
        headers: config.headers,
        responseType: config.responseType ?? 'text',
      });
      return {
        data: normalizeResponse(response.data, response.headers, config.responseType),
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      addLog({
        level: 'error',
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
        method: config.method || 'GET',
        headers: config.headers,
        params: config.params,
        body: config.data ?? config.body,
        responseType: config.responseType ?? 'text',
      });
      return {
        data: normalizeResponse(response.data, response.headers, config.responseType),
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      addLog({
        level: 'error',
        scope,
        message: `request failed: ${String(config?.method ?? 'GET')} ${String(config?.url)} ${
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
    if (name === 'axios') return axios;
    if (name === 'cheerio') return cheerio;
    if (name === 'crypto-js') return CryptoJS;
    if (name === 'he') return he;
    if (name === 'dayjs') return dayjs;
    if (name === 'qs') return qs;
    if (name === 'big-integer') return bigInt;
    throw new Error(`Unsupported require: ${name}`);
  };
}

export async function loadMusicFreePlugin(url: string): Promise<MusicFreePlugin> {
  if (pluginCache.has(url)) return pluginCache.get(url)!;
  let code = '';
  try {
    code = await requestText(url);
  } catch (error) {
    addLog({
      level: 'error',
      scope: `plugin:${url}`,
      message: error instanceof Error ? error.message : String(error),
      data: [error],
    });
    throw error;
  }

  const module = { exports: {} as any };
  const exports = module.exports;
  const require = createRequire(url);
  const pluginConsole = createPluginConsole(url);
  const fn = new Function('require', 'module', 'exports', 'console', `${code}\n; return module.exports;`);
  const result = fn(require, module, exports, pluginConsole);
  const plugin = (result?.default ?? result) as MusicFreePlugin;
  if (!plugin || typeof plugin !== 'object') {
    throw new Error('Invalid plugin');
  }
  pluginCache.set(url, plugin);
  return plugin;
}

export async function searchWithPlugin(url: string, query: string, page: number) {
  const plugin = await loadMusicFreePlugin(url);
  if (!plugin.search) throw new Error('Plugin does not support search');
  try {
    return await plugin.search(query, page, 'music');
  } catch (error) {
    addLog({
      level: 'error',
      scope: `plugin:${url}`,
      message: error instanceof Error ? error.message : String(error),
      data: [error],
    });
    throw error;
  }
}

export async function getMediaSourceWithPlugin(url: string, item: any, quality = 'standard') {
  const plugin = await loadMusicFreePlugin(url);
  if (!plugin.getMediaSource) throw new Error('Plugin does not support getMediaSource');

  const qualities = [quality, 'standard', 'high', 'low', 'super'].filter(
    (q, index, arr) => q && arr.indexOf(q) === index
  );

  let lastError: unknown = null;
  for (const q of qualities) {
    try {
      const res = await plugin.getMediaSource(item, q);
      if (res?.url) return res;
    } catch (error) {
      addLog({
        level: 'error',
        scope: `plugin:${url}`,
        message: error instanceof Error ? error.message : String(error),
        data: [error],
      });
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to get media source');
}

export async function getLyricWithPlugin(url: string, item: any) {
  const plugin = await loadMusicFreePlugin(url);
  if (!plugin.getLyric) return null;
  try {
    return await plugin.getLyric(item);
  } catch (error) {
    addLog({
      level: 'error',
      scope: `plugin:${url}`,
      message: error instanceof Error ? error.message : String(error),
      data: [error],
    });
    throw error;
  }
}
