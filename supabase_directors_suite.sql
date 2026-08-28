-- ─── Director's Suite Storage Tables ─────────────────────────────────────────
-- Run this in your Supabase SQL Editor (project → SQL Editor → New Query)

-- 1. Canvas state (viewport, edges, drawing strokes) — one row per script per user
create table if not exists public.canvas_state (
  id          uuid primary key default gen_random_uuid(),
  script_id   uuid not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  edges       jsonb not null default '[]'::jsonb,
  viewport    jsonb not null default '{}'::jsonb,
  drawing_strokes jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (script_id, user_id)
);

-- 2. Workspace assets (individual nodes on the canvas)
create table if not exists public.workspace_assets (
  id          uuid primary key default gen_random_uuid(),
  script_id   uuid not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  asset_id    text not null default '',
  asset_type  text not null default 'idea',
  x           float8 not null default 0,
  y           float8 not null default 0,
  width       float8 not null default 240,
  height      float8 not null default 180,
  z_index     int not null default 0,
  content     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (script_id, asset_id)
);

-- 3. Enable Row Level Security
alter table public.canvas_state enable row level security;
alter table public.workspace_assets enable row level security;

-- 4. RLS Policies — users can only access their own rows
DROP POLICY IF EXISTS "Users own canvas_state" ON public.canvas_state;
create policy "Users own canvas_state"
  on public.canvas_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own workspace_assets" ON public.workspace_assets;
create policy "Users own workspace_assets"
  on public.workspace_assets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Auto-update updated_at on any change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

DROP TRIGGER IF EXISTS canvas_state_updated_at ON public.canvas_state;
create trigger canvas_state_updated_at
  before update on public.canvas_state
  for each row execute function public.set_updated_at();

DROP TRIGGER IF EXISTS workspace_assets_updated_at ON public.workspace_assets;
create trigger workspace_assets_updated_at
  before update on public.workspace_assets
  for each row execute function public.set_updated_at();

-- ─── Storyboard Tables ────────────────────────────────────────────────────────

create table if not exists public.storyboards (
  id           uuid primary key default gen_random_uuid(),
  script_id    uuid not null,
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null default '',
  aspect_ratio text not null default '1.78:1',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (script_id, user_id)
);

create table if not exists public.scene_cards (
  id               uuid primary key default gen_random_uuid(),
  storyboard_id    uuid not null references public.storyboards(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  "order"          int not null default 0,
  shot_number      text not null default '',
  scene_heading    text not null default '',
  shot_type        text not null default 'MS',
  camera_movement  text not null default 'static',
  lens             text not null default '',
  technical_notes  text not null default '',
  image_url        text not null default '',
  x                float8 not null default 0,
  y                float8 not null default 0,
  width            float8 not null default 320,
  height           float8 not null default 500,
  aspect_ratio     text not null default '1.78:1',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.storyboards enable row level security;
alter table public.scene_cards enable row level security;

DROP POLICY IF EXISTS "Users own storyboards" ON public.storyboards;
create policy "Users own storyboards"
  on public.storyboards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own scene_cards" ON public.scene_cards;
create policy "Users own scene_cards"
  on public.scene_cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

DROP TRIGGER IF EXISTS storyboards_updated_at ON public.storyboards;
create trigger storyboards_updated_at
  before update on public.storyboards
  for each row execute function public.set_updated_at();

DROP TRIGGER IF EXISTS scene_cards_updated_at ON public.scene_cards;
create trigger scene_cards_updated_at
  before update on public.scene_cards
  for each row execute function public.set_updated_at();
