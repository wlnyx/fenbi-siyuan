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

export type AppendBlockResult = {
  blockId?: string;
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

export async function getBlockMarkdown(
  settings: ExtensionSettings,
  targetBlockId: string
): Promise<string> {
  const data = await postJson<{ kramdown: string }>(settings, '/api/block/getBlockKramdown', {
    id: targetBlockId
  });

  return data.kramdown;
}

export async function appendMarkdown(
  settings: ExtensionSettings,
  targetBlockId: string,
  markdown: string
): Promise<AppendBlockResult> {
  const data = await postJson<Array<{ doOperations?: Array<{ id?: string }> }>>(
    settings,
    '/api/block/appendBlock',
    {
      dataType: 'markdown',
      data: markdown,
      parentID: targetBlockId
    }
  );

  return {
    blockId: data[0]?.doOperations?.[0]?.id
  };
}
