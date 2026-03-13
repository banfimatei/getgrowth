-- ============================================================
-- GetGrowth ASO Audit — Supabase Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- ============================================================

-- Users (synced from Clerk via webhook)
create table if not exists users (
  id text primary key,
  email text not null,
  name text,
  plan text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  app_limit int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Saved apps (tracked apps per user)
create table if not exists saved_apps (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  store_id text not null,
  platform text not null check (platform in ('ios', 'android')),
  name text not null,
  icon_url text,
  created_at timestamptz default now(),
  unique(user_id, store_id, platform)
);

-- Audit history
create table if not exists audits (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  saved_app_id uuid references saved_apps(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  overall_score int not null,
  category_scores jsonb not null default '{}',
  action_plan jsonb,
  ai_powered boolean default false,
  app_data jsonb not null default '{}',
  created_at timestamptz default now()
);

-- Competitor links
create table if not exists competitors (
  id uuid primary key default gen_random_uuid(),
  saved_app_id uuid references saved_apps(id) on delete cascade,
  competitor_store_id text not null,
  competitor_platform text not null check (competitor_platform in ('ios', 'android')),
  competitor_name text not null,
  competitor_icon_url text,
  created_at timestamptz default now(),
  unique(saved_app_id, competitor_store_id)
);

-- Indexes
create index if not exists idx_audits_saved_app on audits(saved_app_id, created_at desc);
create index if not exists idx_audits_user on audits(user_id, created_at desc);
create index if not exists idx_saved_apps_user on saved_apps(user_id);

-- RLS: enable but allow service role to bypass
alter table users enable row level security;
alter table saved_apps enable row level security;
alter table audits enable row level security;
alter table competitors enable row level security;

-- RLS policies (service role key bypasses all, anon key is never used directly for writes)
-- These are permissive for the service role key used in API routes
create policy "Service role full access on users"      on users      using (true) with check (true);
create policy "Service role full access on saved_apps" on saved_apps using (true) with check (true);
create policy "Service role full access on audits"     on audits     using (true) with check (true);
create policy "Service role full access on competitors" on competitors using (true) with check (true);
