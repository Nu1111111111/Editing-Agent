-- Viral Shortform Editor — Supabase Schema
-- Run this in the Supabase SQL editor after creating a new project.

-- =====================================================================
-- PROJECTS
-- =====================================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'draft', -- draft | processing | ready | exporting | done
  thumbnail_url text,
  duration_seconds numeric,
  aspect_ratio text default '9:16',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);

-- =====================================================================
-- MEDIA ASSETS (raw videos, B-roll, images, references)
-- =====================================================================
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null, -- 'raw' | 'broll' | 'image' | 'reference' | 'sfx' | 'music'
  storage_path text not null, -- path in supabase storage
  filename text not null,
  mime_type text,
  size_bytes bigint,
  duration_seconds numeric,
  width integer,
  height integer,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists assets_project_id_idx on public.assets(project_id);

-- =====================================================================
-- TRANSCRIPTS (Whisper output, word-level)
-- =====================================================================
create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  language text,
  full_text text,
  -- words: [{ word, start, end, confidence }]
  words jsonb default '[]'::jsonb,
  -- segments: [{ text, start, end, speaker?, emotion?, viral_score? }]
  segments jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists transcripts_asset_id_idx on public.transcripts(asset_id);

-- =====================================================================
-- TIMELINE (the edit decision list)
-- =====================================================================
create table if not exists public.timelines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  -- clips: ordered array of clip objects
  -- { id, source_asset_id, in_seconds, out_seconds, track, effects: [], reframe: {}, captions_enabled }
  clips jsonb not null default '[]'::jsonb,
  -- captions: array of word/segment caption objects
  captions jsonb not null default '[]'::jsonb,
  -- audio: { music_asset_id?, sfx: [{ asset_id, start, volume }], voice_volume }
  audio jsonb not null default '{}'::jsonb,
  -- style: caption style preset, color grade, etc.
  style jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create unique index if not exists timelines_project_id_unique on public.timelines(project_id);

-- =====================================================================
-- EXPORTS
-- =====================================================================
create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  preset text not null, -- 'reels' | 'tiktok' | 'shorts' | 'custom'
  status text not null default 'pending', -- pending | rendering | done | failed
  progress numeric default 0,
  output_path text,
  error text,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.projects enable row level security;
alter table public.assets enable row level security;
alter table public.transcripts enable row level security;
alter table public.timelines enable row level security;
alter table public.exports enable row level security;

-- Projects: only owner
drop policy if exists "projects_owner_all" on public.projects;
create policy "projects_owner_all" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Assets: via project ownership
drop policy if exists "assets_via_project" on public.assets;
create policy "assets_via_project" on public.assets
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- Transcripts: via asset → project
drop policy if exists "transcripts_via_asset" on public.transcripts;
create policy "transcripts_via_asset" on public.transcripts
  for all using (
    exists (
      select 1 from public.assets a
      join public.projects p on p.id = a.project_id
      where a.id = asset_id and p.user_id = auth.uid()
    )
  );

-- Timelines: via project
drop policy if exists "timelines_via_project" on public.timelines;
create policy "timelines_via_project" on public.timelines
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- Exports
drop policy if exists "exports_owner_all" on public.exports;
create policy "exports_owner_all" on public.exports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- STORAGE BUCKET (run in Supabase Dashboard or via SQL)
-- =====================================================================
-- Manually create a bucket called 'media' in Storage with these policies:
--   SELECT: auth.uid() = (storage.foldername(name))[1]::uuid
--   INSERT: auth.uid() = (storage.foldername(name))[1]::uuid
-- This stores assets under {user_id}/{project_id}/{asset_id}.{ext}

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

drop policy if exists "media_owner_select" on storage.objects;
create policy "media_owner_select" on storage.objects
  for select using (
    bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "media_owner_insert" on storage.objects;
create policy "media_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "media_owner_delete" on storage.objects;
create policy "media_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]
  );
