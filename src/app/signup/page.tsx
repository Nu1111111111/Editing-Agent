'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { signUp, useAuth } from '@/lib/firebase/auth';
import { Scissors } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) router.push('/dashboard'); }, [user, router]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(email, password);
      toast.success('Account erstellt!');
      router.push('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registrierung fehlgeschlagen.';
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
          <h1 className="text-2xl font-display font-bold mb-1">Account erstellen</h1>
          <p className="text-sm text-white/60 mb-6">Kostenlos · Keine Kreditkarte nötig.</p>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="du@example.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Passwort</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              <p className="text-xs text-white/40 mt-1">Mindestens 6 Zeichen.</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Loading…' : 'Account erstellen'}</button>
          </form>
          <p className="text-sm text-white/60 text-center mt-6">
            Schon Account? <Link href="/login" className="text-accent hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
