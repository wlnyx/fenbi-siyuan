import assert from 'node:assert/strict';
import test from 'node:test';
import { formatQuestionMarkdown, buildDocTitle } from '../dist/testable/formatter.js';

test('formatQuestionMarkdown emits core question card without extra study sections', () => {
  const markdown = formatQuestionMarkdown({
    source: 'fenbi',
    url: 'https://www.fenbi.com/question/1',
    urlKey: 'https://www.fenbi.com/question/1',
    contentHash: 'abc123def456',
    title: 'test',
    subject: '政治理论',
    module: '专项智能练习',
    questionText: '题干',
    options: [{ label: 'A', text: '选项' }],
    userAnswer: 'B',
    correctAnswer: 'A',
    analysis: "A项正确，因为……\n\nB项错误，因为……\n\n故正确答案为A。",
    imageUrls: ['https://img.example/a.png'],
    keypoints: ['唯物论'],
    capturedAt: '2026-07-08'
  });

  assert.match(markdown, /### 题目/);
  assert.match(markdown, /### 答案/);
  assert.match(markdown, /### 解析/);
  assert.match(markdown, /题目指纹：fenbi:abc123def456/);
  assert.doesNotMatch(markdown, /错因|复习|背诵点|AI/);
});

test('document title combines subject, keypoint, date and short hash', () => {
  const title = buildDocTitle({
    source: 'fenbi', url: '', urlKey: '', contentHash: 'abc123def456', title: '',
    subject: '政治理论', module: 'm', questionText: '', options: [],
    imageUrls: [], keypoints: ['唯物论'], capturedAt: '2026-07-08'
  });
  assert.equal(title, '政治理论·唯物论·' + '2026-07-08' + '·' + 'abc123de');
});

test('tags use Siyuan multi-level #科目/考点# syntax', () => {
  const markdown = formatQuestionMarkdown({
    source: 'fenbi', url: '', urlKey: '', contentHash: 'abc123def456', title: '',
    subject: '政治理论', module: 'm', questionText: '', options: [],
    imageUrls: [], keypoints: ['唯物论', '认识论'], capturedAt: '2026-07-08'
  });
  assert.ok(markdown.includes('#' + "政治理论/唯物论" + '#'));
  assert.ok(markdown.includes('#' + "政治理论/认识论" + '#'));
});

test('analysis bolds each option marker and separates paragraphs', () => {
  const markdown = formatQuestionMarkdown({
    source: 'fenbi', url: '', urlKey: '', contentHash: 'abc123456789', title: '',
    subject: '政治理论', module: 'm', questionText: 'q', options: [],
    imageUrls: [], keypoints: [], capturedAt: '2026-07-08',
    analysis: "A项正确，因为真理……\n\nB项错误，从认识论角度看……\n\n故正确答案为A。"
  });
  assert.match(markdown, /\*\*A项正确\*\*/);
  assert.match(markdown, /\*\*B项错误\*\*/);
  assert.match(markdown, /·/);
});

test('tags fall back to single-level #科目# when no keypoints', () => {
  const markdown = formatQuestionMarkdown({
    source: 'fenbi', url: '', urlKey: '', contentHash: 'abc123456789', title: '',
    subject: '政治理论', module: '', questionText: 'q', options: [],
    imageUrls: [], keypoints: [], capturedAt: '2026-07-08'
  });
  assert.match(markdown, /#政治理论#/);
  assert.ok(!markdown.includes('#' + "政治理论/"));
});
