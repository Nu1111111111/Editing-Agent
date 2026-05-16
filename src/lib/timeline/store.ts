'use client';

import { create } from 'zustand';
import type { Timeline, Clip, Caption, Asset } from '@/types/database';

interface TimelineState {
  // data
  projectId: string | null;
  timeline: Timeline | null;
  assets: Record<string, Asset>;
  assetUrls: Record<string, string>; // signed urls
  // playback
  currentTime: number;        // seconds in OUTPUT (cut) timeline
  playing: boolean;
  duration: number;
  // selection
  selectedClipId: string | null;
  selectedCaptionId: string | null;
  // history (simple)
  history: Timeline[];
  future: Timeline[];

  // setters
  setProject: (projectId: string, timeline: Timeline | null, assets: Asset[], urls: Record<string, string>) => void;
  setTimeline: (t: Timeline) => void;
  updateClips: (mut: (clips: Clip[]) => Clip[]) => void;
  updateCaptions: (mut: (cap: Caption[]) => Caption[]) => void;
  selectClip: (id: string | null) => void;
  selectCaption: (id: string | null) => void;
  seek: (t: number) => void;
  play: () => void;
  pause: () => void;
  setDuration: (d: number) => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  projectId: null,
  timeline: null,
  assets: {},
  assetUrls: {},
  currentTime: 0,
  playing: false,
  duration: 0,
  selectedClipId: null,
  selectedCaptionId: null,
  history: [],
  future: [],

  setProject: (projectId, timeline, assets, urls) =>
    set({
      projectId,
      timeline,
      assets: Object.fromEntries(assets.map((a) => [a.id, a])),
      assetUrls: urls,
      duration: timeline?.clips.reduce((acc, c) => acc + (c.out_seconds - c.in_seconds), 0) ?? 0,
    }),

  setTimeline: (t) => set({ timeline: t, duration: t.clips.reduce((a, c) => a + (c.out_seconds - c.in_seconds), 0) }),

  pushHistory: () => {
    const { timeline, history } = get();
    if (!timeline) return;
    set({ history: [...history.slice(-49), timeline], future: [] });
  },

  updateClips: (mut) => {
    const { timeline } = get();
    if (!timeline) return;
    get().pushHistory();
    const clips = mut(timeline.clips);
    const next: Timeline = { ...timeline, clips, version: timeline.version + 1 };
    set({
      timeline: next,
      duration: clips.reduce((a, c) => a + (c.out_seconds - c.in_seconds), 0),
    });
  },

  updateCaptions: (mut) => {
    const { timeline } = get();
    if (!timeline) return;
    get().pushHistory();
    const captions = mut(timeline.captions);
    set({ timeline: { ...timeline, captions, version: timeline.version + 1 } });
  },

  selectClip: (id) => set({ selectedClipId: id, selectedCaptionId: null }),
  selectCaption: (id) => set({ selectedCaptionId: id, selectedClipId: null }),

  seek: (t) => set({ currentTime: Math.max(0, Math.min(get().duration, t)) }),
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  setDuration: (d) => set({ duration: d }),

  undo: () => {
    const { history, timeline, future } = get();
    if (history.length === 0 || !timeline) return;
    const prev = history[history.length - 1];
    set({
      timeline: prev,
      history: history.slice(0, -1),
      future: [timeline, ...future],
    });
  },
  redo: () => {
    const { future, timeline, history } = get();
    if (future.length === 0 || !timeline) return;
    const next = future[0];
    set({
      timeline: next,
      future: future.slice(1),
      history: [...history, timeline],
    });
  },
}));

/**
 * Maps OUTPUT timeline time → (sourceAssetId, sourceTime).
 * Walks the clips array since they're contiguous in output time.
 */
export function outputToSource(timeline: Timeline, outTime: number): { clip: Clip; sourceTime: number } | null {
  let acc = 0;
  for (const clip of timeline.clips) {
    const dur = clip.out_seconds - clip.in_seconds;
    if (outTime <= acc + dur) {
      return { clip, sourceTime: clip.in_seconds + (outTime - acc) };
    }
    acc += dur;
  }
  // past end — pin to last
  const last = timeline.clips[timeline.clips.length - 1];
  if (last) return { clip: last, sourceTime: last.out_seconds };
  return null;
}
