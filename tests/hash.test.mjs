import assert from 'node:assert/strict';
import test from 'node:test';
import { computeQuestionHash } from '../dist/testable/hash.js';

test('computeQuestionHash is stable across whitespace changes', async () => {
  const left = await computeQuestionHash({
    questionText: '  题干   文本 ',
    options: [{ label: 'A', text: '  选项 一 ' }],
    correctAnswer: 'A'
  });
  const right = await computeQuestionHash({
    questionText: '题干 文本',
    options: [{ label: 'A', text: '选项 一' }],
    correctAnswer: 'A'
  });

  assert.equal(left, right);
});
