-- GetGrowth ASO Audit — Initial Schema
-- Run this in your Supabase SQL editor or via supabase db push

-- Users (synced from Clerk via webhook)
create table if not exists users (
  id text primary key,
  email text not null,
  name text,
  plan text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  app_limit int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Saved apps (one row per tracked app per user)
create table if not exists saved_apps (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  store_id text not null,
  platform text not null check (platform in ('ios', 'android')),
  name text not null,
  icon_url text,
  created_at timestamptz not null default now(),
  unique(user_id, store_id, platform)
);

-- Audit history snapshots
create table if not exists audits (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  saved_app_id uuid references saved_apps(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  overall_score int not null,
  category_scores jsonb not null default '{}',
  action_plan jsonb,
  ai_powered boolean not null default false,
  app_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Competitor links
create table if not exists competitors (
  id uuid primary key default gen_random_uuid(),
  saved_app_id uuid not null references saved_apps(id) on delete cascade,
  competitor_store_id text not null,
  competitor_platform text not null check (competitor_platform in ('ios', 'android')),
  competitor_name text not null,
  competitor_icon_url text,
  created_at timestamptz not null default now(),
  unique(saved_app_id, competitor_store_id)
);

-- Indexes
create index if not exists idx_audits_saved_app on audits(saved_app_id, created_at desc);
create index if not exists idx_audits_user on audits(user_id, created_at desc);
create index if not exists idx_saved_apps_user on saved_apps(user_id, created_at desc);
create index if not exists idx_competitors_app on competitors(saved_app_id);

-- RLS Policies
alter table users enable row level security;
alter table saved_apps enable row level security;
alter table audits enable row level security;
alter table competitors enable row level security;

-- Service role bypasses RLS (used by supabaseAdmin in API routes)
-- Anon/authenticated read their own data only
create policy "Users can read own row" on users for select using (auth.uid()::text = id);
create policy "SavedApps: users read own" on saved_apps for select using (auth.uid()::text = user_id);
create policy "Audits: users read own" on audits for select using (auth.uid()::text = user_id);
create policy "Competitors: users read via saved app" on competitors for select
  using (exists (
    select 1 from saved_apps sa where sa.id = saved_app_id and sa.user_id = auth.uid()::text
  ));
