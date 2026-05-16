'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Scissors, LayoutDashboard, Upload, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export default function AppShell({ children, userEmail }: { children: React.ReactNode; userEmail?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
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
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition',
                  active ? 'bg-surface2 text-white' : 'text-white/60 hover:text-white hover:bg-surface2/50'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="text-xs text-white/40 px-3 mb-2 truncate">{userEmail}</div>
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-surface2 transition">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
