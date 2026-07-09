import { formatQuestionMarkdown } from '../shared/formatter';
import { loadSettings, normalizeSettings, validateSettings } from '../shared/settings';
import type {
  BackgroundRequest,
  BackgroundResponse,
  ExtensionSettings,
  FenbiQuestion
} from '../shared/types';
import {
  appendMarkdown,
  getBlockMarkdown,
  SiyuanClientError,
  testConnection
} from '../siyuan/client';

function errorResponse(errorCode: string, message: string): BackgroundResponse {
  return { ok: false, errorCode, message };
}

function toErrorResponse(error: unknown): BackgroundResponse {
  if (error instanceof SiyuanClientError) {
    return errorResponse(error.code, error.message);
  }

  if (error instanceof Error) {
    return errorResponse('UNKNOWN_ERROR', error.message);
  }

  return errorResponse('UNKNOWN_ERROR', '未知错误');
}

function hasDuplicate(markdown: string, question: FenbiQuestion): boolean {
  return (
    markdown.includes(`fenbi:${question.contentHash}`) ||
    markdown.includes(question.urlKey)
  );
}

async function resolveSettings(override?: ExtensionSettings): Promise<ExtensionSettings> {
  return normalizeSettings(override ?? (await loadSettings()));
}

async function handleTestConnection(
  settingsOverride?: ExtensionSettings
): Promise<BackgroundResponse> {
  const settings = await resolveSettings(settingsOverride);
  const validationErrors = validateSettings(settings);
  if (validationErrors.length > 0) {
    return errorResponse('INVALID_SETTINGS', validationErrors.join('，'));
  }

  await testConnection(settings);
  await getBlockMarkdown(settings, settings.targetBlockId);
  return { ok: true, status: 'connected' };
}

async function handleSaveQuestion(question: FenbiQuestion): Promise<BackgroundResponse> {
  const settings = await resolveSettings();
  const validationErrors = validateSettings(settings);
  if (validationErrors.length > 0) {
    return errorResponse('INVALID_SETTINGS', validationErrors.join('，'));
  }

  const existingMarkdown = await getBlockMarkdown(settings, settings.targetBlockId);
  if (hasDuplicate(existingMarkdown, question)) {
    return { ok: true, status: 'duplicate' };
  }

  const markdown = formatQuestionMarkdown(question);
  const result = await appendMarkdown(settings, settings.targetBlockId, markdown);
  return { ok: true, status: 'saved', blockId: result.blockId };
}

async function handleMessage(message: BackgroundRequest): Promise<BackgroundResponse> {
  switch (message.type) {
    case 'TEST_CONNECTION':
      return handleTestConnection(message.settings);
    case 'SAVE_QUESTION':
      return handleSaveQuestion(message.question);
    default:
      return errorResponse('UNKNOWN_MESSAGE', '未知后台消息');
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void handleMessage(message as BackgroundRequest)
    .then(sendResponse)
    .catch((error) => sendResponse(toErrorResponse(error)));

  return true;
});
