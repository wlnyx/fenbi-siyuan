import type { ExtensionSettings } from '../shared/types';

export class SiyuanClientError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

type SiyuanResponse<T> = {
  code: number;
  msg: string;
  data: T;
};

export type NotebookInfo = {
  id: string;
  name: string;
};

function endpoint(settings: ExtensionSettings, path: string): string {
  return `${settings.siyuanBaseUrl.replace(/\/+$/, '')}${path}`;
}

async function postJson<T>(
  settings: ExtensionSettings,
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(endpoint(settings, path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${settings.siyuanToken}`
      },
      body: JSON.stringify(body)
    });
  } catch {
    throw new SiyuanClientError('SIYUAN_UNREACHABLE', '无法连接思源，请确认思源已启动');
  }

  if (!response.ok) {
    throw new SiyuanClientError(
      'SIYUAN_HTTP_ERROR',
      `思源 API 返回 HTTP ${response.status}`
    );
  }

  const text = await response.text();
  if (!text) {
    throw new SiyuanClientError(
      'SIYUAN_EMPTY_RESPONSE',
      '思源返回空响应，请检查 API Token 是否正确、思源版本是否支持该接口'
    );
  }

  let payload: SiyuanResponse<T>;
  try {
    payload = JSON.parse(text) as SiyuanResponse<T>;
  } catch {
    throw new SiyuanClientError(
      'SIYUAN_INVALID_RESPONSE',
      '思源返回非 JSON 响应，可能是未授权或接口不存在：' + text.slice(0, 200)
    );
  }

  if (payload.code !== 0) {
    throw new SiyuanClientError(
      'SIYUAN_API_ERROR',
      payload.msg || `思源 API 返回错误码 ${payload.code}`
    );
  }

  return payload.data;
}

export async function testConnection(settings: ExtensionSettings): Promise<void> {
  await postJson<number>(settings, '/api/system/currentTime', {});
}

export type ListNotebooksResult = { notebooks: NotebookInfo[] };

export async function listNotebooks(settings: ExtensionSettings): Promise<NotebookInfo[]> {
  interface RawNotebook {
    id: string;
    name: string;
    closed?: boolean;
  }
  const data = await postJson<{ notebooks: RawNotebook[] }>(
    settings,
    '/api/notebook/lsNotebooks',
    {}
  );
  return (data.notebooks ?? [])
    .filter((nb) => !nb.closed)
    .map((nb) => ({ id: nb.id, name: nb.name }));
}

export async function querySql<T extends Record<string, unknown>>(
  settings: ExtensionSettings,
  stmt: string
): Promise<T[]> {
  const data = await postJson<T[]>(settings, '/api/query/sql', { stmt });
  return data ?? [];
}

export type CreateDocResult = { docId: string };

// /api/filetree/createDocWithMd: notebook + full document path + markdown.
// path must be the complete document path (parent + title, e.g. "/folder/title"),
// matching the database hpath field. Root is "/title".
export async function createDocWithMd(
  settings: ExtensionSettings,
  notebook: string,
  docPath: string,
  markdown: string
): Promise<CreateDocResult> {
  const data = await postJson<string>(settings, '/api/filetree/createDocWithMd', {
    notebook,
    path: docPath,
    markdown
  });
  return { docId: data };
}


// Append an HTML block as the last child of a document so SiYuan renders a
// native <details> widget at the end (after the options). Per the Siyuan
// appendBlock API: data must be wrapped in a single root element with no empty
// lines inside. appendBlock (unlike insertBlock with only parentID, which
// prepends) guarantees the block lands at the bottom of the parent.
export async function appendHtmlBlock(
  settings: ExtensionSettings,
  parentID: string,
  html: string
): Promise<void> {
  await postJson<unknown>(settings, '/api/block/appendBlock', {
    dataType: 'dom',
    data: html,
    parentID
  });
}

// Set document-level tags on a block (typically the document root) by writing the
// SiYuan-native `tags` attribute via /api/attr/setBlockAttrs. The value uses the
// inline `#path#` form, space-separated, exactly as produced by formatTags.
// SiYuan persists this to the attributes table and the tag tree reads it from
// there, so the tags become browsable document tags rather than inline content.
export async function setBlockTags(
  settings: ExtensionSettings,
  blockId: string,
  tags: string
): Promise<void> {
  if (!tags.trim()) return;
  await postJson<unknown>(settings, '/api/attr/setBlockAttrs', {
    id: blockId,
    attrs: { tags }
  });
}

