import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeFenbiUrl } from '../dist/testable/url.js';

test('normalizeFenbiUrl removes volatile params and sorts stable params', () => {
  assert.equal(
    normalizeFenbiUrl('https://www.fenbi.com/a?z=2&utm_source=x&session=abc&a=1#part'),
    'https://www.fenbi.com/a?a=1&z=2'
  );
});
