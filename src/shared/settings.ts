import type { ExtensionSettings } from './types';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  siyuanBaseUrl: 'http://127.0.0.1:6806',
  siyuanToken: '',
  notebookId: '',
  parentPath: '/'
};

// Ensure a path starts with "/" and has no trailing slash (root "/").
export function normalizeParentPath(value: string): string {
  let p = value.trim().replace(/\\+/g, '/');
  if (!p) return '/';
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (!p.startsWith('/')) p = '/' + p;
  return p;
}

export function normalizeSettings(settings: ExtensionSettings): ExtensionSettings {
  return {
    siyuanBaseUrl: settings.siyuanBaseUrl.trim().replace(/\/+$/, ''),
    siyuanToken: settings.siyuanToken.trim(),
    notebookId: settings.notebookId.trim(),
    parentPath: normalizeParentPath(settings.parentPath)
  };
}

export function validateSettings(settings: ExtensionSettings): string[] {
  const normalized = normalizeSettings(settings);
  const errors: string[] = [];

  if (!normalized.siyuanBaseUrl) errors.push('缺少思源地址');
  if (!normalized.siyuanToken) errors.push('缺少 API Token');
  if (!normalized.notebookId) errors.push('缺少笔记本 ID');
  if (!normalized.parentPath) errors.push('缺少文件夹路径');

  try {
    const url = new URL(normalized.siyuanBaseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      errors.push('思源地址必须是 http 或 https');
    }
  } catch {
    errors.push('思源地址不是有效 URL');
  }

  return errors;
}

export function loadSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message ?? '读取设置失败'));
        return;
      }

      resolve(normalizeSettings(items as ExtensionSettings));
    });
  });
}

export function saveSettings(settings: ExtensionSettings): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(normalizeSettings(settings), () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message ?? '保存设置失败'));
        return;
      }

      resolve();
    });
  });
}
