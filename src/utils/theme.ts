/**
 * 主题色管理模块
 * 支持多种主题色切换，使用 localStorage 记忆用户选择
 */

export type ThemeColor =
  | "emerald"
  | "blue"
  | "purple"
  | "red"
  | "orange"
  | "pink";
export type ThemeMode = "dark" | "light";

export interface ThemeConfig {
  name: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryLighter: string;
  gradientFrom: string;
  gradientTo: string;
  accent: string;
  // 背景色
  darkBgStart: string;
  darkBgEnd: string;
  lightBgStart: string;
  lightBgEnd: string;
}

export const BASE_COLORS: any = {
  lyricsLightTextColor: "#bdc0c7",
  lyricsDarkTextColor: "#6a7282",
  lyricBaseDark: "#ffffff",
  lyricBaseLight: "#6a7282",
};

export const THEME_COLORS: Record<ThemeColor, ThemeConfig> = {
  emerald: {
    name: "翡翠绿",
    primary: "#34d399", // emerald-400
    primaryHover: "#10b981", // emerald-500
    primaryLight: "rgba(52, 211, 153, 0.3)",
    primaryLighter: "rgba(52, 211, 153, 0.1)",
    gradientFrom: "from-emerald-400/60",
    gradientTo: "to-cyan-400/60",
    accent: "emerald",
    darkBgStart: "#0a0a0a",
    darkBgEnd: "#171717",
    lightBgStart: "#f0fdf4",
    lightBgEnd: "#dcfce7",
  },
  blue: {
    name: "天空蓝",
    primary: "#60a5fa", // blue-400
    primaryHover: "#3b82f6", // blue-500
    primaryLight: "rgba(96, 165, 250, 0.3)",
    primaryLighter: "rgba(96, 165, 250, 0.1)",
    gradientFrom: "from-blue-400/60",
    gradientTo: "to-cyan-400/60",
    accent: "blue",
    darkBgStart: "#0f172a",
    darkBgEnd: "#1e293b",
    lightBgStart: "#eff6ff",
    lightBgEnd: "#dbeafe",
  },
  purple: {
    name: "紫罗兰",
    primary: "#a78bfa", // purple-400
    primaryHover: "#8b5cf6", // purple-500
    primaryLight: "rgba(167, 139, 250, 0.3)",
    primaryLighter: "rgba(167, 139, 250, 0.1)",
    gradientFrom: "from-purple-400/60",
    gradientTo: "to-pink-400/60",
    accent: "purple",
    darkBgStart: "#0f0a1f",
    darkBgEnd: "#1e1035",
    lightBgStart: "#faf5ff",
    lightBgEnd: "#f3e8ff",
  },
  red: {
    name: "玫瑰红",
    primary: "#f87171", // red-400
    primaryHover: "#ef4444", // red-500
    primaryLight: "rgba(248, 113, 113, 0.3)",
    primaryLighter: "rgba(248, 113, 113, 0.1)",
    gradientFrom: "from-red-400/60",
    gradientTo: "to-orange-400/60",
    accent: "red",
    darkBgStart: "#1a0a0a",
    darkBgEnd: "#2b0f0f",
    lightBgStart: "#fef2f2",
    lightBgEnd: "#fee2e2",
  },
  orange: {
    name: "落日橙",
    primary: "#fb923c", // orange-400
    primaryHover: "#f97316", // orange-500
    primaryLight: "rgba(251, 146, 60, 0.3)",
    primaryLighter: "rgba(251, 146, 60, 0.1)",
    gradientFrom: "from-orange-400/60",
    gradientTo: "to-amber-400/60",
    accent: "orange",
    darkBgStart: "#1a0f05",
    darkBgEnd: "#2b1808",
    lightBgStart: "#fffbeb",
    lightBgEnd: "#fef3c7",
  },
  pink: {
    name: "樱花粉",
    primary: "#f472b6", // pink-400
    primaryHover: "#ec4899", // pink-500
    primaryLight: "rgba(244, 114, 182, 0.3)",
    primaryLighter: "rgba(244, 114, 182, 0.1)",
    gradientFrom: "from-pink-400/60",
    gradientTo: "to-rose-400/60",
    accent: "pink",
    darkBgStart: "#1a0512",
    darkBgEnd: "#2b081f",
    lightBgStart: "#fdf2f8",
    lightBgEnd: "#fce7f3",
  },
};

const THEME_COLOR_KEY = "musicplayer-theme";
const THEME_MODE_KEY = "musicplayer-mode";

/**
 * 获取当前主题色
 */
export function getCurrentTheme(): ThemeColor {
  if (typeof window === "undefined") {
    return "emerald";
  }
  const stored = localStorage.getItem(THEME_COLOR_KEY);
  if (stored && stored in THEME_COLORS) {
    return stored as ThemeColor;
  }
  return "emerald";
}

/**
 * 获取当前模式 (dark/light)
 */
export function getCurrentMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }
  const stored = localStorage.getItem(THEME_MODE_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }
  return "dark";
}

/**
 * 设置主题色
 */
export function setTheme(color: ThemeColor) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(THEME_COLOR_KEY, color);
  applyTheme(color, getCurrentMode());
}

/**
 * 设置模式 (dark/light)
 */
export function setMode(mode: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(THEME_MODE_KEY, mode);
  applyTheme(getCurrentTheme(), mode);
}

/**
 * 应用主题色和模式到 CSS 变量
 */
export function applyTheme(color: ThemeColor, mode: ThemeMode) {
  const config = THEME_COLORS[color];
  const root = document.documentElement;
  if (!root) return;

  root.style.setProperty("--theme-primary", config.primary);
  root.style.setProperty("--theme-primary-hover", config.primaryHover);
  root.style.setProperty("--theme-primary-light", config.primaryLight);
  root.style.setProperty("--theme-primary-lighter", config.primaryLighter);
  root.style.setProperty("--theme-accent", config.accent);

  // 设置背景色
  const bgColor =
    mode === "dark"
      ? `linear-gradient(to bottom, ${config.darkBgStart}, ${config.darkBgEnd})`
      : `linear-gradient(to bottom, ${config.lightBgStart}, ${config.lightBgEnd})`;
  root.style.setProperty("--theme-bg-gradient", bgColor);

  // 设置模式
  root.setAttribute("data-theme", color);
  root.setAttribute("data-mode", mode);
}

/**
 * 初始化主题（在应用启动时调用）
 */
export function initTheme() {
  const theme = getCurrentTheme();
  const mode = getCurrentMode();
  applyTheme(theme, mode);
  return { theme, mode };
}

/**
 * 获取所有可用的主题色列表
 */
export function getAvailableThemes(): {
  key: ThemeColor;
  config: ThemeConfig;
}[] {
  return Object.entries(THEME_COLORS).map(([key, config]) => ({
    key: key as ThemeColor,
    config,
  }));
}

/**
 * 获取当前主题的 CSS 变量值
 */
export function getThemeCSSVars() {
  const theme = getCurrentTheme();
  const config = THEME_COLORS[theme];
  return {
    "--theme-primary": config.primary,
    "--theme-primary-hover": config.primaryHover,
    "--theme-primary-light": config.primaryLight,
    "--theme-primary-lighter": config.primaryLighter,
  };
}
