'use client';

/**
 * Browser-based Whisper transcription using @xenova/transformers.
 * Runs 100% locally — no API costs. Uses WebAssembly + WebGPU when available.
 *
 * Model: Xenova/whisper-base (~150MB, multilingual, word-level timestamps).
 * Bigger model (small/medium) = better accuracy, slower load.
 */

import type { TranscriptWord, TranscriptSegment } from '@/types/database';

type ProgressCallback = (status: string, progress: number) => void;

let pipelinePromise: Promise<unknown> | null = null;

async function getPipeline(onProgress?: ProgressCallback) {
  if (pipelinePromise) return pipelinePromise;
  // dynamic import — transformers.js is large
  const { pipeline, env } = await import('@xenova/transformers');
  // Use the CDN-hosted models (cached after first load)
  env.allowLocalModels = false;
  env.useBrowserCache = true;

  pipelinePromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
    progress_callback: (data: { status: string; progress?: number; file?: string }) => {
      onProgress?.(data.status + (data.file ? ` (${data.file})` : ''), data.progress ?? 0);
    },
  });
  return pipelinePromise;
}

/**
 * Extracts mono 16kHz Float32 PCM from a media URL.
 * Required input format for Whisper.
 */
export async function extractAudio(mediaUrl: string): Promise<Float32Array> {
  const res = await fetch(mediaUrl);
  const arrayBuffer = await res.arrayBuffer();
  const AudioContextCtor =
    typeof window !== 'undefined'
      ? (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
      : null;
  if (!AudioContextCtor) throw new Error('Web Audio API not available');
  const ctx = new AudioContextCtor({ sampleRate: 16000 });
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  // Mix to mono
  const channelData = audioBuffer.getChannelData(0);
  if (audioBuffer.numberOfChannels > 1) {
    const ch2 = audioBuffer.getChannelData(1);
    const mono = new Float32Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      mono[i] = (channelData[i] + ch2[i]) / 2;
    }
    return mono;
  }
  return channelData;
}

export interface TranscriptionResult {
  text: string;
  words: TranscriptWord[];
  segments: TranscriptSegment[];
  language?: string;
}

export async function transcribe(
  mediaUrl: string,
  onProgress?: ProgressCallback
): Promise<TranscriptionResult> {
  onProgress?.('Lade Audio…', 0);
  const audio = await extractAudio(mediaUrl);

  onProgress?.('Lade Whisper-Modell…', 0);
  const pipe = (await getPipeline(onProgress)) as (
    audio: Float32Array,
    opts: Record<string, unknown>
  ) => Promise<{
    text: string;
    chunks?: Array<{ text: string; timestamp: [number, number | null] }>;
  }>;

  onProgress?.('Transkribiere…', 0);
  const output = await pipe(audio, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: 'word',
    language: 'german', // can be detected automatically by omitting
  });

  const words: TranscriptWord[] = (output.chunks ?? []).map((c) => ({
    word: c.text.trim(),
    start: c.timestamp[0],
    end: c.timestamp[1] ?? c.timestamp[0] + 0.3,
  }));

  // Group into segments at sentence boundaries
  const segments: TranscriptSegment[] = groupIntoSegments(words);

  onProgress?.('Fertig', 100);
  return {
    text: output.text,
    words,
    segments,
  };
}

function groupIntoSegments(words: TranscriptWord[]): TranscriptSegment[] {
  if (words.length === 0) return [];
  const segments: TranscriptSegment[] = [];
  let buffer: TranscriptWord[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer.map((w) => w.word).join(' ').replace(/\s+([.,!?])/g, '$1');
    segments.push({
      text,
      start: buffer[0].start,
      end: buffer[buffer.length - 1].end,
    });
    buffer = [];
  };

  for (const w of words) {
    buffer.push(w);
    if (/[.!?]$/.test(w.word) || buffer.length >= 12) {
      flush();
    }
  }
  flush();
  return segments;
}
