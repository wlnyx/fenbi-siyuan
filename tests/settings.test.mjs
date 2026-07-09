import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSettings, validateSettings } from '../dist/testable/settings.js';

test('normalizeSettings trims URL, token, and target block id', () => {
  assert.deepEqual(
    normalizeSettings({
      siyuanBaseUrl: ' http://127.0.0.1:6806/ ',
      siyuanToken: ' token ',
      targetBlockId: ' block '
    }),
    {
      siyuanBaseUrl: 'http://127.0.0.1:6806',
      siyuanToken: 'token',
      targetBlockId: 'block'
    }
  );
});

test('validateSettings reports missing fields', () => {
  assert.deepEqual(validateSettings({
    siyuanBaseUrl: '',
    siyuanToken: '',
    targetBlockId: ''
  }), ['缺少思源地址', '缺少 API Token', '缺少目标文档块 ID', '思源地址不是有效 URL']);
});
