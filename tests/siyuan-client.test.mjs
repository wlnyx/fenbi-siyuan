import assert from 'node:assert/strict';
import test from 'node:test';
import { appendMarkdown, getBlockMarkdown, testConnection } from '../dist/testable/client.js';

const settings = {
  siyuanBaseUrl: 'http://127.0.0.1:6806',
  siyuanToken: 'token',
  targetBlockId: 'target'
};

test('Siyuan client sends token header and parses block markdown', async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return Response.json({ code: 0, msg: '', data: { kramdown: 'content' } });
  };

  const markdown = await getBlockMarkdown(settings, 'target');
  assert.equal(markdown, 'content');
  assert.equal(calls[0].url, 'http://127.0.0.1:6806/api/block/getBlockKramdown');
  assert.equal(calls[0].init.headers.Authorization, 'Token token');
});

test('Siyuan client uses appendBlock for markdown append', async () => {
  globalThis.fetch = async () =>
    Response.json({ code: 0, msg: '', data: [{ doOperations: [{ id: 'new-block' }] }] });

  const result = await appendMarkdown(settings, 'target', 'markdown');
  assert.equal(result.blockId, 'new-block');
});

test('Siyuan client testConnection calls currentTime endpoint', async () => {
  let calledUrl = '';
  globalThis.fetch = async (url) => {
    calledUrl = url;
    return Response.json({ code: 0, msg: '', data: Date.now() });
  };

  await testConnection(settings);
  assert.equal(calledUrl, 'http://127.0.0.1:6806/api/system/currentTime');
});
