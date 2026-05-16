/**
 * Heuristic viral-content scorer — runs 100% in-browser, no LLM API needed.
 * Combines lexical signals (power words, numbers, questions, emotion) and
 * pacing features to score each segment 0..1 for "viral potential".
 *
 * For better results you can later plug in a small local LLM via Ollama
 * (see lib/ai/llm-local.ts placeholder).
 */

import type { TranscriptSegment, TranscriptWord } from '@/types/database';

const POWER_WORDS_DE = [
  'geheim', 'krass', 'verrückt', 'unglaublich', 'schock', 'wahrheit',
  'niemand', 'niemals', 'immer', 'beste', 'schlechteste', 'erste', 'letzte',
  'fehler', 'lüge', 'trick', 'hack', 'geld', 'erfolg', 'scheiße',
  'wow', 'boom', 'plötzlich', 'überraschung', 'gewinn', 'verlust',
];

const POWER_WORDS_EN = [
  'secret', 'crazy', 'insane', 'shocking', 'truth', 'never', 'always',
  'best', 'worst', 'first', 'last', 'mistake', 'lie', 'trick', 'hack',
  'money', 'success', 'wow', 'boom', 'suddenly', 'surprise',
];

const POWER_WORDS = new Set(
  [...POWER_WORDS_DE, ...POWER_WORDS_EN].map((w) => w.toLowerCase())
);

const EMOTION_MARKERS = [
  /[!?]/g,                  // exclamation/question
  /\b(ich|wir|du|ihr|i|we|you)\b/i, // personal address
  /\b\d+([.,]\d+)?\s*(€|\$|%|euro|dollar)?/i, // numbers
];

export interface ViralFeatures {
  score: number;          // 0..1
  hookCandidate: boolean; // suitable as opening line
  highlights: string[];   // words to emphasize in captions
}

export function scoreSegment(seg: TranscriptSegment): ViralFeatures {
  const text = seg.text.toLowerCase();
  const words = text.split(/\s+/);

  let score = 0;
  const highlights: string[] = [];

  // Power-word hits
  for (const raw of words) {
    const clean = raw.replace(/[.,!?]/g, '');
    if (POWER_WORDS.has(clean)) {
      score += 0.15;
      highlights.push(clean);
    }
  }

  // Emotion markers
  for (const re of EMOTION_MARKERS) {
    if (re.test(seg.text)) score += 0.08;
  }

  // Question = curiosity loop
  if (/[?]$/.test(seg.text.trim())) score += 0.15;

  // Number-containing segments tend to overperform
  if (/\b\d+/.test(seg.text)) {
    score += 0.1;
    const nums = seg.text.match(/\b\d+([.,]\d+)?\b/g) ?? [];
    highlights.push(...nums);
  }

  // Short punchy lines = better hooks
  const wordCount = words.length;
  if (wordCount >= 3 && wordCount <= 10) score += 0.1;

  // Pacing — fast delivery often scores higher
  const dur = seg.end - seg.start;
  if (dur > 0 && wordCount / dur > 3) score += 0.07;

  score = Math.min(1, score);

  return {
    score,
    hookCandidate: score > 0.5 && wordCount <= 14,
    highlights: Array.from(new Set(highlights)),
  };
}

export function annotateSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  return segments.map((s) => {
    const f = scoreSegment(s);
    return { ...s, viral_score: f.score };
  });
}

/**
 * Identifies words within a transcript that should be highlighted in captions.
 * Returns a Set of normalized words.
 */
export function detectHighlightWords(words: TranscriptWord[]): Set<string> {
  const out = new Set<string>();
  for (const w of words) {
    const clean = w.word.toLowerCase().replace(/[.,!?]/g, '').trim();
    if (POWER_WORDS.has(clean)) out.add(clean);
    if (/^\d/.test(clean)) out.add(clean);
  }
  return out;
}
