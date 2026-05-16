'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useTimelineStore } from '@/lib/timeline/store';
import { runPipeline, type PipelineProgress } from '@/lib/ai/pipeline';
import AppShell from '@/components/layout/AppShell';
import PreviewPlayer from '@/components/editor/PreviewPlayer';
import Timeline from '@/components/editor/Timeline';
import InspectorPanel from '@/components/editor/InspectorPanel';
import ExportPanel from '@/components/editor/ExportPanel';
import ProcessingOverlay from '@/components/editor/ProcessingOverlay';
import { Loader2, Wand2, Save, Undo2, Redo2 } from 'lucide-react';
import type { Asset, Timeline as TL } from '@/types/database';

export default function EditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const autostart = searchParams.get('autostart') === '1';

  const { timeline, setProject, undo, redo, history, future, setTimeline } = useTimelineStore();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);

  // Load project + assets
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserEmail(user.email);

      const [{ data: project }, { data: assets }, { data: tl }] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('assets').select('*').eq('project_id', projectId),
        supabase.from('timelines').select('*').eq('project_id', projectId).maybeSingle(),
      ]);

      if (!project) { toast.error('Projekt nicht gefunden.'); router.push('/dashboard'); return; }

      // Sign URLs for all assets
      const assetList = (assets ?? []) as Asset[];
      const urls: Record<string, string> = {};
      for (const a of assetList) {
        const { data } = await supabase.storage.from('media').createSignedUrl(a.storage_path, 60 * 60 * 8);
        if (data?.signedUrl) urls[a.id] = data.signedUrl;
      }

      setProject(projectId, tl as TL | null, assetList, urls);
      setLoading(false);

      if (autostart && !tl) {
        const rawAsset = assetList.find((a) => a.kind === 'raw');
        if (!rawAsset) {
          toast.error('Kein Rohvideo gefunden.');
          return;
        }
        // wait a tick so the hidden video element exists
        setTimeout(() => startPipeline(rawAsset, urls[rawAsset.id]), 200);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function startPipeline(rawAsset: Asset, url: string) {
    if (!hiddenVideoRef.current) return;
    const video = hiddenVideoRef.current;
    video.src = url;
    await new Promise<void>((res) => {
      video.onloadedmetadata = () => res();
    });
    const { timeline: newTl } = await runPipeline(rawAsset, url, video, (p) => setProgress(p));
    if (newTl) {
      // Reload everything (cheap path)
      window.history.replaceState(null, '', `/editor/${projectId}`);
      window.location.reload();
    }
  }

  async function saveTimeline() {
    if (!timeline) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('timelines')
      .update({
        clips: timeline.clips,
        captions: timeline.captions,
        audio: timeline.audio,
        style: timeline.style,
        version: timeline.version,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId);
    if (error) toast.error('Speichern fehlgeschlagen.');
    else toast.success('Gespeichert.');
  }

  // Re-run pipeline button
  async function regenerate() {
    const supabase = createClient();
    const { data: assets } = await supabase.from('assets').select('*').eq('project_id', projectId);
    const rawAsset = (assets ?? []).find((a) => a.kind === 'raw');
    if (!rawAsset) { toast.error('Kein Rohvideo.'); return; }
    const { data } = await supabase.storage.from('media').createSignedUrl(rawAsset.storage_path, 3600);
    if (data?.signedUrl) startPipeline(rawAsset as Asset, data.signedUrl);
  }

  if (loading) {
    return (
      <AppShell userEmail={userEmail}>
        <div className="grid place-items-center h-screen">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell userEmail={userEmail}>
      <div className="relative h-screen flex flex-col">
        {/* hidden video element for tracking + pipeline use */}
        <video ref={hiddenVideoRef} className="hidden" crossOrigin="anonymous" />

        {/* Topbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface">
          <div className="text-sm font-medium">Editor</div>
          <div className="flex items-center gap-2">
            <button onClick={undo} disabled={history.length === 0} className="btn-ghost p-2" title="Undo">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={redo} disabled={future.length === 0} className="btn-ghost p-2" title="Redo">
              <Redo2 className="w-4 h-4" />
            </button>
            <button onClick={regenerate} className="btn-secondary text-xs"><Wand2 className="w-3.5 h-3.5" /> AI neu</button>
            <button onClick={saveTimeline} className="btn-primary text-xs"><Save className="w-3.5 h-3.5" /> Speichern</button>
          </div>
        </div>

        {/* Main area */}
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 grid place-items-center p-4 overflow-auto">
            <PreviewPlayer />
          </div>
          <div className="w-72 border-l border-border bg-surface overflow-y-auto">
            <InspectorPanel />
            <div className="border-t border-border" />
            <ExportPanel />
          </div>
        </div>

        {/* Timeline */}
        <Timeline />

        <ProcessingOverlay progress={progress} />
      </div>
    </AppShell>
  );
}
