import type { FenbiQuestion } from './types';

function fallback(value: string | undefined, defaultValue = '未填写'): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : defaultValue;
}

// Document name shown in the Siyuan doc tree.
// Pattern: 科目·考点·日期·短哈希 (empty segments omitted).
export function buildDocTitle(question: FenbiQuestion): string {
  const subject = question.subject?.trim();
  const keypoints = question.keypoints.filter((kp) => kp.trim());
  const keypointText = keypoints.length > 0 ? keypoints.join('/') : '';
  const date = question.capturedAt;
  const shortHash = question.contentHash.slice(0, 8);

  const segments: string[] = [];
  if (subject) segments.push(subject);
  if (keypointText) segments.push(keypointText);
  segments.push(date, shortHash);

  return segments.join('·');
}

function formatMetadata(question: FenbiQuestion): string[] {
  const lines = [
    '> 来源：粉笔',
    `> 链接：${question.url}`,
    `> 规范链接：${question.urlKey}`,
    `> 题目指纹：fenbi:${question.contentHash}`
  ];
  if (question.subject?.trim()) lines.push(`> 科目：${question.subject.trim()}`);
  if (question.module?.trim()) lines.push(`> 模块：${question.module.trim()}`);
  return lines;
}

function formatImages(question: FenbiQuestion): string {
  if (question.imageUrls.length === 0) return '';
  return question.imageUrls
    .map((url, index) => `![题图 ${index + 1}](${url})`)
    .join('\n');
}

function formatOptions(question: FenbiQuestion): string {
  if (question.options.length === 0) return '未解析到选项';
  return question.options
    .map((option) => `${option.label}. ${fallback(option.text)}`)
    .join('\n');
}

function formatAnswers(question: FenbiQuestion): string {
  return [
    `- 我的答案：${fallback(question.userAnswer)}`,
    `- 正确答案：${fallback(question.correctAnswer)}`
  ].join('\n');
}

// Split the analysis blob into paragraphs (parser already separates <p> blocks
// with a blank line) and bold the leading "X项正确/错误" marker of each option
// analysis so they stand out instead of running together.
function formatAnalysis(question: FenbiQuestion): string {
  const raw = question.analysis?.trim();
  if (!raw) return '未解析到解析内容';
  return raw
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => para.replace(/^([A-H])项(正确|错误)/, '**$1项$2**'))
    .join('\n\n');
}

// Siyuan native multi-level tag syntax: #科目/考点# nests 考点 under 科目.
function formatTags(question: FenbiQuestion): string {
  const subject = question.subject?.trim();
  const keypoints = question.keypoints
    .map((kp) => kp.trim())
    .filter(Boolean);
  const tags: string[] = [];
  if (subject && keypoints.length > 0) {
    for (const kp of keypoints) tags.push(`#${subject}/${kp}#`);
  } else if (subject) {
    tags.push(`#${subject}#`);
  } else if (keypoints.length > 0) {
    for (const kp of keypoints) tags.push(`#${kp}#`);
  }
  return tags.join(' ');
}

export function formatQuestionMarkdown(question: FenbiQuestion): string {
  const imageMarkdown = formatImages(question);
  const tags = formatTags(question);

  const sections: string[] = [];
  sections.push(`# ${buildDocTitle(question)}`);
  sections.push('');
  sections.push(formatMetadata(question).join('\n'));
  sections.push('');
  sections.push('### 题目');
  sections.push('');
  sections.push(fallback(question.questionText));
  if (imageMarkdown) {
    sections.push('');
    sections.push(imageMarkdown);
  }
  sections.push('');
  sections.push('### 选项');
  sections.push('');
  sections.push(formatOptions(question));
  sections.push('');
  sections.push('### 答案');
  sections.push('');
  sections.push(formatAnswers(question));
  sections.push('');
  sections.push('### 解析');
  sections.push('');
  sections.push(formatAnalysis(question));
  if (tags) {
    sections.push('');
    sections.push(tags);
  }

  // Collapse consecutive blank lines but keep single ones as paragraph breaks.
  const cleaned = sections.filter(
    (line, index, lines) => !(line === '' && lines[index - 1] === '')
  );
  return cleaned.join('\n').trim().concat('\n');
}
