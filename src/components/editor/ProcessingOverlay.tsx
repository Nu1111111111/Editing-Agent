'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import type { PipelineProgress } from '@/lib/ai/pipeline';

const STAGE_LABELS: Record<PipelineProgress['stage'], string> = {
  idle: 'Bereit',
  audio: 'Audio extrahieren',
  transcribe: 'Whisper Transkription',
  analyze: 'Viral-Analyse',
  autocut: 'Auto-Cut',
  face: 'Face Tracking',
  captions: 'Captions',
  save: 'Speichern',
  done: 'Fertig',
  error: 'Fehler',
};

export default function ProcessingOverlay({ progress }: { progress: PipelineProgress | null }) {
  if (!progress || progress.stage === 'done' || progress.stage === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm grid place-items-center"
      >
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent to-accent2 grid place-items-center">
            {progress.stage === 'error' ? (
              <span className="text-2xl">!</span>
            ) : (
              <Sparkles className="w-6 h-6" />
            )}
          </div>
          <div className="text-xl font-display font-bold mb-1">{STAGE_LABELS[progress.stage]}</div>
          <div className="text-sm text-white/60 mb-6">{progress.message}</div>

          <div className="h-2 bg-surface2 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-accent to-accent2"
              animate={{ width: `${Math.round(progress.overall * 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="text-xs text-white/50 mt-2 flex items-center justify-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            {Math.round(progress.overall * 100)}%
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
