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


// Insert an HTML block as real DOM so SiYuan renders a native <details> widget.
// Per the Siyuan insertBlock API: data must be wrapped in a single root element
// with no empty lines inside. previousID pins insertion after that block.
export async function insertHtmlBlock(
  settings: ExtensionSettings,
  html: string,
  anchor: { previousID: string } | { parentID: string }
): Promise<void> {
  const body: Record<string, unknown> = { dataType: 'dom', data: html };
  if ('previousID' in anchor) body.previousID = anchor.previousID;
  else body.parentID = (anchor as { parentID: string }).parentID;
  await postJson<unknown>(settings, '/api/block/insertBlock', body);
}

// Resolve the last direct child block of a document so we can append after it.
// Best-effort: returns undefined if the query yields nothing or errors out.
export async function getLastChildBlockId(
  settings: ExtensionSettings,
  docId: string
): Promise<string | undefined> {
  try {
    const escaped = docId.replace(/'/g, "''");
    const stmt = `SELECT id FROM blocks WHERE root_id='${escaped}' AND parent_id='${escaped}' ORDER BY sort DESC LIMIT 1`;
    type Row = { id: string };
    const rows = await querySql<Row>(settings, stmt);
    return rows[0]?.id;
  } catch {
    return undefined;
  }
}
