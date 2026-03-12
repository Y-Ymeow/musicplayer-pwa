export interface OnlineTrack {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  cover?: string;
  url?: string;
  lyric?: string;
}

export interface OnlineSource {
  id: string;
  name: string;
  type: 'lx' | 'musicfree' | 'custom';
  search(query: string): Promise<OnlineTrack[]>;
  getTrack(id: string): Promise<OnlineTrack | null>;
  download?(track: OnlineTrack): Promise<Blob>;
}

const sources = new Map<string, OnlineSource>();

export function registerSource(source: OnlineSource) {
  sources.set(source.id, source);
}

export function getSources() {
  return Array.from(sources.values());
}

export function getSource(id: string) {
  return sources.get(id) ?? null;
}
