# ViralCut — AI Viral Shortform Editor

Browser-basierter AI-Video-Editor für virale Reels, TikToks und YouTube Shorts.
Auto-Cut, animierte Captions, Face-Tracking, 9:16-Reframing — **alles im Browser**, **0 € / Monat**.

## Features

- **Drag-&-Drop Upload** für Rohvideos, B-Roll, Bilder, Referenzen
- **Whisper-Transkription im Browser** (`@xenova/transformers`, kein API-Cost)
- **Auto-Cut**: entfernt Filler-Wörter (`äh`, `ähm`, `also`, …) + tote Pausen
- **Viral-Analyzer**: scored Segmente nach Hook-Potenzial, sortiert für stärkste Eröffnung um
- **Animierte Captions** (Wort-für-Wort, Keyword-Highlighting, 3 Presets)
- **Face Tracking** via MediaPipe → automatisches 9:16 Reframing mit Zoom-Keyframes
- **Timeline-Editor** (CapCut-Style): Trimmen, Captions editieren, Caption-Stil wechseln, Undo/Redo
- **Export** via `ffmpeg.wasm` als MP4 H.264 → direkt postbar auf Reels / TikTok / Shorts

## Stack

| Layer | Tool | Hosted on |
|---|---|---|
| Frontend | Next.js 14 + TailwindCSS + Framer Motion | **Vercel** (free) |
| Auth + DB + Storage | Supabase | **Supabase** (free tier) |
| Transcription | `@xenova/transformers` (Whisper-base WASM) | Client-side |
| Face Detection | `@mediapipe/tasks-vision` (WebGPU) | Client-side |
| Video Render | `@ffmpeg/ffmpeg` (WASM) | Client-side |

Keine externen AI-APIs. Keine Worker-Server. Vercel-Hobby + Supabase-Free reichen für hunderte User.

---

## Setup (5 Minuten)

### 1. Supabase Projekt anlegen

1. Geh auf [supabase.com](https://supabase.com), erstelle ein neues Projekt.
2. Notiere dir: `Project URL` und `anon public key` (Settings → API).
3. Öffne den **SQL Editor**, kopiere den Inhalt von `supabase/schema.sql` rein und führe es aus.
   Das legt alle Tabellen, Policies und den `media` Storage-Bucket an.

### 2. Lokal starten

```bash
npm install
cp .env.example .env.local
# .env.local bearbeiten:
#   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ…
npm run dev
```

Öffne <http://localhost:3000>.

### 3. Deployment auf Vercel

```bash
# In ein GitHub-Repo pushen, dann:
```

1. Geh auf [vercel.com](https://vercel.com) → **New Project** → wähle dein GitHub-Repo.
2. Setze die Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (= deine Vercel-Domain)
3. Deploy.

In Supabase unter **Authentication → URL Configuration** musst du noch deine Vercel-Domain bei `Site URL` und `Redirect URLs` eintragen.

---

## Wichtige Hinweise

### COOP/COEP Header
Whisper, MediaPipe und ffmpeg.wasm brauchen `Cross-Origin-Opener-Policy: same-origin` und `Cross-Origin-Embedder-Policy: require-corp`. Das ist in `next.config.js` schon konfiguriert. **Vercel respektiert diese Header out-of-the-box.**

### Modell-Downloads
Beim ersten Run lädt der Browser einmal die Whisper- und MediaPipe-Modelle (~150–200 MB). Werden danach im Browser-Cache gehalten.

### Performance
- **Whisper**: ~0.3× Realtime auf modernem MacBook M1 mit WebGPU
- **Face tracking**: ~30 FPS mit GPU-Delegate
- **ffmpeg.wasm**: ~0.5–1× Realtime für H.264 Encoding

Faustregel: 60-Sek-Rohvideo → ca. 2–4 Min komplette Verarbeitung.

### Mobile Browser
Funktioniert auf iOS Safari 16.4+ und Chrome Android, aber langsamer. Empfehlung: Desktop.

---

## Projektstruktur

```
src/
  app/
    page.tsx              Landing
    login/, signup/       Auth-Flow
    auth/callback/        OAuth-Callback
    dashboard/            Projektliste
    upload/               Upload + neues Projekt
    editor/[projectId]/   Editor mit Timeline
  components/
    captions/CaptionRenderer.tsx
    editor/
      PreviewPlayer.tsx
      Timeline.tsx
      InspectorPanel.tsx
      ExportPanel.tsx
      ProcessingOverlay.tsx
    layout/AppShell.tsx
  lib/
    ai/
      whisper.ts          Browser-Whisper
      face-tracking.ts    MediaPipe
      auto-cutter.ts      Filler/Pause-Detection
      viral-analyzer.ts   Heuristisches Scoring
      captions.ts         Caption-Generation
      pipeline.ts         Orchestrator
    ffmpeg/
      client.ts           ffmpeg.wasm Loader
      render.ts           Export-Pipeline
    timeline/store.ts     Zustand State
    supabase/             Client/Server/Middleware
    utils.ts
  types/database.ts
supabase/schema.sql
```

---

## Roadmap

Was im MVP bereits funktioniert ist markiert mit ✓.

- [x] Auth + Multi-Projekt
- [x] Multi-File Upload
- [x] Whisper im Browser
- [x] Auto-Cut Filler + Pausen
- [x] Viral-Scoring + Hook-Reorder
- [x] Face Tracking + Reframe
- [x] Caption-Generation mit Highlighting
- [x] Timeline-Editor (Trim, Select, Caption-Edit, Undo/Redo)
- [x] Export MP4 9:16 via ffmpeg.wasm
- [ ] B-Roll Auto-Placement (Modul-Stub vorhanden, kein UI)
- [ ] Speed Ramps + Punch-Zoom-Effekte (Effekt-Schema steht)
- [ ] Music + SFX-Spur
- [ ] Reference-Video Style-Transfer
- [ ] Background Music aus Public-Domain-Library
- [ ] Ollama-Integration für besseres Hook-Rewriting (optional)

## Lizenz

MIT — bau drauf was du willst.
