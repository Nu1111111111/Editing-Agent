'use client';

import { useMemo } from 'react';
import type { Caption } from '@/types/database';
import { cn } from '@/lib/utils';

export const CAPTION_PRESETS = {
  'bold-pink': {
    fontFamily: '"Bricolage Grotesque", Inter, sans-serif',
    fontWeight: 900,
    fontSize: 48,
    color: '#ffffff',
    stroke: 'rgba(0,0,0,0.7)',
    highlight: '#ff2d6f',
    transform: 'uppercase',
    textShadow: '0 3px 12px rgba(0,0,0,0.6)',
  },
  'minimal-white': {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 42,
    color: '#ffffff',
    stroke: 'rgba(0,0,0,0.85)',
    highlight: '#ffd60a',
    transform: 'none',
    textShadow: '0 2px 6px rgba(0,0,0,0.5)',
  },
  'tiktok-yellow': {
    fontFamily: '"Bricolage Grotesque", sans-serif',
    fontWeight: 900,
    fontSize: 46,
    color: '#ffd60a',
    stroke: '#000',
    highlight: '#ff2d6f',
    transform: 'uppercase',
    textShadow: 'none',
  },
} as const;

export type CaptionPresetKey = keyof typeof CAPTION_PRESETS;

interface Props {
  captions: Caption[];
  currentTime: number;
  preset?: CaptionPresetKey;
  /** Container is the 9:16 preview — captions size relative to width. */
  containerWidth: number;
}

export default function CaptionRenderer({ captions, currentTime, preset = 'bold-pink', containerWidth }: Props) {
  const active = useMemo(
    () => captions.find((c) => currentTime >= c.start && currentTime <= c.end),
    [captions, currentTime]
  );
  if (!active) return null;

  const style = CAPTION_PRESETS[preset];
  // Scale font with container width — designed for ~360px preview
  const fontSize = (style.fontSize * containerWidth) / 360;

  const positionClass =
    active.position === 'top' ? 'top-[12%]'
    : active.position === 'center' ? 'top-1/2 -translate-y-1/2'
    : 'bottom-[14%]';

  return (
    <div
      className={cn(
        'absolute left-0 right-0 px-6 text-center pointer-events-none select-none',
        positionClass
      )}
    >
      <div
        className="inline-block leading-tight"
        style={{
          fontFamily: style.fontFamily,
          fontWeight: style.fontWeight,
          fontSize,
          color: style.color,
          textTransform: style.transform as 'uppercase' | 'none',
          WebkitTextStroke: `${fontSize * 0.04}px ${style.stroke}`,
          textShadow: style.textShadow,
          maxWidth: '92%',
        }}
      >
        {active.words.map((w, i) => {
          const isActive = currentTime >= w.start && currentTime <= w.end + 0.05;
          const isFuture = currentTime < w.start;
          return (
            <span
              key={i}
              className="inline-block mx-[0.15em] transition-all"
              style={{
                color: w.highlight ? style.highlight : undefined,
                opacity: isFuture ? 0.35 : 1,
                transform: isActive ? 'scale(1.08)' : 'scale(1)',
                filter: isActive ? 'drop-shadow(0 0 12px rgba(255,255,255,0.4))' : undefined,
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
