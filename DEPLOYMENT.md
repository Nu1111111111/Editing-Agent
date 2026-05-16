# Deployment Guide — GitHub → Vercel → Supabase

Schritt-für-Schritt Anleitung, um ViralCut live zu bringen.

## 1. Supabase Setup

### 1.1 Projekt erstellen
1. [supabase.com](https://supabase.com) → **New project**
2. Name z.B. `viralcut`, Region wähle eine die nahe an deinen Usern ist (z.B. `eu-central-1`)
3. Datenbank-Passwort: gut wegspeichern

### 1.2 Schema laden
1. Im Supabase-Dashboard → **SQL Editor** → **New query**
2. Inhalt von `supabase/schema.sql` reinkopieren
3. **Run** klicken — sollte ohne Fehler durchlaufen

### 1.3 Storage-Bucket prüfen
- **Storage** → es sollte ein Bucket `media` existieren (wurde vom SQL angelegt)
- File-Size-Limit anpassen falls nötig: **Storage → Configuration → File Upload size** (Default 50 MB → für Videos eher 500 MB+)

### 1.4 Auth konfigurieren
- **Authentication → Providers**: Email reicht für den Start (Default an)
- Optional: Google/Apple Provider hinzufügen
- **Authentication → URL Configuration**:
  - **Site URL**: `http://localhost:3000` für lokal, später deine Vercel-URL
  - **Redirect URLs**: füge sowohl `http://localhost:3000/auth/callback` als auch `https://DEINE-VERCEL-URL.vercel.app/auth/callback` hinzu

### 1.5 API-Keys notieren
- **Settings → API** → kopiere:
  - `Project URL` → wird zu `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` → wird zu `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. Lokal testen

```bash
git clone <dein-repo>
cd Editor\ Agent
npm install
cp .env.example .env.local
# Trage die Supabase-Werte in .env.local ein
npm run dev
```

Öffne <http://localhost:3000>, registriere dich, upload ein kurzes Video → AI sollte starten.

> **Wenn Whisper hängt:** Browser-Console checken. Beim ersten Run lädt der Browser ~150MB. COOP/COEP Header müssen aktiv sein — bei `next dev` werden sie aus `next.config.js` gesetzt.

---

## 3. Auf GitHub pushen

```bash
git init
git add .
git commit -m "Initial commit: ViralCut MVP"
gh repo create viralcut --private --source=. --remote=origin --push
# Oder manuell auf github.com ein leeres Repo anlegen und push
```

---

## 4. Vercel-Deployment

### 4.1 Projekt importieren
1. [vercel.com](https://vercel.com) → **Add New → Project**
2. Wähle dein GitHub-Repo
3. Framework: **Next.js** (wird auto-detected)
4. Build Command: `npm run build` (Default)

### 4.2 Environment Variables
Füge unter **Environment Variables** hinzu:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_APP_URL=https://DEINE-DOMAIN.vercel.app
```

### 4.3 Deploy
Klick **Deploy**. Build dauert ~2 Min. Danach kriegst du eine URL wie `viralcut-abc.vercel.app`.

### 4.4 Supabase Redirect-URL nachpflegen
**Wichtig:** Geh zurück nach Supabase → **Authentication → URL Configuration** und füge `https://DEINE-VERCEL-URL.vercel.app/auth/callback` zu den **Redirect URLs** hinzu. Sonst funktioniert das Login nicht.

---

## 5. Custom Domain (optional)

In Vercel: **Settings → Domains → Add** → folge den DNS-Anweisungen.
In Supabase die `Site URL` und Redirect-URLs entsprechend updaten.

---

## 6. Kosten-Check

| Service | Free Tier | Reicht für… |
|---|---|---|
| **Vercel Hobby** | 100 GB Bandwidth, 100 GB-h Serverless | Hunderte aktive User |
| **Supabase Free** | 500 MB DB, 1 GB Storage, 50k MAU | Erste paar Tausend User |
| **Whisper/MediaPipe/FFmpeg** | – | Läuft im Browser des Users |

**Erwartete Kosten: 0 €/Monat** bis du in die zehntausenden Nutzer kommst.

### Wenn Storage knapp wird
Supabase Pro = 8 $/Monat = 100 GB Storage. Oder du switchst auf **Cloudflare R2** (deutlich günstiger als S3 für Storage):
1. R2-Bucket erstellen
2. Statt `supabase.storage` ein S3-kompatibler Upload via Presigned URL
3. Nur die Metadaten in Supabase behalten

---

## 7. Häufige Probleme

### "SharedArrayBuffer is not defined"
COOP/COEP Header fehlen. Check `next.config.js` — die `headers()` Funktion muss aktiv sein.

### Whisper-Modell lädt nicht
Browser-Cache leeren und neu laden. Bei `403` von HuggingFace: Network-Tab checken, evtl. blockt ein Adblocker `huggingface.co`.

### "Module not found: Can't resolve 'sharp'"
Schon im `next.config.js` mit `resolve.alias = { sharp$: false }` gelöst — sollte nicht passieren. Falls doch: `npm install sharp` als Workaround.

### Vercel Build OOM
Falls der Build auf Vercel Out-of-Memory geht: `NODE_OPTIONS="--max-old-space-size=4096"` als Env-Var setzen.

### Video-Upload schlägt fehl bei großen Dateien
Supabase Free hat 50 MB Default-Upload-Limit. Anheben unter **Storage → Configuration**. Für > 200 MB Videos: Resumable Uploads via `@supabase/storage-js` `uploadResumable()` einbauen.

---

## 8. Next Steps

- B-Roll Auto-Placement aktivieren (`lib/ai/broll-placer.ts` Stub anlegen)
- Speed-Ramps + Punch-Zooms in `ffmpeg/render.ts` ergänzen
- Free-Music-Library via [Pixabay Music API](https://pixabay.com/api/docs/) anbinden
- Optional: Ollama-Sidecar via Cloudflare Tunnel für Premium-User
