import axiosLib from 'axios';
import * as cheerio from 'cheerio';
import CryptoJS from 'crypto-js';
import he from 'he';
import dayjs from 'dayjs';
import qs from 'qs';
import bigInt from 'big-integer';
import { requestManager, requestText } from './request';

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

function createAxiosShim() {
  const axios = async (config: any) => {
    return axios.request(config);
  };

  axios.get = async (url: string, config: any = {}) => {
    const response = await requestManager.get(url, {
      params: config.params,
      headers: config.headers,
      responseType: config.responseType || 'json',
    });
    return { data: response.data, status: response.status, headers: response.headers };
  };

  axios.post = async (url: string, data?: unknown, config: any = {}) => {
    const response = await requestManager.post(url, data, {
      params: config.params,
      headers: config.headers,
      responseType: config.responseType || 'json',
    });
    return { data: response.data, status: response.status, headers: response.headers };
  };

  axios.request = async (config: any) => {
    const response = await requestManager.request({
      url: config.url,
      method: config.method || 'GET',
      headers: config.headers,
      params: config.params,
      body: config.data ?? config.body,
      responseType: config.responseType || 'json',
    });
    return { data: response.data, status: response.status, headers: response.headers };
  };

  axios.create = () => createAxiosShim();
  (axios as any).defaults = (axiosLib as any).defaults ?? {};
  (axios as any).default = axios;
  (axios as any).__esModule = true;

  return axios;
}

function createRequire() {
  const axios = createAxiosShim();
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
  const code = await requestText(url);
  const module = { exports: {} as any };
  const exports = module.exports;
  const require = createRequire();
  const fn = new Function('require', 'module', 'exports', code + '\n; return module.exports;');
  const result = fn(require, module, exports);
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
  return plugin.search(query, page, 'music');
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
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to get media source');
}

export async function getLyricWithPlugin(url: string, item: any) {
  const plugin = await loadMusicFreePlugin(url);
  if (!plugin.getLyric) return null;
  return plugin.getLyric(item);
}
