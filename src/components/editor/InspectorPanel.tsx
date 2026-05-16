'use client';

import { useTimelineStore } from '@/lib/timeline/store';
import { CAPTION_PRESETS, type CaptionPresetKey } from '@/components/captions/CaptionRenderer';
import { Trash2, Lock, Unlock } from 'lucide-react';
import { useState } from 'react';

export default function InspectorPanel() {
  const { timeline, selectedClipId, selectedCaptionId, updateClips, updateCaptions, setTimeline } = useTimelineStore();
  if (!timeline) return <Empty />;

  const clip = timeline.clips.find((c) => c.id === selectedClipId);
  const caption = timeline.captions.find((c) => c.id === selectedCaptionId);

  if (caption) return <CaptionInspector />;
  if (clip) return <ClipInspector />;
  return <ProjectInspector />;

  function ClipInspector() {
    if (!clip) return null;
    return (
      <div className="p-4 space-y-4">
        <div>
          <div className="text-xs uppercase text-white/40 mb-2">Clip</div>
          <div className="text-sm">In: <span className="tabular-nums">{clip.in_seconds.toFixed(2)}s</span></div>
          <div className="text-sm">Out: <span className="tabular-nums">{clip.out_seconds.toFixed(2)}s</span></div>
          <div className="text-sm">Dauer: <span className="tabular-nums">{(clip.out_seconds - clip.in_seconds).toFixed(2)}s</span></div>
        </div>

        <div>
          <label className="text-xs uppercase text-white/40">Lautstärke</label>
          <input
            type="range" min={0} max={1} step={0.05}
            value={clip.volume ?? 1}
            onChange={(e) => updateClips((cs) => cs.map((c) => c.id === clip.id ? { ...c, volume: parseFloat(e.target.value) } : c))}
            className="w-full"
          />
        </div>

        <div>
          <label className="text-xs uppercase text-white/40">Captions</label>
          <button
            onClick={() => updateClips((cs) => cs.map((c) => c.id === clip.id ? { ...c, captions_enabled: !c.captions_enabled } : c))}
            className="btn-secondary w-full mt-1 justify-start"
          >
            {clip.captions_enabled ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {clip.captions_enabled ? 'Captions an' : 'Captions aus'}
          </button>
        </div>

        <button
          onClick={() => updateClips((cs) => cs.filter((c) => c.id !== clip.id))}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-accent/15 text-accent hover:bg-accent/25 transition"
        >
          <Trash2 className="w-4 h-4" /> Clip löschen
        </button>
      </div>
    );
  }

  function CaptionInspector() {
    const [text, setText] = useState(caption?.text ?? '');
    if (!caption) return null;
    return (
      <div className="p-4 space-y-4">
        <div className="text-xs uppercase text-white/40">Caption</div>
        <textarea
          className="input min-h-[80px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() =>
            updateCaptions((cs) => cs.map((c) => c.id === caption.id
              ? { ...c, text, words: text.split(' ').map((w, i, arr) => ({
                  word: w,
                  start: c.start + ((c.end - c.start) * i) / arr.length,
                  end: c.start + ((c.end - c.start) * (i + 1)) / arr.length,
                })) }
              : c))}
        />
        <div className="text-sm tabular-nums text-white/60">
          {caption.start.toFixed(2)}s → {caption.end.toFixed(2)}s
        </div>
        <button
          onClick={() => updateCaptions((cs) => cs.filter((c) => c.id !== caption.id))}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-accent/15 text-accent hover:bg-accent/25 transition"
        >
          <Trash2 className="w-4 h-4" /> Caption löschen
        </button>
      </div>
    );
  }

  function ProjectInspector() {
    if (!timeline) return null;
    return (
      <div className="p-4 space-y-4">
        <div className="text-xs uppercase text-white/40">Projekt</div>
        <div>
          <label className="text-xs uppercase text-white/40">Caption-Stil</label>
          <div className="grid grid-cols-1 gap-2 mt-2">
            {(Object.keys(CAPTION_PRESETS) as CaptionPresetKey[]).map((key) => {
              const active = (timeline.style?.caption_preset ?? 'bold-pink') === key;
              return (
                <button
                  key={key}
                  onClick={() => setTimeline({ ...timeline, style: { ...timeline.style, caption_preset: key }, version: timeline.version + 1 })}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition ${active ? 'border-accent bg-accent/10' : 'border-border hover:border-white/30'}`}
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function Empty() {
    return <div className="p-6 text-sm text-white/40">Wähle einen Clip oder eine Caption.</div>;
  }
}
