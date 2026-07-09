import { formatQuestionMarkdown } from '../shared/formatter';
import { loadSettings, normalizeSettings, validateSettings } from '../shared/settings';
import type {
  BackgroundRequest,
  BackgroundResponse,
  ExtensionSettings,
  FenbiQuestion
} from '../shared/types';
import {
  createDocWithMarkdown,
  listNotebooks,
  querySql,
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

// Detect whether this question was already collected into the configured notebook.
// Search block content for the fingerprint token "fenbi:<contentHash>".
async function hasDuplicate(
  settings: ExtensionSettings,
  question: FenbiQuestion
): Promise<boolean> {
  const fingerprint = `fenbi:${question.contentHash}`;
  // Escape single quotes in the notebook id for the SQL string literal.
  const notebook = settings.notebookId.replace(/'/g, "''");
  const stmt = `SELECT root_id FROM blocks WHERE box = '${notebook}' AND content LIKE '%${fingerprint}%' LIMIT 1`;
  type Row = { root_id: string };
  const rows = await querySql<Row>(settings, stmt);
  return rows.length > 0;
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
    return errorResponse('INVALID_SETTINGS', validationErrors.join('；'));
  }

  await testConnection(settings);

  const notebooks = await listNotebooks(settings);
  if (!notebooks.some((nb) => nb.id === settings.notebookId)) {
    return errorResponse(
      'INVALID_SETTINGS',
      '笔记本 ID 不存在，请检查设置。当前可选笔记本：' +
        notebooks.map((nb) => `${nb.name}(${nb.id})`).join('、')
    );
  }

  return { ok: true, status: 'connected' };
}

async function handleSaveQuestion(question: FenbiQuestion): Promise<BackgroundResponse> {
  const settings = await resolveSettings();
  const validationErrors = validateSettings(settings);
  if (validationErrors.length > 0) {
    return errorResponse('INVALID_SETTINGS', validationErrors.join('；'));
  }

  if (await hasDuplicate(settings, question)) {
    return { ok: true, status: 'duplicate' };
  }

  const markdown = formatQuestionMarkdown(question);
  const result = await createDocWithMarkdown(
    settings,
    settings.notebookId,
    settings.parentPath,
    markdown
  );
  return { ok: true, status: 'saved', blockId: result.docId };
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
