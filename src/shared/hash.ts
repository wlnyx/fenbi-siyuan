import type { FenbiQuestion } from './types';

export function normalizeText(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function computeQuestionHash(
  question: Pick<FenbiQuestion, 'questionText' | 'options' | 'correctAnswer'>
): Promise<string> {
  const payload = [
    normalizeText(question.questionText),
    ...question.options.map((option) => `${option.label}:${normalizeText(option.text)}`),
    normalizeText(question.correctAnswer)
  ].join('\n');

  return sha256Hex(payload);
}
