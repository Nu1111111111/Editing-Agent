import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/layout/AppShell';
import { Plus, Clock, Sparkles } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import type { Project } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  const list = (projects ?? []) as Project[];

  return (
    <AppShell userEmail={user.email}>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">Deine Projekte</h1>
            <p className="text-white/60 mt-1">Verwalte und editiere deine viralen Shortform-Clips.</p>
          </div>
          <Link href="/upload" className="btn-primary">
            <Plus className="w-4 h-4" /> Neues Projekt
          </Link>
        </div>

        {list.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
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
      <Link href="/upload" className="btn-primary inline-flex">
        <Plus className="w-4 h-4" /> Erstes Projekt erstellen
      </Link>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const statusColor = {
    draft: 'text-white/50',
    processing: 'text-warning',
    ready: 'text-success',
    exporting: 'text-accent',
    done: 'text-success',
  }[project.status] ?? 'text-white/50';

  return (
    <Link href={`/editor/${project.id}`} className="card p-4 hover:border-accent/50 transition group">
      <div className="aspect-[9/16] rounded-lg bg-surface2 mb-3 grid place-items-center overflow-hidden">
        {project.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.thumbnail_url} alt={project.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-white/30 text-xs">No preview</div>
        )}
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
