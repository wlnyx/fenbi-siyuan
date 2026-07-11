import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendHtmlBlock,
  createDocWithMd,
  listNotebooks,
  querySql,
  setBlockTags,
  testConnection
} from '../dist/testable/client.js';

const settings = {
  siyuanBaseUrl: 'http://127.0.0.1:6806',
  siyuanToken: 'token',
  notebookId: '20250410143546-z2v2wx9',
  parentPath: '/'
};

test('testConnection calls currentTime endpoint with token header', async () => {
  let calledUrl = '';
  let auth = '';
  globalThis.fetch = async (url, init) => {
    calledUrl = url;
    auth = init.headers.Authorization;
    return Response.json({ code: 0, msg: '', data: 1700000000000 });
  };
  await testConnection(settings);
  assert.equal(calledUrl, 'http://127.0.0.1:6806/api/system/currentTime');
  assert.equal(auth, 'Token token');
});

test('listNotebooks returns open notebooks with id and name', async () => {
  globalThis.fetch = async () =>
    Response.json({ code: 0, msg: '', data: { notebooks: [
      { id: 'nb-open', name: '政治理论', closed: false },
      { id: 'nb-closed', name: '旧笔记本', closed: true }
    ]}});
  const notebooks = await listNotebooks(settings);
  assert.deepEqual(notebooks, [{ id: 'nb-open', name: '政治理论' }]);
});

test('querySql sends the statement and returns row array', async () => {
  let body = '';
  globalThis.fetch = async (_url, init) => {
    body = init.body;
    return Response.json({ code: 0, msg: '', data: [{ root_id: 'doc-1' }] });
  };
  const rows = await querySql(settings, "SELECT root_id FROM blocks WHERE box = 'nb'");
  assert.equal(JSON.parse(body).stmt, "SELECT root_id FROM blocks WHERE box = 'nb'");
  assert.deepEqual(rows, [{ root_id: 'doc-1' }]);
});

test('createDocWithMd posts notebook/docPath/markdown and returns docId', async () => {
  let sentBody = {};
  let calledUrl = '';
  globalThis.fetch = async (url, init) => {
    calledUrl = url;
    sentBody = JSON.parse(init.body);
    return Response.json({ code: 0, msg: '', data: '20250709172412-newdoc' });
  };
  const result = await createDocWithMd(settings, settings.notebookId, '/folder/doc-name', "# 标题\n\n内容");
  assert.equal(calledUrl, 'http://127.0.0.1:6806/api/filetree/createDocWithMd');
  assert.equal(sentBody.notebook, settings.notebookId);
  assert.equal(sentBody.path, '/folder/doc-name');
  assert.equal(sentBody.markdown, "# 标题\n\n内容");
  assert.equal(result.docId, '20250709172412-newdoc');
});


test('appendHtmlBlock posts dom data to appendBlock with parentID', async () => {
  let sentBody = {};
  let calledUrl = '';
  globalThis.fetch = async (url, init) => {
    calledUrl = url;
    sentBody = JSON.parse(init.body);
    return Response.json({ code: 0, msg: '', data: null });
  };
  const html = '<div>\n<details><summary>x</summary>\n</details>\n</div>';
  await appendHtmlBlock(settings, '20250709172412-newdoc', html);
  assert.equal(calledUrl, 'http://127.0.0.1:6806/api/block/appendBlock');
  assert.equal(sentBody.dataType, 'dom');
  assert.equal(sentBody.data, html);
  assert.equal(sentBody.parentID, '20250709172412-newdoc');
});

test('setBlockTags posts id/attrs/tags to /api/attr/setBlockAttrs', async () => {
  let sentBody = {};
  let calledUrl = '';
  globalThis.fetch = async (url, init) => {
    calledUrl = url;
    sentBody = JSON.parse(init.body);
    return Response.json({ code: 0, msg: '', data: null });
  };
  const tags = '#政治理论/专项智能练习/唯物论# #政治理论/专项智能练习/认识论#';
  await setBlockTags(settings, '20250709172412-newdoc', tags);
  assert.equal(calledUrl, 'http://127.0.0.1:6806/api/attr/setBlockAttrs');
  assert.equal(sentBody.id, '20250709172412-newdoc');
  assert.equal(sentBody.attrs.tags, tags);
});

test('setBlockTags skips the API call when tags is empty', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return Response.json({ code: 0, msg: '', data: null }); };
  await setBlockTags(settings, 'doc-id', '   ');
  assert.equal(called, false);
});
