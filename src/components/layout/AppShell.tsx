'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Scissors, LayoutDashboard, Upload, LogOut, Loader2 } from 'lucide-react';
import { useAuth, logout } from '@/lib/firebase/auth';
import { cn } from '@/lib/utils';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="grid place-items-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  const nav = [
    { href: '/dashboard', label: 'Projekte', icon: LayoutDashboard },
    { href: '/upload', label: 'Neues Projekt', icon: Upload },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="p-5">
          <Link href="/dashboard" className="flex items-center gap-2 font-display font-bold">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent2 grid place-items-center">
              <Scissors className="w-3.5 h-3.5" />
            </div>
            ViralCut
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href}
                className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition',
                  active ? 'bg-surface2 text-white' : 'text-white/60 hover:text-white hover:bg-surface2/50')}>
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="text-xs text-white/40 px-3 mb-2 truncate">{user.email}</div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-surface2 transition">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
