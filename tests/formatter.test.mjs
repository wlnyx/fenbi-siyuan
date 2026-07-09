import assert from 'node:assert/strict';
import test from 'node:test';
import { formatQuestionMarkdown } from '../dist/testable/formatter.js';

test('formatQuestionMarkdown emits core question card without extra study sections', () => {
  const markdown = formatQuestionMarkdown({
    source: 'fenbi',
    url: 'https://www.fenbi.com/question/1',
    urlKey: 'https://www.fenbi.com/question/1',
    contentHash: 'abc123',
    title: 'test',
    subject: '常识',
    module: '政治理论',
    questionText: '题干',
    options: [{ label: 'A', text: '选项' }],
    userAnswer: 'B',
    correctAnswer: 'A',
    analysis: '解析',
    imageUrls: ['https://img.example/a.png'],
    tags: ['粉笔', '常识'],
    capturedAt: '2026-07-08'
  });

  assert.match(markdown, /### 题目/);
  assert.match(markdown, /### 答案/);
  assert.match(markdown, /### 解析/);
  assert.match(markdown, /题目指纹：fenbi:abc123/);
  assert.doesNotMatch(markdown, /错因|复习|背诵点|AI/);
});
