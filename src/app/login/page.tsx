'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { signIn, useAuth } from '@/lib/firebase/auth';
import { Scissors } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) router.push('/dashboard'); }, [user, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login fehlgeschlagen.';
      toast.error(msg.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 font-display text-xl font-bold mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent2 grid place-items-center">
            <Scissors className="w-4 h-4" />
          </div>
          ViralCut
        </Link>
        <div className="card p-8">
          <h1 className="text-2xl font-display font-bold mb-1">Willkommen zurück</h1>
          <p className="text-sm text-white/60 mb-6">Melde dich an, um deine Projekte zu öffnen.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="du@example.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Passwort</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Loading…' : 'Login'}</button>
          </form>
          <p className="text-sm text-white/60 text-center mt-6">
            Noch kein Account? <Link href="/signup" className="text-accent hover:underline">Jetzt registrieren</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
