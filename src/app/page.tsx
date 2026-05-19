'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { setDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/firebase/auth';
import { projectRef, assetRef } from '@/lib/firebase/db';
import { uploadFile, buildStoragePath } from '@/lib/firebase/storage';
import AppShell from '@/components/layout/AppShell';
import { Upload, Film, Image as ImgIcon, Music, FileVideo, X, Loader2 } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import { cn, formatBytes } from '@/lib/utils';
import type { AssetKind } from '@/types/database';

interface PendingFile {
  id: string; file: File; kind: AssetKind; progress: number; done: boolean; error?: string;
}

const KIND_LABELS: Record<AssetKind, string> = {
  raw: 'Rohvideo', broll: 'B-Roll', image: 'Bild', reference: 'Referenz', sfx: 'Soundeffekt', music: 'Musik',
};
const KIND_ICONS: Record<AssetKind, typeof Film> = {
  raw: Film, broll: FileVideo, image: ImgIcon, reference: Film, sfx: Music, music: Music,
};
function inferKind(file: File): AssetKind {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'music';
  return 'raw';
}

export default function UploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projectName, setProjectName] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [creating, setCreating] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted.map((file) => ({ id: uuid(), file, kind: inferKind(file), progress: 0, done: false }))]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'video/*': [], 'image/*': [], 'audio/*': [] },
  });

  function removeFile(id: string) { setFiles((prev) => prev.filter((f) => f.id !== id)); }
  function setKind(id: string, kind: AssetKind) { setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, kind } : f))); }

  async function startProcessing() {
    if (!user) { toast.error('Nicht eingeloggt.'); return; }
    if (!projectName.trim()) { toast.error('Bitte gib einen Projektnamen ein.'); return; }
    if (!files.some((f) => f.kind === 'raw')) { toast.error('Du brauchst mindestens ein Rohvideo.'); return; }

    setCreating(true);
    const projectId = uuid();
    const now = new Date().toISOString();
    try {
      await setDoc(projectRef(user.uid, projectId), {
        name: projectName.trim(),
        status: 'draft',
        thumbnail_url: null,
        duration_seconds: null,
        aspect_ratio: '9:16',
        created_at: now,
        updated_at: now,
      });

      for (const f of files) {
        const ext = f.file.name.split('.').pop() ?? 'bin';
        const path = buildStoragePath(user.uid, projectId, f.id, ext);
        try {
          await uploadFile(path, f.file);
          await setDoc(assetRef(user.uid, projectId, f.id), {
            kind: f.kind,
            storage_path: path,
            filename: f.file.name,
            mime_type: f.file.type,
            size_bytes: f.file.size,
            duration_seconds: null,
            width: null,
            height: null,
            metadata: {},
            created_at: now,
          });
          setFiles((prev) => prev.map((x) => (x.id === f.id ? { ...x, progress: 100, done: true } : x)));
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Upload-Fehler';
          setFiles((prev) => prev.map((x) => (x.id === f.id ? { ...x, error: msg } : x)));
        }
      }

      toast.success('Upload abgeschlossen — AI startet.');
      router.push(`/editor/${projectId}?autostart=1`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Projekt konnte nicht erstellt werden.');
      setCreating(false);
    }
  }

  return (
    <AppShell>
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-display font-bold mb-2">Neues Projekt</h1>
        <p className="text-white/60 mb-8">Lade Rohvideos, B-Roll, Bilder und Referenzen hoch.</p>

        <div className="card p-6 mb-6">
          <label className="block text-sm font-medium mb-1.5">Projektname</label>
          <input className="input" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="z.B. Kunde X — Reel #4" />
        </div>

        <div {...getRootProps()}
          className={cn('card p-12 border-2 border-dashed transition cursor-pointer text-center',
            isDragActive ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50')}>
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 mx-auto mb-3 text-white/40" />
          <p className="font-medium mb-1">Drag &amp; Drop oder Klicken zum Hochladen</p>
          <p className="text-sm text-white/60">Videos, Bilder, Audio — alles auf einmal</p>
        </div>

        {files.length > 0 && (
          <div className="mt-6 card p-4">
            <div className="text-sm font-medium mb-3">{files.length} Datei{files.length === 1 ? '' : 'en'}</div>
            <div className="space-y-2">
              {files.map((f) => {
                const Icon = KIND_ICONS[f.kind];
                return (
                  <div key={f.id} className="flex items-center gap-3 p-3 bg-surface2 rounded-lg">
                    <Icon className="w-5 h-5 shrink-0 text-white/60" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{f.file.name}</div>
                      <div className="text-xs text-white/40">{formatBytes(f.file.size)}</div>
                    </div>
                    <select value={f.kind} onChange={(e) => setKind(f.id, e.target.value as AssetKind)} disabled={creating}
                      className="text-xs bg-background border border-border rounded px-2 py-1">
                      {(Object.keys(KIND_LABELS) as AssetKind[]).map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
                    </select>
                    {f.done ? <span className="text-xs text-success">✓</span>
                    : f.error ? <span className="text-xs text-accent" title={f.error}>!</span>
                    : creating ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <button onClick={() => removeFile(f.id)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>}
                  </div>
                );
              })}
            </div>
            <button onClick={startProcessing} disabled={creating} className="btn-primary w-full mt-4">
              {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Lade hoch…</> : <>AI starten →</>}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
