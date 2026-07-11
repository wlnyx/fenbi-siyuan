import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatQuestionMarkdown,
  buildDocTitle,
  formatAnswerAnalysisHtml,
  formatTags
} from '../dist/testable/formatter.js';

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
  assert.ok(markdown.includes('### 选项'));
  assert.doesNotMatch(markdown, /<details/);
  assert.match(markdown, /题目指纹：fenbi:abc123def456/);
  assert.ok(!markdown.includes("> 标签："));  // tags promoted to document-level via setBlockAttrs
  assert.doesNotMatch(markdown, /^> 来源：/m);
  assert.doesNotMatch(markdown, /> 来源：粉笔/);
  assert.doesNotMatch(markdown, /错因|复习|背诵点|AI/);
});

test('formatAnswerAnalysisHtml builds one folded HTML block wrapped in a single <div>', () => {
  const html = formatAnswerAnalysisHtml({
    source: 'fenbi', url: '', urlKey: '', contentHash: 'abc123def456', title: '',
    subject: '政治理论', module: 'm', questionText: '', options: [],
    userAnswer: 'B', correctAnswer: 'A', imageUrls: [], keypoints: ['唯物论'],
    capturedAt: '2026-07-08',
    analysis: "A项正确，因为真理……\n\nB项错误，因为……\n\n故正确答案为A。"
  });
  assert.equal(html.split('\n')[0], '<div>');
  assert.ok(html.trim().endsWith('</div>'));
  assert.ok(html.includes('<details><summary>答案</summary>'));
  assert.ok(html.includes('<details><summary>解析</summary>'));
  assert.ok(html.includes('<p>我的答案：B</p>'));
  assert.ok(html.includes('<p>正确答案：A</p>'));
  assert.ok(html.includes('<strong>A项正确</strong>'));
  assert.ok(html.includes('<strong>B项错误</strong>'));
  assert.ok(html.includes('<p>故正确答案为A。</p>'));
  // Siyuan's DOM parser rejects empty lines inside an HTML block
  assert.doesNotMatch(html, /\n[ \t]*\n/);
});

test('document title combines subject, module, date and short hash', () => {
  const title = buildDocTitle({
    source: 'fenbi', url: '', urlKey: '', contentHash: 'abc123def456', title: '',
    subject: '政治理论', module: '新思想', questionText: '', options: [],
    imageUrls: [], keypoints: ['唯物论'], capturedAt: '2026-07-08'
  });
  assert.equal(title, '政治理论·新思想·' + '2026-07-08' + '·' + 'abc123de');
});

test('formatTags builds three-level #科目/模块/考点# strings for the doc tags attribute', () => {
  const tags = formatTags({
    source: 'fenbi', url: '', urlKey: '', contentHash: 'abc123def456', title: '',
    subject: '政治理论', module: '专项智能练习', questionText: '', options: [],
    imageUrls: [], keypoints: ['唯物论', '认识论'], capturedAt: '2026-07-08'
  });
  assert.equal(tags, '#政治理论/专项智能练习/唯物论# #政治理论/专项智能练习/认识论#');
});

test('analysis bolds each option marker and separates paragraphs', () => {
  const html = formatAnswerAnalysisHtml({
    source: 'fenbi', url: '', urlKey: '', contentHash: 'abc123456789', title: '',
    subject: '政治理论', module: 'm', questionText: 'q', options: [],
    userAnswer: 'B', correctAnswer: 'A',
    imageUrls: [], keypoints: [], capturedAt: '2026-07-08',
    analysis: "A项正确，因为真理……\n\nB项错误，从认识论角度看……\n\n故正确答案为A。"
  });
  assert.match(html, /<strong>A项正确<\/strong>/);
  assert.match(html, /<strong>B项错误<\/strong>/);
  // each option analysis is rendered as its own <p>
  assert.ok(html.includes('<p><strong>A项正确</strong>，因为真理……</p>'));
  assert.ok(html.includes('<p><strong>B项错误</strong>，从认识论角度看……</p>'));
});

test('formatTags falls back to single-level #科目# when no keypoints', () => {
  const tags = formatTags({
    source: 'fenbi', url: '', urlKey: '', contentHash: 'abc123456789', title: '',
    subject: '政治理论', module: '', questionText: 'q', options: [],
    imageUrls: [], keypoints: [], capturedAt: '2026-07-08'
  });
  assert.equal(tags, '#政治理论#');
});
test('escapeHtml defangs <, >, & in user-supplied answer/analysis text', () => {
  const html = formatAnswerAnalysisHtml({
    source: 'fenbi', url: '', urlKey: '', contentHash: 'abc123def456', title: '',
    subject: '政治理论', module: 'm', questionText: '', options: [],
    userAnswer: '<script>alert(1)</script>', correctAnswer: 'A & B',
    imageUrls: [], keypoints: [], capturedAt: '2026-07-08',
    analysis: "A项正确，<img onerror=alert(2)>，因为……"
  });
  assert.ok(html.includes("我的答案：&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(html.includes("正确答案：A &amp; B"));
  assert.ok(html.includes("&lt;img onerror=alert(2)&gt;"));
  // no raw injected tags survive escaping
  assert.doesNotMatch(html, /<script[\s>/]/);
  assert.doesNotMatch(html, /<img onerror=alert\(2\)>/);
  // the <strong> marker injected AFTER escaping survives intact
  assert.match(html, /<strong>A项正确<\/strong>/);
});
