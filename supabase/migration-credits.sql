-- Migration: Subscription model → Credit-based one-off model
-- Run this in Supabase SQL Editor after the initial schema

-- Add credit balance to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS audit_credits int NOT NULL DEFAULT 0;

-- Track which apps a user has unlocked AI analysis for
-- Once unlocked, deep-dive / visual gen / PDF export are all included
CREATE TABLE IF NOT EXISTS ai_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  store_id text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, store_id, platform)
);

ALTER TABLE ai_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on ai_unlocks" ON ai_unlocks USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ai_unlocks_user ON ai_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_unlocks_lookup ON ai_unlocks(user_id, store_id, platform);

-- Track credit purchases for receipt history
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  stripe_session_id text,
  credits int NOT NULL,
  amount_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'eur',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on purchases" ON purchases USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id, created_at DESC);
