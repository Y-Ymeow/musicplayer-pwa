const cache = new Map<string, File>();

export function makeFileKey(file: File, name?: string) {
  const baseName = name ?? file.name ?? 'file';
  return `${baseName}:${file.size}:${file.lastModified}`;
}

export function cacheLocalFile(key: string, file: File) {
  cache.set(key, file);
}

export function getCachedFile(key: string) {
  return cache.get(key) ?? null;
}

export function clearLocalCache() {
  cache.clear();
}
