-- Phase 2 migrations
-- Run these in Supabase SQL Editor

-- 1. keyword_tracks: keywords a user wants to monitor for an app
create table if not exists keyword_tracks (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references users(id) on delete cascade,
  saved_app_id  uuid not null references saved_apps(id) on delete cascade,
  keyword       text not null,
  country       text not null default 'us',
  track_id      bigint,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (saved_app_id, keyword, country)
);

-- 2. keyword_rank_history: daily rank snapshots
create table if not exists keyword_rank_history (
  id                uuid primary key default gen_random_uuid(),
  keyword_track_id  uuid not null references keyword_tracks(id) on delete cascade,
  date              date not null,
  rank              integer,
  popularity        integer,
  difficulty        integer,
  daily_searches    numeric,
  opportunity       integer,
  created_at        timestamptz not null default now(),
  unique (keyword_track_id, date)
);

-- 3. Add source + competitor_id columns to audits
alter table audits
  add column if not exists source      text not null default 'manual',
  add column if not exists competitor_id uuid references competitors(id) on delete set null;

-- 4. Add user_id to competitors (so we can filter by owner)
alter table competitors
  add column if not exists user_id text references users(id) on delete cascade;

-- Update existing competitors rows if any
update competitors c
set user_id = sa.user_id
from saved_apps sa
where c.saved_app_id = sa.id
  and c.user_id is null;

-- 5. RLS policies for new tables
alter table keyword_tracks enable row level security;
alter table keyword_rank_history enable row level security;

create policy "Users own their keyword_tracks"
  on keyword_tracks for all
  using (user_id = auth.uid()::text);

create policy "Users own their keyword_rank_history via track"
  on keyword_rank_history for all
  using (
    keyword_track_id in (
      select id from keyword_tracks where user_id = auth.uid()::text
    )
  );

-- Service role bypasses RLS so admin client can write cron data
