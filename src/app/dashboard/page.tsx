'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getDocs, orderBy, query } from 'firebase/firestore';
import { useAuth } from '@/lib/firebase/auth';
import { projectsRef } from '@/lib/firebase/db';
import AppShell from '@/components/layout/AppShell';
import { Plus, Clock, Sparkles, Loader2 } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import type { Project } from '@/types/database';

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const q = query(projectsRef(user.uid), orderBy('updated_at', 'desc'));
        const snap = await getDocs(q);
        setProjects(snap.docs.map((d) => ({ id: d.id, user_id: user.uid, ...(d.data() as Omit<Project, 'id' | 'user_id'>) })));
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">Deine Projekte</h1>
            <p className="text-white/60 mt-1">Verwalte und editiere deine viralen Shortform-Clips.</p>
          </div>
          <Link href="/upload" className="btn-primary"><Plus className="w-4 h-4" /> Neues Projekt</Link>
        </div>

        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
        ) : projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="card p-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent2 grid place-items-center mx-auto mb-4">
        <Sparkles className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-semibold mb-1">Noch keine Projekte</h2>
      <p className="text-white/60 mb-6">Lade dein erstes Video hoch und lass die AI loslegen.</p>
      <Link href="/upload" className="btn-primary inline-flex"><Plus className="w-4 h-4" /> Erstes Projekt erstellen</Link>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const statusColor = ({
    draft: 'text-white/50', processing: 'text-warning', ready: 'text-success',
    exporting: 'text-accent', done: 'text-success',
  } as const)[project.status] ?? 'text-white/50';

  return (
    <Link href={`/editor/${project.id}`} className="card p-4 hover:border-accent/50 transition group">
      <div className="aspect-[9/16] rounded-lg bg-surface2 mb-3 grid place-items-center overflow-hidden">
        <div className="text-white/30 text-xs">No preview</div>
      </div>
      <div className="font-semibold truncate group-hover:text-accent transition">{project.name}</div>
      <div className="flex items-center gap-3 text-xs mt-1">
        <span className={statusColor}>● {project.status}</span>
        {project.duration_seconds && (
          <span className="text-white/40 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatDuration(project.duration_seconds)}
          </span>
        )}
      </div>
    </Link>
  );
}
