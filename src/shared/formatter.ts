import type { FenbiQuestion } from './types';

function fallback(value: string | undefined, defaultValue = '未填写'): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : defaultValue;
}

function formatHeading(question: FenbiQuestion): string {
  const parts = [
    fallback(question.subject, '未分类'),
    fallback(question.module, '未分模块'),
    question.capturedAt
  ];
  return `## ${parts.join(' · ')}`;
}

function formatOptions(question: FenbiQuestion): string {
  if (question.options.length === 0) return '未解析到选项';
  return question.options
    .map((option) => `${option.label}. ${fallback(option.text)}`)
    .join('\n');
}

function formatImages(question: FenbiQuestion): string {
  if (question.imageUrls.length === 0) return '';
  return question.imageUrls
    .map((url, index) => `![题图 ${index + 1}](${url})`)
    .join('\n');
}

function formatTags(question: FenbiQuestion): string {
  const tags = question.tags
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean);
  if (tags.length === 0) return '';
  return tags.map((tag) => `#${tag}`).join(' ');
}

export function formatQuestionMarkdown(question: FenbiQuestion): string {
  const imageMarkdown = formatImages(question);
  const tags = formatTags(question);

  return [
    formatHeading(question),
    '',
    '> 来源：粉笔',
    `> 链接：${question.url}`,
    `> 规范链接：${question.urlKey}`,
    `> 题目指纹：fenbi:${question.contentHash}`,
    '',
    '### 题目',
    '',
    fallback(question.questionText),
    '',
    imageMarkdown,
    '',
    '### 选项',
    '',
    formatOptions(question),
    '',
    '### 答案',
    '',
    `- 我的答案：${fallback(question.userAnswer)}`,
    `- 正确答案：${fallback(question.correctAnswer)}`,
    '',
    '### 解析',
    '',
    fallback(question.analysis),
    '',
    tags
  ]
    .filter((line, index, lines) => !(line === '' && lines[index - 1] === ''))
    .join('\n')
    .trim()
    .concat('\n');
}
