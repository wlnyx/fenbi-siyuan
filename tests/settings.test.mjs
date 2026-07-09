import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSettings, normalizeParentPath, validateSettings } from '../dist/testable/settings.js';

test('normalizeSettings trims URL, token, notebook id and normalizes parent path', () => {
  assert.deepEqual(
    normalizeSettings({
      siyuanBaseUrl: ' http://127.0.0.1:6806/ ',
      siyuanToken: ' token ',
      notebookId: ' 20250410143546-z2v2wx9 ',
      parentPath: ' /粉笔错题/ '
    }),
    {
      siyuanBaseUrl: 'http://127.0.0.1:6806',
      siyuanToken: 'token',
      notebookId: '20250410143546-z2v2wx9',
      parentPath: '/粉笔错题'
    }
  );
});

test('normalizeParentPath coerces bare names and strips trailing slashes, root stays /', () => {
  assert.equal(normalizeParentPath(''), '/');
  assert.equal(normalizeParentPath('/'), '/');
  assert.equal(normalizeParentPath('粉笔错题'), '/粉笔错题');
  assert.equal(normalizeParentPath('/粉笔错题/'), '/粉笔错题');
});

test('validateSettings reports missing fields', () => {
  assert.deepEqual(validateSettings({
    siyuanBaseUrl: '',
    siyuanToken: '',
    notebookId: '',
    parentPath: ''
  }), ['缺少思源地址', '缺少 API Token', '缺少笔记本 ID', '思源地址不是有效 URL']);
});

test('validateSettings accepts a complete valid config', () => {
  assert.deepEqual(validateSettings({
    siyuanBaseUrl: 'http://127.0.0.1:6806',
    siyuanToken: 'token',
    notebookId: 'nb',
    parentPath: '/'
  }), []);
});
