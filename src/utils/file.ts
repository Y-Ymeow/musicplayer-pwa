/**
 * 文件工具模块
 * 
 * 提供文件选择、路径获取等功能
 * - 浏览器环境：使用 File System Access API
 * - Tauri/adapt.js 环境：使用 adapt.js 提供的 polyfill
 */

const audioExtensions = [
  ".mp3",
  ".flac",
  ".wav",
  ".aac",
  ".m4a",
  ".ogg",
  ".opus",
];

export function isAudioFile(name: string) {
  const lower = name.toLowerCase();
  return audioExtensions.some((ext) => lower.endsWith(ext));
}

/**
 * 扩展 FileSystemFileHandle 接口
 * adapt.js 会添加 getPath() 和 getURL() 方法
 */
export interface ExtendedFileHandle extends FileSystemFileHandle {
  _path?: string;
  _url?: string;
  getPath?(): string | null;
  getURL?(): string | null;
}

/**
 * 选择音频文件
 *
 * 浏览器环境：优先使用 input element（兼容性更好）
 * adapt.js 环境：使用 adapt.js 的 polyfill（调用 Tauri 对话框）
 */
export async function pickAudioFiles(): Promise<ExtendedFileHandle[]> {
  const win = window as any;
  
  // 在 adapt.js 环境，使用 showOpenFilePicker
  if (win.__TAURI__ && "showOpenFilePicker" in window) {
    try {
      const handles = await win.showOpenFilePicker({
        multiple: true,
        types: [
          {
            description: "Audio files",
            accept: {
              "audio/*": audioExtensions,
            },
          },
        ],
      });

      return handles as ExtendedFileHandle[];
    } catch (error) {
      // 用户取消选择
      console.log("[file.ts] User cancelled file selection");
      return [];
    }
  }

  // 浏览器环境：使用 input element（兼容性更好，不需要安全上下文）
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "audio/*";
    
    // 将 input 添加到 DOM（某些浏览器要求）
    input.style.display = "none";
    document.body.appendChild(input);
    
    const cleanup = () => {
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    };
    
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      // 创建兼容的 handle 对象
      const handles = files.map((file) => ({
        kind: "file" as const,
        name: file.name,
        async getFile() { return file; },
        getPath() { return null; },
        getURL() { return null; },
      }));
      cleanup();
      resolve(handles as ExtendedFileHandle[]);
    };
    
    // 用户取消时也会触发 onchange（files 为空）
    // 使用 onclick 检测取消
    input.onclick = () => {
      // 点击后设置标记
      (input as any)._clicked = true;
    };
    
    // 监听 blur 事件检测取消（对话框关闭但未选择文件）
    input.onblur = () => {
      if ((input as any)._clicked && !input.files?.length) {
        // 用户取消了选择
        cleanup();
        resolve([]);
      }
    };
    
    // 直接点击，保持在用户手势上下文中
    input.click();
  });
}

/**
 * 选择音频目录
 *
 * 浏览器环境：使用 showDirectoryPicker
 * adapt.js 环境：暂不支持（返回空数组）
 */
export async function pickAudioDirectory(): Promise<ExtendedFileHandle[]> {
  const win = window as any;
  
  // 仅在 adapt.js 环境使用 showDirectoryPicker
  if (win.__TAURI__ && "showDirectoryPicker" in window) {
    try {
      const dirHandle = await win.showDirectoryPicker();
      const files: ExtendedFileHandle[] = [];

      // 遍历目录
      // @ts-ignore FileSystemDirectoryHandle.entries() may not be in all TypeScript versions
      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind === "file" && isAudioFile(name)) {
          files.push(handle as ExtendedFileHandle);
        }
      }

      return files;
    } catch (error) {
      console.warn("Directory picker failed:", error);
      return [];
    }
  }

  // 纯浏览器环境暂不支持目录选择
  return [];
}

/**
 * 从文件句柄获取路径
 * 
 * adapt.js 会在 handle 上添加 getPath() 方法或 _path 属性
 */
