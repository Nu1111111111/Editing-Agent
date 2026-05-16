export type ProjectStatus = 'draft' | 'processing' | 'ready' | 'exporting' | 'done';
export type AssetKind = 'raw' | 'broll' | 'image' | 'reference' | 'sfx' | 'music';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  status: ProjectStatus;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  aspect_ratio: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  project_id: string;
  kind: AssetKind;
  storage_path: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  speaker?: string;
  emotion?: 'neutral' | 'excited' | 'serious' | 'angry' | 'sad' | 'happy';
  viral_score?: number; // 0–1
  is_filler?: boolean;
}

export interface Transcript {
  id: string;
  asset_id: string;
  language: string | null;
  full_text: string | null;
  words: TranscriptWord[];
  segments: TranscriptSegment[];
  created_at: string;
}

export interface Clip {
  id: string;
  source_asset_id: string;
  in_seconds: number;
  out_seconds: number;
  track: number; // 0 = main, 1+ = B-roll overlays
  effects: Effect[];
  reframe?: ReframeKeyframes;
  captions_enabled: boolean;
  speed?: number; // 1.0 default
  volume?: number; // 0..1
}

export interface Effect {
  type: 'zoom' | 'punch' | 'shake' | 'speed_ramp' | 'transition';
  start: number; // relative to clip
  end: number;
  params: Record<string, number | string>;
}

export interface ReframeKeyframes {
  keyframes: Array<{
    t: number; // seconds within clip
    cx: number; // crop center x (0..1)
    cy: number;
    scale: number; // 1 = no zoom
  }>;
}

export interface Caption {
  id: string;
  text: string;
  words: Array<{ word: string; start: number; end: number; highlight?: boolean }>;
  start: number;
  end: number;
  style: string; // preset name
  position: 'bottom' | 'center' | 'top';
}

export interface Timeline {
  id: string;
  project_id: string;
  clips: Clip[];
  captions: Caption[];
  audio: {
    music_asset_id?: string;
    music_volume?: number;
    sfx?: Array<{ asset_id: string; start: number; volume: number }>;
    voice_volume?: number;
  };
  style: {
    caption_preset?: string;
    color_grade?: string;
  };
  version: number;
  updated_at: string;
}
