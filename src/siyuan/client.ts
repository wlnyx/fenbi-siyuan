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

  const payload = (await response.json()) as SiyuanResponse<T>;
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

// /api/filetree/createDocWithMarkdown: notebook + parent folder path + markdown.
// The first "# Title" line of the markdown becomes the new document's name.
export async function createDocWithMarkdown(
  settings: ExtensionSettings,
  notebook: string,
  parentPath: string,
  markdown: string
): Promise<CreateDocResult> {
  const data = await postJson<string>(settings, '/api/filetree/createDocWithMarkdown', {
    notebook,
    path: parentPath,
    markdown
  });
  return { docId: data };
}
