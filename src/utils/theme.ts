/**
 * 主题色管理模块
 * 支持多种主题色切换，使用 localStorage 记忆用户选择
 */

export type ThemeColor = 'emerald' | 'blue' | 'purple' | 'red' | 'orange' | 'pink';

export interface ThemeConfig {
  name: string;
  primary: string;
  primaryHover: string;
  gradientFrom: string;
  gradientTo: string;
  accent: string;
}

export const THEME_COLORS: Record<ThemeColor, ThemeConfig> = {
  emerald: {
    name: '翡翠绿',
    primary: '#34d399',
    primaryHover: '#10b981',
    gradientFrom: 'from-emerald-400/60',
    gradientTo: 'to-cyan-400/60',
    accent: 'emerald',
  },
  blue: {
    name: '天空蓝',
    primary: '#60a5fa',
    primaryHover: '#3b82f6',
    gradientFrom: 'from-blue-400/60',
    gradientTo: 'to-cyan-400/60',
    accent: 'blue',
  },
  purple: {
    name: '紫罗兰',
    primary: '#a78bfa',
    primaryHover: '#8b5cf6',
    gradientFrom: 'from-purple-400/60',
    gradientTo: 'to-pink-400/60',
    accent: 'purple',
  },
  red: {
    name: '玫瑰红',
    primary: '#f87171',
    primaryHover: '#ef4444',
    gradientFrom: 'from-red-400/60',
    gradientTo: 'to-orange-400/60',
    accent: 'red',
  },
  orange: {
    name: '落日橙',
    primary: '#fb923c',
    primaryHover: '#f97316',
    gradientFrom: 'from-orange-400/60',
    gradientTo: 'to-amber-400/60',
    accent: 'orange',
  },
  pink: {
    name: '樱花粉',
    primary: '#f472b6',
    primaryHover: '#ec4899',
    gradientFrom: 'from-pink-400/60',
    gradientTo: 'to-rose-400/60',
    accent: 'pink',
  },
};

const STORAGE_KEY = 'musicplayer-theme';

/**
 * 获取当前主题色
 */
export function getCurrentTheme(): ThemeColor {
  if (typeof window === 'undefined') {
    return 'emerald';
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in THEME_COLORS) {
    return stored as ThemeColor;
  }
  return 'emerald';
}

/**
 * 设置主题色
 */
export function setTheme(color: ThemeColor) {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(STORAGE_KEY, color);
  applyTheme(color);
}

/**
 * 应用主题色到 CSS 变量
 */
export function applyTheme(color: ThemeColor) {
  const config = THEME_COLORS[color];
  const root = document.documentElement;
  if (!root) return;
  
  root.style.setProperty('--theme-primary', config.primary);
  root.style.setProperty('--theme-primary-hover', config.primaryHover);
  root.style.setProperty('--theme-accent', config.accent);
  
  // 添加 data-theme 属性用于 CSS 选择器
  root.setAttribute('data-theme', color);
}

/**
 * 初始化主题（在应用启动时调用）
 */
export function initTheme() {
  const theme = getCurrentTheme();
  applyTheme(theme);
  return theme;
}

/**
 * 获取所有可用的主题色列表
 */
export function getAvailableThemes(): { key: ThemeColor; config: ThemeConfig }[] {
  return Object.entries(THEME_COLORS).map(([key, config]) => ({
    key: key as ThemeColor,
    config,
  }));
}
