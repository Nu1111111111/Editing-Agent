import Link from 'next/link';
import { Scissors, Wand2, Captions, Zap, Sparkles, Upload as UploadIcon } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 lg:px-12 py-5">
        <div className="flex items-center gap-2 font-display text-xl font-bold">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent2 grid place-items-center">
            <Scissors className="w-4 h-4" />
          </div>
          ViralCut
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">Login</Link>
          <Link href="/signup" className="btn-primary">Kostenlos starten</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface2 border border-border text-xs text-white/70 mb-6">
          <Sparkles className="w-3 h-3 text-accent" />
          AI-gestützt · 100% Browser-basiert · 0 € / Monat
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
          Rohmaterial rein.<br />
          <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
            Virale Cuts raus.
          </span>
        </h1>
        <p className="mt-6 text-lg text-white/70 max-w-2xl mx-auto">
          Lade dein Talking-Head-Video hoch — die AI schneidet Filler raus, trackt das Gesicht,
          generiert animierte Captions und rendert ein fertiges 9:16-Reel. Alles im Browser.
          Keine API-Kosten.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link href="/signup" className="btn-primary text-base px-6 py-3">
            <UploadIcon className="w-4 h-4" /> Erstes Video editieren
          </Link>
          <a href="#features" className="btn-secondary text-base px-6 py-3">
            Features ansehen
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-4">
        <FeatureCard
          icon={<Scissors className="w-5 h-5" />}
          title="Auto-Cut"
          text="Entfernt äh, ähm, Pausen, schlechte Takes — automatisch."
        />
        <FeatureCard
          icon={<Captions className="w-5 h-5" />}
          title="Viral Captions"
          text="Wort-für-Wort Animation, Keyword-Highlighting, mobile-first."
        />
        <FeatureCard
          icon={<Wand2 className="w-5 h-5" />}
          title="Face Tracking"
          text="MediaPipe-basiertes Reframing. Gesicht bleibt immer im Fokus."
        />
        <FeatureCard
          icon={<Zap className="w-5 h-5" />}
          title="Punch Zooms"
          text="Algorithmus-optimierte Zooms an emotionalen Peaks."
        />
        <FeatureCard
          icon={<Sparkles className="w-5 h-5" />}
          title="B-Roll Integration"
          text="Intelligente Platzierung von Bildern und Overlays."
        />
        <FeatureCard
          icon={<UploadIcon className="w-5 h-5" />}
          title="One-Click Export"
          text="Reels, TikTok, Shorts — alle Presets ready-to-post."
        />
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="card p-5">
      <div className="w-10 h-10 rounded-lg bg-surface2 grid place-items-center text-accent mb-3">
        {icon}
      </div>
      <div className="font-semibold mb-1">{title}</div>
      <p className="text-sm text-white/60">{text}</p>
    </div>
  );
}
