'use client';

import { fetchFile } from '@ffmpeg/util';
import { getFFmpeg } from './client';
import type { Timeline, Asset, Caption } from '@/types/database';

export type ExportPreset = 'reels' | 'tiktok' | 'shorts' | 'custom';

const PRESETS: Record<ExportPreset, { width: number; height: number; fps: number; bitrate: string }> = {
  reels:  { width: 1080, height: 1920, fps: 30, bitrate: '6M' },
  tiktok: { width: 1080, height: 1920, fps: 30, bitrate: '6M' },
  shorts: { width: 1080, height: 1920, fps: 30, bitrate: '8M' },
  custom: { width: 1080, height: 1920, fps: 30, bitrate: '6M' },
};

export interface RenderProgress { stage: 'loading' | 'fetching' | 'cutting' | 'rendering' | 'done' | 'error'; message: string; progress: number; }
export type RenderCallback = (p: RenderProgress) => void;

export async function renderTimeline(timeline: Timeline, assets: Record<string, Asset>, assetUrls: Record<string, string>, preset: ExportPreset, onProgress: RenderCallback): Promise<Blob> {
  const cfg = PRESETS[preset];
  onProgress({ stage: 'loading', message: 'Lade ffmpeg.wasm…', progress: 0 });
  const ffmpeg = await getFFmpeg();
  ffmpeg.on('progress', ({ progress }) => onProgress({ stage: 'rendering', message: 'Rendering…', progress }));

  const usedAssetIds = Array.from(new Set(timeline.clips.map((c) => c.source_asset_id)));
  onProgress({ stage: 'fetching', message: 'Lade Quellvideos…', progress: 0 });
  for (let i = 0; i < usedAssetIds.length; i++) {
    const id = usedAssetIds[i];
    const data = await fetchFile(assetUrls[id]);
    await ffmpeg.writeFile(`src_${id}.mp4`, data);
    onProgress({ stage: 'fetching', message: `Datei ${i + 1}/${usedAssetIds.length}`, progress: (i + 1) / usedAssetIds.length });
  }

  onProgress({ stage: 'cutting', message: 'Schneide Clips…', progress: 0 });
  const segmentFiles: string[] = [];
  for (let i = 0; i < timeline.clips.length; i++) {
    const c = timeline.clips[i];
    const segName = `seg_${i}.mp4`;
    const dur = c.out_seconds - c.in_seconds;
    const kf = c.reframe?.keyframes?.[0] ?? { cx: 0.5, cy: 0.5, scale: 1 };
    const source = assets[c.source_asset_id];
    const sw = source?.width ?? 1920, sh = source?.height ?? 1080;
    const cropH = Math.min(sh, sh / kf.scale);
    const cropW = Math.min(sw, cropH * 9 / 16);
    const cx = Math.max(cropW / 2, Math.min(sw - cropW / 2, kf.cx * sw));
    const cy = Math.max(cropH / 2, Math.min(sh - cropH / 2, kf.cy * sh));
    const ox = Math.round(cx - cropW / 2), oy = Math.round(cy - cropH / 2);

    await ffmpeg.exec([
      '-ss', c.in_seconds.toFixed(3), '-to', c.out_seconds.toFixed(3),
      '-i', `src_${c.source_asset_id}.mp4`,
      '-vf', `crop=${Math.round(cropW)}:${Math.round(cropH)}:${ox}:${oy},scale=${cfg.width}:${cfg.height},fps=${cfg.fps}`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k', '-t', dur.toFixed(3), segName,
    ]);
    segmentFiles.push(segName);
    onProgress({ stage: 'cutting', message: `Clip ${i + 1}/${timeline.clips.length}`, progress: (i + 1) / timeline.clips.length });
  }

  const concatList = segmentFiles.map((f) => `file '${f}'`).join('\n');
  await ffmpeg.writeFile('concat.txt', concatList);
  await ffmpeg.writeFile('captions.ass', generateASS(timeline.captions, cfg.width, cfg.height));

  onProgress({ stage: 'rendering', message: 'Finalisiere…', progress: 0 });
  await ffmpeg.exec([
    '-f', 'concat', '-safe', '0', '-i', 'concat.txt',
    '-vf', `ass=captions.ass`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-b:v', cfg.bitrate,
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', 'output.mp4',
  ]);

  const data = (await ffmpeg.readFile('output.mp4')) as Uint8Array;
  onProgress({ stage: 'done', message: 'Export fertig', progress: 1 });
  const buf = new ArrayBuffer(data.byteLength);
  new Uint8Array(buf).set(data);
  return new Blob([buf], { type: 'video/mp4' });
}

function tsToASS(t: number): string {
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60);
  const s = (t % 60).toFixed(2).padStart(5, '0');
  return `${h}:${m.toString().padStart(2, '0')}:${s}`;
}

function generateASS(captions: Caption[], width: number, height: number): string {
  const fontSize = Math.round(height * 0.045);
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Viral,Arial Black,${fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,4,2,2,40,40,${Math.round(height * 0.12)},1
Style: Highlight,Arial Black,${fontSize},&H006F2DFF,&H006F2DFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,4,2,2,40,40,${Math.round(height * 0.12)},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const lines = captions.map((c) => {
    const text = c.words.map((w) => w.highlight ? `{\\rHighlight}${w.word.toUpperCase()}{\\rViral}` : w.word.toUpperCase()).join(' ');
    return `Dialogue: 0,${tsToASS(c.start)},${tsToASS(c.end)},Viral,,0,0,0,,${text}`;
  }).join('\n');
  return header + lines;
}
