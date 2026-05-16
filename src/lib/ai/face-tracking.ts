'use client';

/**
 * Face detection & tracking using MediaPipe Tasks Vision (WebAssembly).
 * Output is fed into the reframing pipeline so the speaker's face stays
 * in the 9:16 safe zone, with smart zoom/pan animations.
 *
 * Runs 100% in-browser. No API costs.
 */

import type { ReframeKeyframes } from '@/types/database';

type Detector = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number
  ) => { detections: Array<{ boundingBox?: { originX: number; originY: number; width: number; height: number } }> };
  close: () => void;
};

let detectorPromise: Promise<Detector> | null = null;

export async function getFaceDetector(): Promise<Detector> {
  if (detectorPromise) return detectorPromise;
  detectorPromise = (async () => {
    const vision = await import('@mediapipe/tasks-vision');
    const filesetResolver = await vision.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );
    const detector = await vision.FaceDetector.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
    });
    return detector as unknown as Detector;
  })();
  return detectorPromise;
}

export interface FaceFrame {
  t: number;             // seconds
  cx: number;            // normalized 0..1
  cy: number;
  width: number;
  height: number;
  confidence: number;
}

/**
 * Samples the video at the given FPS and returns face center over time.
 * Defaults: sample every 4 frames at 30fps source = ~7.5 detections/sec.
 */
export async function trackFaces(
  video: HTMLVideoElement,
  options: { fps?: number; onProgress?: (p: number) => void } = {}
): Promise<FaceFrame[]> {
  const detector = await getFaceDetector();
  const fps = options.fps ?? 8;
  const dur = video.duration;
  const step = 1 / fps;
  const frames: FaceFrame[] = [];

  for (let t = 0; t < dur; t += step) {
    video.currentTime = t;
    await waitForSeek(video);
    const { detections } = detector.detectForVideo(video, t * 1000);
    if (detections.length > 0) {
      const d = detections[0];
      const bb = d.boundingBox;
      if (bb) {
        const w = video.videoWidth || 1;
        const h = video.videoHeight || 1;
        frames.push({
          t,
          cx: (bb.originX + bb.width / 2) / w,
          cy: (bb.originY + bb.height / 2) / h,
          width: bb.width / w,
          height: bb.height / h,
          confidence: 1,
        });
      }
    }
    options.onProgress?.(t / dur);
  }
  return frames;
}

function waitForSeek(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      video.removeEventListener('seeked', handler);
      resolve();
    };
    video.addEventListener('seeked', handler);
  });
}

/**
 * Smooths a noisy face track and converts to reframe keyframes
 * for 9:16 vertical output.
 */
export function framesToReframe(frames: FaceFrame[]): ReframeKeyframes {
  if (frames.length === 0) {
    return { keyframes: [{ t: 0, cx: 0.5, cy: 0.5, scale: 1 }] };
  }

  // Exponential moving average to smooth jitter
  const smoothed: FaceFrame[] = [];
  const alpha = 0.3;
  let smCx = frames[0].cx;
  let smCy = frames[0].cy;
  for (const f of frames) {
    smCx = alpha * f.cx + (1 - alpha) * smCx;
    smCy = alpha * f.cy + (1 - alpha) * smCy;
    smoothed.push({ ...f, cx: smCx, cy: smCy });
  }

  // Downsample to ~1 keyframe per 0.5s, scale based on face size
  const keyframes: ReframeKeyframes['keyframes'] = [];
  const targetGap = 0.5;
  let lastT = -Infinity;
  for (const f of smoothed) {
    if (f.t - lastT < targetGap) continue;
    // Target scale: keep face ~25-35% of frame height for vertical
    const targetFaceHeight = 0.3;
    const scale = Math.max(1, Math.min(2.2, targetFaceHeight / Math.max(0.1, f.height)));
    keyframes.push({ t: f.t, cx: f.cx, cy: f.cy, scale });
    lastT = f.t;
  }
  return { keyframes };
}
