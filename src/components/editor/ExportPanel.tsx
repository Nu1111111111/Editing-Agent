'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';
import { useTimelineStore } from '@/lib/timeline/store';
import { renderTimeline, type ExportPreset, type RenderProgress } from '@/lib/ffmpeg/render';

const PRESETS: { key: ExportPreset; label: string; sub: string }[] = [
  { key: 'reels',  label: 'Instagram Reels', sub: '1080×1920 · 30fps · 6M' },
  { key: 'tiktok', label: 'TikTok',          sub: '1080×1920 · 30fps · 6M' },
  { key: 'shorts', label: 'YouTube Shorts',  sub: '1080×1920 · 30fps · 8M' },
];

export default function ExportPanel() {
  const { timeline, assets, assetUrls } = useTimelineStore();
  const [preset, setPreset] = useState<ExportPreset>('reels');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<RenderProgress | null>(null);

  async function handleExport() {
    if (!timeline) return;
    setBusy(true);
    setProgress({ stage: 'loading', message: 'Starte…', progress: 0 });
    try {
      const blob = await renderTimeline(timeline, assets, assetUrls, preset, (p) => setProgress(p));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `viralcut-${preset}-${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export fertig.');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Export fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 space-y-3">
      <div className="text-xs uppercase text-white/40">Export-Preset</div>
      <div className="space-y-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            disabled={busy}
            className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition ${preset === p.key ? 'border-accent bg-accent/10' : 'border-border hover:border-white/30'}`}
          >
            <div className="font-medium">{p.label}</div>
            <div className="text-xs text-white/50">{p.sub}</div>
          </button>
        ))}
      </div>

      <button
        onClick={handleExport}
        disabled={busy || !timeline || timeline.clips.length === 0}
        className="btn-primary w-full mt-2"
      >
        {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Rendering…</> : <><Download className="w-4 h-4" /> Exportieren</>}
      </button>

      {progress && busy && (
        <div className="text-xs text-white/60 space-y-1.5">
          <div>{progress.message}</div>
          <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${Math.round(progress.progress * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
