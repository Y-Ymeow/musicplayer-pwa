import type { OnlineSource } from './registry';
import { registerSource } from './registry';

const lxSource: OnlineSource = {
  id: 'lx',
  name: 'LX Music',
  type: 'lx',
  async search() {
    return [];
  },
  async getTrack() {
    return null;
  },
};

const musicFreeSource: OnlineSource = {
  id: 'musicfree',
  name: 'MusicFree',
  type: 'musicfree',
  async search() {
    return [];
  },
  async getTrack() {
    return null;
  },
};

export function initOnlineSources() {
  registerSource(lxSource);
  registerSource(musicFreeSource);
}
