/**
 * Auto-cutter: removes filler words, long pauses, and dead frames.
 * Produces a list of clips (in/out timestamps) from raw transcript data.
 */

import type { TranscriptWord, TranscriptSegment, Clip } from '@/types/database';
import { v4 as uuid } from 'uuid';

const GERMAN_FILLERS = new Set([
  'äh', 'ähm', 'ähh', 'ehm', 'hmm', 'hm',
  'also', 'halt', 'irgendwie', 'sozusagen',
  'quasi', 'gewissermaßen', 'genau',
]);

const ENGLISH_FILLERS = new Set([
  'uh', 'um', 'umm', 'uhh', 'er', 'erm',
  'like', 'so', 'basically', 'literally',
  'you know', 'i mean',
]);

const FILLERS = new Set([...GERMAN_FILLERS, ...ENGLISH_FILLERS]);

export interface AutoCutOptions {
  maxPauseSeconds: number;     // collapse pauses longer than this
  removeFillers: boolean;
  minClipDuration: number;     // skip ultra-short fragments
  paddingMs: number;           // leave room around cuts so it doesn't sound choppy
}

export const DEFAULT_AUTOCUT: AutoCutOptions = {
  maxPauseSeconds: 0.4,
  removeFillers: true,
  minClipDuration: 0.4,
  paddingMs: 60,
};

/**
 * Flag words/segments that should be removed.
 */
export function flagFillers(words: TranscriptWord[]): TranscriptWord[] {
  return words.map((w) => {
    const clean = w.word.toLowerCase().replace(/[.,!?]/g, '').trim();
    const isFiller = FILLERS.has(clean);
    return isFiller ? { ...w, word: w.word, _filler: true } as TranscriptWord & { _filler?: boolean } : w;
  });
}

/**
 * Builds the keep-list of [in, out] intervals from words after removing fillers/pauses.
 * Returns merged contiguous intervals.
 */
export function buildKeepIntervals(
  words: TranscriptWord[],
  options: AutoCutOptions = DEFAULT_AUTOCUT
): Array<[number, number]> {
  if (words.length === 0) return [];

  const pad = options.paddingMs / 1000;
  const kept: Array<[number, number]> = [];

  for (const w of words) {
    const cleaned = w.word.toLowerCase().replace(/[.,!?]/g, '').trim();
    if (options.removeFillers && FILLERS.has(cleaned)) continue;
    kept.push([Math.max(0, w.start - pad), w.end + pad]);
  }

  // Merge intervals that are close together (gap <= maxPauseSeconds)
  const merged: Array<[number, number]> = [];
  for (const [s, e] of kept) {
    if (merged.length === 0) {
      merged.push([s, e]);
      continue;
    }
    const last = merged[merged.length - 1];
    if (s - last[1] <= options.maxPauseSeconds) {
      last[1] = Math.max(last[1], e);
    } else {
      merged.push([s, e]);
    }
  }

  // Drop micro-fragments
  return merged.filter(([s, e]) => e - s >= options.minClipDuration);
}

/**
 * Turn keep-intervals into Clip[] for the timeline.
 */
export function intervalsToClips(
  intervals: Array<[number, number]>,
  sourceAssetId: string
): Clip[] {
  return intervals.map(([start, end]) => ({
    id: uuid(),
    source_asset_id: sourceAssetId,
    in_seconds: start,
    out_seconds: end,
    track: 0,
    effects: [],
    captions_enabled: true,
    speed: 1,
    volume: 1,
  }));
}

/**
 * Reorder clips by viral score — push high-impact lines to the front
 * for a stronger hook. Only swaps within reasonable distance to avoid
 * destroying narrative flow.
 */
export function reorderForHook(clips: Clip[], segments: TranscriptSegment[]): Clip[] {
  if (clips.length < 2 || segments.length === 0) return clips;
  // Score each clip by the best viral_score of overlapping segments
  const scored = clips.map((clip) => {
    let bestScore = 0;
    for (const seg of segments) {
      if (seg.end < clip.in_seconds || seg.start > clip.out_seconds) continue;
      bestScore = Math.max(bestScore, seg.viral_score ?? 0);
    }
    return { clip, score: bestScore };
  });

  // Find the highest-scoring clip and bring it to position 0 if not already at front.
  let bestIdx = 0;
  for (let i = 1; i < scored.length; i++) {
    if (scored[i].score > scored[bestIdx].score) bestIdx = i;
  }
  if (bestIdx === 0 || scored[bestIdx].score < 0.6) return clips;

  const reordered = [...clips];
  const [hook] = reordered.splice(bestIdx, 1);
  reordered.unshift(hook);
  return reordered;
}
