'use client';

/**
 * Top-level "Editor AI" pipeline. Orchestrates:
 *   1. Whisper transcription
 *   2. Viral analysis + filler flagging
 *   3. Auto-cut → keep intervals → Clip[]
 *   4. Face tracking → reframe keyframes
 *   5. Caption generation
 *   6. Persist timeline to Supabase
 */

import { transcribe } from './whisper';
import { annotateSegments, detectHighlightWords } from './viral-analyzer';
import { buildKeepIntervals, intervalsToClips, reorderForHook, DEFAULT_AUTOCUT } from './auto-cutter';
import { trackFaces, framesToReframe } from './face-tracking';
import { generateCaptions } from './captions';
import { createClient } from '@/lib/supabase/client';
import type { Asset, Clip, Caption, Timeline } from '@/types/database';

type Stage =
  | 'idle'
  | 'audio'
  | 'transcribe'
  | 'analyze'
  | 'autocut'
  | 'face'
  | 'captions'
  | 'save'
  | 'done'
  | 'error';

export interface PipelineProgress {
  stage: Stage;
  message: string;
  progress: number;     // 0..1 of current stage
  overall: number;      // 0..1 overall
}

export type PipelineCallback = (p: PipelineProgress) => void;

const STAGE_WEIGHTS: Record<Stage, number> = {
  idle: 0,
  audio: 0.05,
  transcribe: 0.35,
  analyze: 0.05,
  autocut: 0.05,
  face: 0.3,
  captions: 0.1,
  save: 0.1,
  done: 0,
  error: 0,
};

function overallProgress(stage: Stage, stageProgress: number): number {
  const order: Stage[] = ['audio', 'transcribe', 'analyze', 'autocut', 'face', 'captions', 'save', 'done'];
  let acc = 0;
  for (const s of order) {
    if (s === stage) {
      acc += STAGE_WEIGHTS[s] * stageProgress;
      break;
    }
    acc += STAGE_WEIGHTS[s];
  }
  return Math.min(1, acc);
}

export async function runPipeline(
  rawAsset: Asset,
  publicUrl: string,
  videoEl: HTMLVideoElement,
  onProgress: PipelineCallback
): Promise<{ timeline: Timeline | null }> {
  const supabase = createClient();

  try {
    // 1. Transcribe
    onProgress({ stage: 'transcribe', message: 'Transkribiere mit Whisper…', progress: 0, overall: overallProgress('transcribe', 0) });
    const transcript = await transcribe(publicUrl, (msg, p) => {
      onProgress({
        stage: 'transcribe',
        message: msg,
        progress: p,
        overall: overallProgress('transcribe', p),
      });
    });

    // Persist transcript
    await supabase.from('transcripts').upsert({
      asset_id: rawAsset.id,
      language: transcript.language ?? 'de',
      full_text: transcript.text,
      words: transcript.words,
      segments: transcript.segments,
    }, { onConflict: 'asset_id' });

    // 2. Analyze
    onProgress({ stage: 'analyze', message: 'Analysiere Viral-Potenzial…', progress: 0, overall: overallProgress('analyze', 0) });
    const scoredSegments = annotateSegments(transcript.segments);
    const highlightWords = detectHighlightWords(transcript.words);
    onProgress({ stage: 'analyze', message: 'Analyse abgeschlossen', progress: 1, overall: overallProgress('analyze', 1) });

    // 3. Auto-cut
    onProgress({ stage: 'autocut', message: 'Entferne Filler & tote Frames…', progress: 0, overall: overallProgress('autocut', 0) });
    const intervals = buildKeepIntervals(transcript.words, DEFAULT_AUTOCUT);
    let clips: Clip[] = intervalsToClips(intervals, rawAsset.id);
    clips = reorderForHook(clips, scoredSegments);
    onProgress({ stage: 'autocut', message: `${clips.length} Clips erzeugt`, progress: 1, overall: overallProgress('autocut', 1) });

    // 4. Face tracking — degrade gracefully if it fails
    let reframe;
    try {
      onProgress({ stage: 'face', message: 'Tracke Gesicht…', progress: 0, overall: overallProgress('face', 0) });
      const faceFrames = await trackFaces(videoEl, {
        onProgress: (p) => onProgress({
          stage: 'face',
          message: `Tracking ${Math.round(p * 100)}%`,
          progress: p,
          overall: overallProgress('face', p),
        }),
      });
      reframe = framesToReframe(faceFrames);
    } catch (err) {
      console.warn('Face tracking failed:', err);
      reframe = { keyframes: [{ t: 0, cx: 0.5, cy: 0.5, scale: 1 }] };
    }
    // Apply reframe to all clips
    clips = clips.map((c) => ({ ...c, reframe }));

    // 5. Captions
    onProgress({ stage: 'captions', message: 'Generiere virale Captions…', progress: 0, overall: overallProgress('captions', 0) });
    const captions: Caption[] = generateCaptions(transcript.words, clips, highlightWords);
    onProgress({ stage: 'captions', message: `${captions.length} Caption-Blöcke`, progress: 1, overall: overallProgress('captions', 1) });

    // 6. Save timeline
    onProgress({ stage: 'save', message: 'Speichere Timeline…', progress: 0, overall: overallProgress('save', 0) });
    const { data: tlData, error } = await supabase
      .from('timelines')
      .upsert({
        project_id: rawAsset.project_id,
        clips,
        captions,
        audio: { voice_volume: 1 },
        style: { caption_preset: 'bold-pink' },
      }, { onConflict: 'project_id' })
      .select()
      .single();
    if (error) throw error;

    await supabase.from('projects').update({
      status: 'ready',
      duration_seconds: clips.reduce((acc, c) => acc + (c.out_seconds - c.in_seconds), 0),
      updated_at: new Date().toISOString(),
    }).eq('id', rawAsset.project_id);

    onProgress({ stage: 'done', message: 'Fertig!', progress: 1, overall: 1 });
    return { timeline: tlData as Timeline };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    onProgress({ stage: 'error', message: msg, progress: 0, overall: 0 });
    return { timeline: null };
  }
}
