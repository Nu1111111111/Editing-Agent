'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/firebase/auth';
import { projectRef, assetsRef, timelineRef } from '@/lib/firebase/db';
import { getAssetUrl } from '@/lib/firebase/storage';
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
  const { user } = useAuth();

  const { timeline, setProject, undo, redo, history, future, setTimeline } = useTimelineStore();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const projectSnap = await getDoc(projectRef(user.uid, projectId));
        if (!projectSnap.exists()) {
          toast.error('Projekt nicht gefunden.');
          router.push('/dashboard');
          return;
        }
        const [assetsSnap, tlSnap] = await Promise.all([
          getDocs(assetsRef(user.uid, projectId)),
          getDoc(timelineRef(user.uid, projectId)),
        ]);

        const assetList: Asset[] = assetsSnap.docs.map((d) => ({
          id: d.id, project_id: projectId, ...(d.data() as Omit<Asset, 'id' | 'project_id'>),
        }));

        const urls: Record<string, string> = {};
        for (const a of assetList) {
          try { urls[a.id] = await getAssetUrl(a.storage_path); } catch {}
        }

        const tlData = tlSnap.exists()
          ? ({ id: 'main', project_id: projectId, ...(tlSnap.data() as Omit<TL, 'id' | 'project_id'>) })
          : null;

        setProject(projectId, tlData, assetList, urls);
        setLoading(false);

        if (autostart && !tlData) {
          const rawAsset = assetList.find((a) => a.kind === 'raw');
          if (!rawAsset) { toast.error('Kein Rohvideo gefunden.'); return; }
          setTimeout(() => startPipeline(rawAsset, urls[rawAsset.id]), 200);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Konnte Projekt nicht laden.');
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user]);

  async function startPipeline(rawAsset: Asset, url: string) {
    if (!hiddenVideoRef.current || !user) return;
    const video = hiddenVideoRef.current;
    video.src = url;
    await new Promise<void>((res) => { video.onloadedmetadata = () => res(); });
    const { timeline: newTl } = await runPipeline(user.uid, rawAsset, url, video, (p) => setProgress(p));
    if (newTl) {
      window.history.replaceState(null, '', `/editor/${projectId}`);
      window.location.reload();
    }
  }

  async function saveTimeline() {
    if (!timeline || !user) return;
    try {
      await updateDoc(timelineRef(user.uid, projectId), {
        clips: timeline.clips,
        captions: timeline.captions,
        audio: timeline.audio,
        style: timeline.style,
        version: timeline.version,
        updated_at: new Date().toISOString(),
      });
      toast.success('Gespeichert.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    }
  }

  async function regenerate() {
    if (!user) return;
    const assetsSnap = await getDocs(assetsRef(user.uid, projectId));
    const rawDoc = assetsSnap.docs.find((d) => d.data().kind === 'raw');
    if (!rawDoc) { toast.error('Kein Rohvideo.'); return; }
    const rawAsset: Asset = { id: rawDoc.id, project_id: projectId, ...(rawDoc.data() as Omit<Asset, 'id' | 'project_id'>) };
    const url = await getAssetUrl(rawAsset.storage_path);
    startPipeline(rawAsset, url);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="grid place-items-center h-screen"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="relative h-screen flex flex-col">
        <video ref={hiddenVideoRef} className="hidden" crossOrigin="anonymous" />
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface">
          <div className="text-sm font-medium">Editor</div>
          <div className="flex items-center gap-2">
            <button onClick={undo} disabled={history.length === 0} className="btn-ghost p-2" title="Undo"><Undo2 className="w-4 h-4" /></button>
            <button onClick={redo} disabled={future.length === 0} className="btn-ghost p-2" title="Redo"><Redo2 className="w-4 h-4" /></button>
            <button onClick={regenerate} className="btn-secondary text-xs"><Wand2 className="w-3.5 h-3.5" /> AI neu</button>
            <button onClick={saveTimeline} className="btn-primary text-xs"><Save className="w-3.5 h-3.5" /> Speichern</button>
          </div>
        </div>
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 grid place-items-center p-4 overflow-auto"><PreviewPlayer /></div>
          <div className="w-72 border-l border-border bg-surface overflow-y-auto">
            <InspectorPanel />
            <div className="border-t border-border" />
            <ExportPanel />
          </div>
        </div>
        <Timeline />
        <ProcessingOverlay progress={progress} />
      </div>
    </AppShell>
  );
}
