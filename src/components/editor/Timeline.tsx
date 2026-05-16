'use client';

import { useMemo, useRef, useState } from 'react';
import { useTimelineStore } from '@/lib/timeline/store';
import { cn } from '@/lib/utils';
import type { Clip, Caption } from '@/types/database';

const PIXELS_PER_SECOND = 60;

export default function Timeline() {
  const { timeline, currentTime, duration, seek, selectedClipId, selectClip, selectedCaptionId, selectCaption, updateClips } = useTimelineStore();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const pps = PIXELS_PER_SECOND * zoom;

  const clipPositions = useMemo(() => {
    if (!timeline) return [];
    let acc = 0;
    return timeline.clips.map((c) => {
      const w = (c.out_seconds - c.in_seconds) * pps;
      const pos = { clip: c, x: acc * pps, width: w, outStart: acc };
      acc += c.out_seconds - c.in_seconds;
      return pos;
    });
  }, [timeline, pps]);

  function onTrackClick(e: React.MouseEvent) {
    if (!scrollerRef.current) return;
    const rect = scrollerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollerRef.current.scrollLeft;
    seek(x / pps);
  }

  if (!timeline) return null;

  return (
    <div className="bg-surface border-t border-border">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="text-xs text-white/60">{timeline.clips.length} Clips · {timeline.captions.length} Captions</div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/60">Zoom</span>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-24"
          />
        </div>
      </div>

      <div ref={scrollerRef} className="overflow-x-auto h-[200px] relative" onClick={onTrackClick}>
        <div style={{ width: Math.max(800, duration * pps + 100) }} className="relative h-full">
          {/* Ruler */}
          <div className="h-6 timeline-track relative border-b border-border">
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
              <span
                key={i}
                className="absolute top-0 text-[10px] text-white/40 px-1"
                style={{ left: i * pps }}
              >
                {i}s
              </span>
            ))}
          </div>

          {/* Video track */}
          <div className="h-14 mt-1 relative bg-surface2/30">
            {clipPositions.map(({ clip, x, width }) => (
              <ClipBlock
                key={clip.id}
                clip={clip}
                x={x}
                width={width}
                selected={selectedClipId === clip.id}
                onSelect={(e) => { e.stopPropagation(); selectClip(clip.id); }}
                onTrim={(side, delta) => {
                  updateClips((clips) =>
                    clips.map((c) => {
                      if (c.id !== clip.id) return c;
                      const ds = delta / pps;
                      if (side === 'left') {
                        const newIn = Math.max(0, Math.min(c.out_seconds - 0.1, c.in_seconds + ds));
                        return { ...c, in_seconds: newIn };
                      } else {
                        const newOut = Math.max(c.in_seconds + 0.1, c.out_seconds + ds);
                        return { ...c, out_seconds: newOut };
                      }
                    })
                  );
                }}
              />
            ))}
          </div>

          {/* Captions track */}
          <div className="h-10 mt-1 relative bg-surface2/20">
            {timeline.captions.map((cap) => (
              <CaptionBlock
                key={cap.id}
                caption={cap}
                x={cap.start * pps}
                width={(cap.end - cap.start) * pps}
                selected={selectedCaptionId === cap.id}
                onSelect={(e) => { e.stopPropagation(); selectCaption(cap.id); }}
              />
            ))}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-px bg-accent pointer-events-none z-10"
            style={{ left: currentTime * pps }}
          >
            <div className="w-3 h-3 bg-accent rounded-full -translate-x-1/2 -translate-y-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ClipBlock({
  clip, x, width, selected, onSelect, onTrim,
}: {
  clip: Clip; x: number; width: number; selected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onTrim: (side: 'left' | 'right', delta: number) => void;
}) {
  function startTrim(side: 'left' | 'right', e: React.MouseEvent) {
    e.stopPropagation();
    const startX = e.clientX;
    const onMove = (ev: MouseEvent) => onTrim(side, ev.clientX - startX);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }
  return (
    <div
      className={cn(
        'absolute top-1 bottom-1 rounded-md cursor-pointer overflow-hidden group',
        'bg-gradient-to-br from-accent2 to-accent border',
        selected ? 'border-white ring-2 ring-accent/50' : 'border-transparent hover:border-white/30'
      )}
      style={{ left: x, width }}
      onClick={onSelect}
    >
      <div className="px-2 py-1 text-[10px] text-white/90 truncate">Clip {clip.in_seconds.toFixed(1)}s</div>
      <div
        onMouseDown={(e) => startTrim('left', e)}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/30 opacity-0 group-hover:opacity-100"
      />
      <div
        onMouseDown={(e) => startTrim('right', e)}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/30 opacity-0 group-hover:opacity-100"
      />
    </div>
  );
}

function CaptionBlock({ caption, x, width, selected, onSelect }: {
  caption: Caption; x: number; width: number; selected: boolean; onSelect: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className={cn(
        'absolute top-1 bottom-1 rounded-md cursor-pointer overflow-hidden border',
        'bg-success/30 text-white text-[10px] px-2 py-1 truncate',
        selected ? 'border-white ring-2 ring-success/50' : 'border-success/40 hover:border-white/50'
      )}
      style={{ left: x, width }}
      onClick={onSelect}
    >
      {caption.text}
    </div>
  );
}
