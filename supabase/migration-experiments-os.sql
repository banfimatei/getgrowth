-- Migration: ASO Experiments OS v1
-- Tables: store_connections, connected_apps, app_metrics, experiments

-- store_connections: encrypted store API credentials per user
CREATE TABLE IF NOT EXISTS store_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  display_name text NOT NULL,
  credentials_encrypted text NOT NULL,
  credentials_iv text NOT NULL,
  credentials_tag text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'revoked')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE store_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on store_connections" ON store_connections USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_store_connections_user ON store_connections(user_id);

-- connected_apps: apps opted into metric tracking
CREATE TABLE IF NOT EXISTS connected_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_connection_id uuid NOT NULL REFERENCES store_connections(id) ON DELETE CASCADE,
  saved_app_id uuid REFERENCES saved_apps(id) ON DELETE SET NULL,
  store_app_id text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  name text NOT NULL,
  bundle_id text,
  sync_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_connection_id, store_app_id)
);

ALTER TABLE connected_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on connected_apps" ON connected_apps USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_connected_apps_user ON connected_apps(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_apps_connection ON connected_apps(store_connection_id);

-- app_metrics: daily time-series
CREATE TABLE IF NOT EXISTS app_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connected_app_id uuid NOT NULL REFERENCES connected_apps(id) ON DELETE CASCADE,
  date date NOT NULL,
  impressions int,
  page_views int,
  installs int,
  uninstalls int,
  conversion_rate numeric(5,4),
  crashes int,
  anr_count int,
  rating_avg numeric(3,2),
  rating_count int,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(connected_app_id, date)
);

ALTER TABLE app_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on app_metrics" ON app_metrics USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_app_metrics_app_date ON app_metrics(connected_app_id, date DESC);

-- experiments: experiment tracking
CREATE TABLE IF NOT EXISTS experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connected_app_id uuid REFERENCES connected_apps(id) ON DELETE SET NULL,
  audit_finding_id text,
  title text NOT NULL,
  hypothesis text,
  status text NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'live', 'evaluated')),
  target_metric text,
  expected_duration_days int DEFAULT 14,
  started_at timestamptz,
  ended_at timestamptz,
  pre_window_days int DEFAULT 7,
  post_window_days int DEFAULT 7,
  outcome text CHECK (outcome IN ('win', 'neutral', 'loss')),
  outcome_notes text,
  metrics_delta jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on experiments" ON experiments USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_experiments_user ON experiments(user_id);
CREATE INDEX IF NOT EXISTS idx_experiments_app ON experiments(connected_app_id);