export function getFileHandlePath(handle: ExtendedFileHandle): string | null {
  // 优先使用 getPath() 方法
  if (handle.getPath && typeof handle.getPath === "function") {
    return handle.getPath();
  }
  
  // 兼容 _path 属性
  if (handle._path) {
    return handle._path;
  }
  
  // 降级：尝试从 file 对象获取
  return null;
}

/**
 * 从文件句柄获取播放 URL
 * 
 * adapt.js 会在 handle 上添加 getURL() 方法或 _url 属性
 * 返回的 URL 格式：
 * - 桌面端：static://localhost/...
 * - 移动端：http://static.localhost/...
 */
export function getFileHandleURL(handle: ExtendedFileHandle): string | null {
  // 优先使用 getURL() 方法
  if (handle.getURL && typeof handle.getURL === "function") {
    return handle.getURL();
  }
  
  // 兼容 _url 属性
  if (handle._url) {
    return handle._url;
  }
  
  return null;
}

/**
 * 读取文件片段（用于元数据提取）
 * 
 * adapt.js 提供 window.__TAURI__.readFileRange() 方法
 * 只读取文件开头部分（通常足够获取 ID3/FLAC 元数据）
 * 避免读取整个大文件
 * 
 * @param handle 文件句柄
 * @param offset 起始位置（字节）
 * @param length 读取长度（字节），默认 256KB
 */
export async function readFileRange(
  handle: ExtendedFileHandle | File,
  offset: number = 0,
  length: number = 262144  // 默认 256KB
): Promise<ArrayBuffer | null> {
  // 如果是 File 对象，使用 slice 方法
  if (handle instanceof File) {
    const sliceStart = offset;
    const sliceEnd = Math.min(offset + length, handle.size);
    const blob = handle.slice(sliceStart, sliceEnd);
    return await blob.arrayBuffer();
  }

  // 尝试使用 adapt.js 的 readFileRange
  const win = window as any;
  if (win.__TAURI__?.readFileRange) {
    const filePath = getFileHandlePath(handle);
    if (filePath) {
      try {
        const result = await win.__TAURI__.readFileRange(filePath, offset, length);
        if (result && result.arrayBuffer) {
          return result.arrayBuffer;
        }
      } catch (error) {
        console.warn("readFileRange failed, falling back to slice:", error);
      }
    }
  }

  // 降级方案：读取整个文件后切片
  try {
    const file = await handle.getFile();
    const sliceStart = offset;
    const sliceEnd = Math.min(offset + length, file.size);
    const blob = file.slice(sliceStart, sliceEnd);
    return await blob.arrayBuffer();
  } catch (error) {
    console.error("Failed to read file range:", error);
    return null;
  }
}

/**
 * 获取文件完整内容
 * 
 * adapt.js 提供 window.__TAURI__.get_file_info() 方法
 */
export async function getFileContent(handle: ExtendedFileHandle): Promise<Blob | null> {
  const win = window as any;
  const filePath = getFileHandlePath(handle);
  
  if (filePath && win.__TAURI__?.get_file_info) {
    try {
      const info = await win.__TAURI__.get_file_info(filePath);
      if (info && info.blob) {
        return info.blob;
      }
    } catch (error) {
      console.warn("get_file_info failed, falling back to getFile:", error);
    }
  }

  // 降级方案
  return await handle.getFile();
}

/**
 * 请求存储权限（Android）
 * 
 * adapt.js 提供 window.__TAURI__.permission.checkAndRequestStorage()
 */
export async function requestStoragePermission(message?: string): Promise<boolean> {
  const win = window as any;
  
  if (win.__TAURI__?.permission?.checkAndRequestStorage) {
    return await win.__TAURI__.permission.checkAndRequestStorage(message);
  }
  
  // 非 Android 环境或旧版本 adapt.js
  return true;
}

/**
 * 检查是否在 adapt.js 环境
 */
export function isAdaptEnvironment(): boolean {
  const win = window as any;
  return !!(win.__TAURI__ && win.__TAURI__._ready);
}

/**
 * 等待 adapt.js 就绪
 */
export async function waitForAdapt(timeout = 5000): Promise<boolean> {
  const win = window as any;
  
  if (win.__TAURI__?._ready) {
    return true;
  }

  return new Promise((resolve) => {
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (win.__TAURI__?._ready) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 50);
  });
}
