-- Phase 3 migrations
-- Run in Supabase SQL Editor

-- 1. audit_leads: email-only visitors who captured their free audit
create table if not exists audit_leads (
  id              uuid primary key default gen_random_uuid(),
  token           uuid not null unique default gen_random_uuid(),
  email           text not null,
  store_id        text not null,
  platform        text not null check (platform in ('ios','android')),
  app_name        text not null,
  app_icon_url    text,
  score           integer not null,
  category_scores jsonb not null default '{}',
  claimed_user_id text references users(id) on delete set null,
  last_checked_at timestamptz,
  notified_at     timestamptz,
  created_at      timestamptz not null default now()
);

create unique index if not exists audit_leads_email_app_unique on audit_leads (email, store_id, platform);
create index if not exists audit_leads_token_idx on audit_leads (token);

-- RLS: public insert (anonymous capture), read only via service role
alter table audit_leads enable row level security;

create policy "Anyone can insert an audit lead"
  on audit_leads for insert
  with check (true);

-- Service role bypasses RLS for reads/updates in crons

-- 2. Add last_regression_email_at to saved_apps (bi-weekly regression check)
alter table saved_apps
  add column if not exists last_regression_email_at timestamptz;
