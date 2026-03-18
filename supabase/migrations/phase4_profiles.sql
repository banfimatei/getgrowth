-- Phase 4: App context profiles — compiled knowledge base per app
-- Run in Supabase SQL Editor

create table if not exists app_profiles (
  id          uuid primary key default gen_random_uuid(),
  saved_app_id uuid not null references saved_apps(id) on delete cascade,
  user_id     text not null references users(id) on delete cascade,
  context     jsonb not null default '{}',
  version     integer not null default 1,
  built_at    timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique(saved_app_id)
);

create index if not exists idx_app_profiles_user on app_profiles(user_id);
create index if not exists idx_app_profiles_saved_app on app_profiles(saved_app_id);

alter table app_profiles enable row level security;
create policy "Service role full access on app_profiles"
  on app_profiles using (true) with check (true);
