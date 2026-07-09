import { loadSettings, saveSettings, validateSettings } from '../shared/settings';
import type { BackgroundResponse, ExtensionSettings } from '../shared/types';

function input(id: keyof ExtensionSettings): HTMLInputElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLInputElement)) throw new Error(`缺少输入框 ${id}`);
  return element;
}

function status(message: string): void {
  const element = document.getElementById('status');
  if (element) element.textContent = message;
}

function formSettings(): ExtensionSettings {
  return {
    siyuanBaseUrl: input('siyuanBaseUrl').value,
    siyuanToken: input('siyuanToken').value,
    targetBlockId: input('targetBlockId').value
  };
}

function sendMessage<TResponse>(message: unknown): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage<TResponse>(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message ?? '扩展后台无响应'));
        return;
      }

      resolve(response);
    });
  });
}

async function loadForm(): Promise<void> {
  const settings = await loadSettings();
  input('siyuanBaseUrl').value = settings.siyuanBaseUrl;
  input('siyuanToken').value = settings.siyuanToken;
  input('targetBlockId').value = settings.targetBlockId;
}

document.getElementById('settings-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const settings = formSettings();
    const errors = validateSettings(settings);
    if (errors.length > 0) {
      status(errors.join('，'));
      return;
    }

    await saveSettings(settings);
    status('已保存');
  } catch (error) {
    status(error instanceof Error ? error.message : '保存失败');
  }
});

document.getElementById('test-connection')?.addEventListener('click', async () => {
  try {
    const settings = formSettings();
    const errors = validateSettings(settings);
    if (errors.length > 0) {
      status(errors.join('，'));
      return;
    }

    status('正在测试...');
    const response = await sendMessage<BackgroundResponse>({
      type: 'TEST_CONNECTION',
      settings
    });

    status(response.ok ? '连接成功' : response.message);
  } catch (error) {
    status(error instanceof Error ? error.message : '连接失败');
  }
});

void loadForm().catch((error) => {
  status(error instanceof Error ? error.message : '加载设置失败');
});
