import { computeQuestionHash } from '../shared/hash';
import type { FenbiQuestion } from '../shared/types';
import { normalizeFenbiUrl } from '../shared/url';

function visibleText(el: Element | null | undefined): string {
  if (!el) return '';
  return (el.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function visibleHTML(el: Element | null | undefined): string {
  if (!el) return '';
  return (el.innerHTML ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Resolve the <app-ti> question element from the given container.
function findQuestionNode(container: HTMLElement): HTMLElement {
  const appTi = container.querySelector('app-ti[data-question-key]');
  if (appTi) return appTi as HTMLElement;
  return container;
}

function extractQuestionText(root: HTMLElement): string {
  // First <app-format-html> inside <app-question-choice> holds the question stem
  const questionChoice = root.querySelector('app-question-choice');
  if (questionChoice) {
    const formatHtml = questionChoice.querySelector('app-format-html');
    if (formatHtml) {
      const text = visibleHTML(formatHtml);
      if (text) return text;
    }
  }
  return visibleText(root.querySelector('.ti-content')) || root.innerText.trim();
}

type RawOption = { label: string; text: string; isCorrect: boolean; isUserChoice: boolean };

function extractOptions(root: HTMLElement): RawOption[] {
  const result: RawOption[] = [];
  const radios = root.querySelectorAll('li.choice-radio');
  for (const li of Array.from(radios)) {
    const labelEl = li.querySelector('.input-radio');
    const textEl = li.querySelector('.input-text');
    const label = visibleText(labelEl).replace(/[^A-H]/g, '');
    const text = visibleText(textEl);
    if (!label) continue;

    const classes = (labelEl?.className ?? '') + ' ' + (li.className ?? '');
    const isCorrect = /\bcorrect(Lost|Answer|)?\b/i.test(classes) ||
                      labelEl?.classList.contains('correctLost') === true;
    const isUserChoice = /\bwrong\b|\bcorrect\b|\bselected\b/i.test(classes) &&
                         !labelEl?.classList.contains('correctLost');
    result.push({ label, text, isCorrect, isUserChoice });
  }
  return result;
}

function extractCorrectAnswer(root: HTMLElement): string | undefined {
  const el = root.querySelector('.correct-answer');
  const t = visibleText(el);
  return t || undefined;
}

function extractUserAnswer(root: HTMLElement): string | undefined {
  const el = root.querySelector('.your-answer');
  const t = visibleText(el);
  return t || undefined;
}

// Extract the analysis as multiple paragraphs. Fenbi renders each option's
// analysis (e.g. "A项正确..." / "B项错误...") as a separate <p>; the summary
// line ("故正确答案为A。") is also its own <p>. Keep paragraphs separated so the
// formatter can bold the option markers and space them out.
function extractAnalysis(root: HTMLElement): string | undefined {
  const section = root.querySelector('[id^="section-solution-"]');
  if (section) {
    const content = section.querySelector('.content') ?? section;
    const paragraphs = Array.from(content.querySelectorAll('p'))
      .map((p) => visibleText(p))
      .filter(Boolean);
    if (paragraphs.length > 0) {
      return paragraphs.join('\n\n');
    }
    // Fallback: no <p> tags, use the whole section text.
    const text = visibleHTML(content);
    if (text) return text;
  }
  return undefined;
}

function extractSource(root: HTMLElement): string | undefined {
  const section = root.querySelector('[id^="section-source-"]');
  if (section) {
    const content = section.querySelector('.content');
    const text = visibleText(content ?? section);
    return text || undefined;
  }
  return undefined;
}

function extractKeypoints(root: HTMLElement): string[] {
  const result: string[] = [];
  const items = root.querySelectorAll('.solution-keypoint-item-name');
  for (const item of Array.from(items)) {
    const t = visibleText(item);
    if (t) result.push(t);
  }
  return result;
}

function extractQuestionType(root: HTMLElement): string | undefined {
  const el = root.querySelector('.title-type-name');
  const t = visibleText(el);
  return t || undefined;
}

function collectImageUrls(root: HTMLElement): string[] {
  const urls = Array.from(root.querySelectorAll<HTMLImageElement>('img'))
    .map((image) => image.currentSrc || image.src)
    .filter((src) => Boolean(src))
    .map((src) => {
      try { return new URL(src, location.href).toString(); }
      catch { return src; }
    });
  return [...new Set(urls)];
}

function extractSubjectAndModule(documentRef: Document): Pick<FenbiQuestion, 'subject' | 'module'> {
  const titleParts = documentRef.title
    .split(/[-_|\u3010\u3011\/:]/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    subject: titleParts[1] ?? titleParts[0],
    module: titleParts[2]
  };
}

export async function parseFenbiQuestion(
  documentRef: Document,
  rootElement?: HTMLElement
): Promise<FenbiQuestion> {
  const container = rootElement ?? documentRef.body;
  const root = findQuestionNode(container);

  const questionText = extractQuestionText(root);
  const rawOptions = extractOptions(root);
  const options = rawOptions.map((o) => ({ label: o.label, text: o.text }));

  const correctAnswer = extractCorrectAnswer(root);
  const userAnswer = extractUserAnswer(root);
  const analysis = extractAnalysis(root);
  const keypoints = extractKeypoints(root);
  const { subject, module: mod } = extractSubjectAndModule(documentRef);

  const url = location.href;
  const urlKey = normalizeFenbiUrl(url);
  const contentHash = await computeQuestionHash({ questionText, options, correctAnswer });

  return {
    source: 'fenbi',
    url,
    urlKey,
    contentHash,
    title: documentRef.title || '粉笔题目',
    subject,
    module: mod,
    questionText,
    options,
    userAnswer,
    correctAnswer,
    analysis,
    imageUrls: collectImageUrls(root),
    keypoints,
    capturedAt: new Date().toISOString().slice(0, 10)
  };
}
