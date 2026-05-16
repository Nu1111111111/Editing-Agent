'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useTimelineStore, outputToSource } from '@/lib/timeline/store';
import CaptionRenderer, { type CaptionPresetKey } from '@/components/captions/CaptionRenderer';
import { formatDuration } from '@/lib/utils';

export default function PreviewPlayer() {
  const { timeline, currentTime, playing, duration, assetUrls, seek, play, pause } = useTimelineStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(360);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Sync video to timeline state
  useEffect(() => {
    if (!videoRef.current || !timeline) return;
    const mapping = outputToSource(timeline, currentTime);
    if (!mapping) return;
    const url = assetUrls[mapping.clip.source_asset_id];
    if (videoRef.current.src !== url) {
      videoRef.current.src = url;
    }
    // Only seek when paused or drifting
    if (!playing || Math.abs(videoRef.current.currentTime - mapping.sourceTime) > 0.3) {
      videoRef.current.currentTime = mapping.sourceTime;
    }
  }, [currentTime, timeline, assetUrls, playing]);

  // Drive playback via RAF
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      videoRef.current?.pause();
      return;
    }
    videoRef.current?.play().catch(() => {/* user gesture needed */});
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = useTimelineStore.getState().currentTime + dt;
      if (next >= duration) {
        useTimelineStore.getState().pause();
        useTimelineStore.getState().seek(duration);
        return;
      }
      useTimelineStore.getState().seek(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, duration]);

  const preset = (timeline?.style?.caption_preset as CaptionPresetKey) ?? 'bold-pink';
  const mapping = timeline ? outputToSource(timeline, currentTime) : null;
  const reframe = mapping?.clip.reframe;
  const kf = reframe?.keyframes ?? [{ t: 0, cx: 0.5, cy: 0.5, scale: 1 }];
  // Find closest keyframe (could interpolate)
  const localT = mapping ? mapping.sourceTime - mapping.clip.in_seconds : 0;
  const closest = kf.reduce((a, b) => (Math.abs(b.t - localT) < Math.abs(a.t - localT) ? b : a));
  const transform = `scale(${closest.scale}) translate(${(0.5 - closest.cx) * 100}%, ${(0.5 - closest.cy) * 100}%)`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={containerRef}
        className="relative aspect-[9/16] w-full max-w-[380px] bg-black rounded-xl overflow-hidden border border-border"
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform, transformOrigin: 'center' }}
          playsInline
          muted={false}
        />
        {timeline && (
          <CaptionRenderer
            captions={timeline.captions}
            currentTime={currentTime}
            preset={preset}
            containerWidth={containerWidth}
          />
        )}
      </div>

      <div className="flex items-center gap-3 w-full max-w-[380px]">
        <button onClick={() => seek(0)} className="btn-ghost p-2"><SkipBack className="w-4 h-4" /></button>
        <button onClick={() => (playing ? pause() : play())} className="btn-primary p-2 w-10 h-10 rounded-full grid place-items-center">
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <button onClick={() => seek(duration)} className="btn-ghost p-2"><SkipForward className="w-4 h-4" /></button>
        <div className="text-xs text-white/60 ml-auto tabular-nums">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </div>
      </div>
    </div>
  );
}
