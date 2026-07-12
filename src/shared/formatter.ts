import type { FenbiQuestion } from './types';

function fallback(value: string | undefined, defaultValue = '未填写'): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : defaultValue;
}

// Document name shown in the Siyuan doc tree.
// Pattern: 科目·模块·日期·短哈希 (empty segments omitted). Keypoints still
// drive the tag line (formatTags), not the doc name.
export function buildDocTitle(question: FenbiQuestion): string {
  const subject = question.subject?.trim();
  const module = question.module?.trim();
  const date = question.capturedAt;
  const shortHash = question.contentHash.slice(0, 8);

  const segments: string[] = [];
  if (subject) segments.push(subject);
  if (module) segments.push(module);
  segments.push(date, shortHash);

  return segments.join('·');
}

// Comma-separated plain tag paths written to the DOCUMENT tags attribute (set
// via /api/attr/setBlockAttrs in background/index.ts) so tags surface as
// document-level tags browsable in the tag tree, not embedded in the content.
// SiYuan splits the tags attribute on COMMAS into separate tag-tree entries;
// space-separated values collapse into one malformed "#a b#" tag. Missing
// middle levels are skipped: degrades to 科目/考点, 科目/模块, or 科目.
export function formatTags(question: FenbiQuestion): string {
  const subject = question.subject?.trim();
  const module = question.module?.trim();
  const keypoints = question.keypoints
    .map((kp) => kp.trim())
    .filter(Boolean);

  const prefix = [subject, module].filter(Boolean).join('/');
  // SiYuan's document tags attribute splits on COMMAS into separate tag-tree
  // entries (blocks.tag becomes "#path1# #path2#"). Space-separated values
  // produce a single malformed "#path1 path2#" entry, which caused the extra #.
  const tags: string[] = [];
  if (prefix && keypoints.length > 0) {
    for (const kp of keypoints) tags.push(`${prefix}/${kp}`);
  } else if (prefix) {
    tags.push(prefix);
  } else if (keypoints.length > 0) {
    for (const kp of keypoints) tags.push(kp);
  }
  return tags.join(', ');
}

function formatMetadata(question: FenbiQuestion): string[] {
  const lines = [`> 题目指纹：fenbi:${question.contentHash}`];
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

// Markdown body sent to createDocWithMd: metadata quote block + question + options.
// The collapsible answer+analysis is inserted afterwards as a proper SiYuan HTML
// block via /api/block/appendBlock (see background/index.ts), because embedding
// <details> inside Markdown is split by CommonMark blank-line HTML-block rules.
export function formatQuestionMarkdown(question: FenbiQuestion): string {
  const imageMarkdown = formatImages(question);

  const sections: string[] = [];
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

  // Collapse consecutive blank lines but keep single ones as paragraph breaks.
  const cleaned = sections.filter(
    (line, index, lines) => !(line === '' && lines[index - 1] === '')
  );
  return cleaned.join('\n').trim().concat('\n');
}

// Escape text that will live inside an HTML block. Markdown is NOT parsed inside
// a SiYuan <div> HTML block, so we render content as real HTML and must escape raw
// ampersands/angle brackets in user-supplied text. Must run BEFORE any literal
// HTML tags (e.g. <strong>) are injected, so they aren't double-escaped.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// The analysis blob comes in as paragraphs (parser already separates <p> blocks
// with a blank line). Bold the leading "X项正确/错误" marker of each option so they
// stand out instead of running together. Runs on the escaped paragraph, then
// inserts the <strong> tags (post-escape so they survive intact).
function formatAnalysisHtml(question: FenbiQuestion): string {
  const raw = question.analysis?.trim();
  if (!raw) return '<p>未解析到解析内容</p>';
  const paragraphs = raw
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) =>
      escapeHtml(para).replace(/^([A-H])项(正确|错误)/, '<strong>$1项$2</strong>')
    );
  return paragraphs.map((para) => `<p>${para}</p>`).join('\n');
}

function formatAnswersHtml(question: FenbiQuestion): string {
  return [
    `<p>我的答案：${escapeHtml(fallback(question.userAnswer))}</p>`,
    `<p>正确答案：${escapeHtml(fallback(question.correctAnswer))}</p>`
  ].join('\n');
}

// Build a single Siyuan HTML block wrapping the collapsed answer + analysis.
// Constraints from the Siyuan appendBlock(dom) API:
//   - one unique root <div> wrapping everything
//   - no empty lines inside (Siyuan's DOM parser rejects blank lines)
// <details> defaults to collapsed, so this yields "默认折叠" in the doc.
export function formatAnswerAnalysisHtml(question: FenbiQuestion): string {
  return [
    '<div>',
    '<details><summary>答案</summary>',
    formatAnswersHtml(question),
    '</details>',
    '<details><summary>解析</summary>',
    formatAnalysisHtml(question),
    '</details>',
    '</div>'
  ].join('\n');
}
