/**
 * Caption generation: turns word-level transcripts into viral-style
 * caption blocks (3-5 words per block, with highlighting metadata).
 */

import type { TranscriptWord, Clip, Caption } from '@/types/database';
import { v4 as uuid } from 'uuid';

export interface CaptionOptions {
  wordsPerBlock: number;
  maxBlockDuration: number; // seconds
  position: 'bottom' | 'center' | 'top';
}

export const DEFAULT_CAPTIONS: CaptionOptions = {
  wordsPerBlock: 4,
  maxBlockDuration: 2.5,
  position: 'bottom',
};

/**
 * Generates caption blocks aligned to the kept timeline (clips).
 * Words falling outside any clip are skipped.
 */
export function generateCaptions(
  words: TranscriptWord[],
  clips: Clip[],
  highlightWords: Set<string>,
  options: CaptionOptions = DEFAULT_CAPTIONS
): Caption[] {
  if (words.length === 0) return [];

  // Build a remap: original time → output time (post-cut)
  const remap = buildTimeRemap(clips);
  const inClips = words.filter((w) => isInsideClips(w.start, clips));

  const blocks: Caption[] = [];
  let buffer: TranscriptWord[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    const mappedStart = remap(buffer[0].start);
    const mappedEnd = remap(buffer[buffer.length - 1].end);
    if (mappedStart == null || mappedEnd == null) {
      buffer = [];
      return;
    }
    blocks.push({
      id: uuid(),
      text: buffer.map((w) => w.word).join(' '),
      words: buffer.map((w) => {
        const ms = remap(w.start);
        const me = remap(w.end);
        return {
          word: w.word,
          start: ms ?? 0,
          end: me ?? 0,
          highlight: highlightWords.has(w.word.toLowerCase().replace(/[.,!?]/g, '')),
        };
      }),
      start: mappedStart,
      end: mappedEnd,
      style: 'bold-pink',
      position: options.position,
    });
    buffer = [];
  };

  for (const w of inClips) {
    if (buffer.length === 0) {
      buffer.push(w);
      continue;
    }
    const first = buffer[0];
    const wouldExceedDuration = w.end - first.start > options.maxBlockDuration;
    const endsSentence = /[.!?]$/.test(buffer[buffer.length - 1].word);
    if (
      buffer.length >= options.wordsPerBlock ||
      wouldExceedDuration ||
      endsSentence
    ) {
      flush();
    }
    buffer.push(w);
  }
  flush();
  return blocks;
}

function isInsideClips(t: number, clips: Clip[]): boolean {
  return clips.some((c) => t >= c.in_seconds && t <= c.out_seconds);
}

/**
 * Returns a function that maps an original-video time to its
 * position in the cut timeline. Returns null if the time falls into a removed region.
 */
export function buildTimeRemap(clips: Clip[]): (t: number) => number | null {
  // Cumulative offset table
  const table: Array<{ in: number; out: number; offset: number }> = [];
  let acc = 0;
  for (const c of clips) {
    table.push({ in: c.in_seconds, out: c.out_seconds, offset: acc - c.in_seconds });
    acc += c.out_seconds - c.in_seconds;
  }
  return (t: number) => {
    for (const row of table) {
      if (t >= row.in && t <= row.out) return t + row.offset;
    }
    return null;
  };
}
