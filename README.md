# MusicPlayer PWA

一个面向本地与在线音乐的 PWA 播放器，基于 `bun + preact + vite + tailwindcss4`，支持 IndexedDB、本地歌词解析、MusicFree 插件在线源。

## 功能概览
- 本地音乐：多选音频文件导入、标签解析、歌词解析、播放列表
- 在线音乐：导入 MusicFree 插件列表、搜索、播放、歌词
- 播放器：歌词居中高亮、逐字渐变、高亮行吸附
- PWA：可安装、离线缓存基础资源

## 运行环境
- Node: 推荐 20+
- Bun: 推荐 1.3+

## 开发
```bash
bun install
bun run dev
```

## 构建
```bash
bun run build
```

## 目录结构
- `src/pages` 页面
- `src/components/ui` 基础组件
- `src/components/feature` 业务组件
- `src/services` 数据与业务服务
- `src/framework` 通用框架能力
- `public` 公共静态资源

## 本地音乐导入
当前仅支持多选音频文件导入，目录导入已禁用。

## 在线插件
支持 MusicFree 插件列表 JSON 或列表 URL 导入。

示例结构：
```json
{
  "desc": "0.2.0",
  "plugins": [
    { "name": "Audiomack", "url": "https://.../index.js", "version": "0.0.2" }
  ]
}
```

## WebView / 容器适配
推荐提供以下能力以支持跨域与本地文件解析：
- `window.__AI_FRAMEWORK_REQUEST_BRIDGE__`：外部请求桥接（支持跨域）
- `window.resolve_local_file_url({ path, name, sourceType })`：返回可播放的本地文件 URL

## 相关文档
- `FRAMEWORK.md` 框架与适配说明
- `docs/README.md` 开发流程文档
