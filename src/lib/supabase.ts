import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  audit_credits: number;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAiUnlock {
  id: string;
  user_id: string;
  store_id: string;
  platform: "ios" | "android";
  app_name: string | null;
  app_icon_url: string | null;
  created_at: string;
}

export interface DbPurchase {
  id: string;
  user_id: string;
  stripe_session_id: string | null;
  credits: number;
  amount_cents: number;
  currency: string;
  created_at: string;
}

export interface DbSavedApp {
  id: string;
  user_id: string;
  store_id: string;
  platform: "ios" | "android";
  name: string;
  icon_url: string | null;
  last_regression_email_at: string | null;
  created_at: string;
}

export interface DbAuditLead {
  id: string;
  token: string;
  email: string;
  store_id: string;
  platform: "ios" | "android";
  app_name: string;
  app_icon_url: string | null;
  score: number;
  category_scores: Record<string, number>;
  claimed_user_id: string | null;
  last_checked_at: string | null;
  notified_at: string | null;
  created_at: string;
}

export interface DbAudit {
  id: string;
  user_id: string;
  saved_app_id: string;
  platform: "ios" | "android";
  overall_score: number;
  category_scores: Record<string, number>;
  action_plan: unknown;
  ai_powered: boolean;
  app_data: unknown;
  source: "manual" | "auto_public" | "free_audit" | "paid_audit";
  competitor_id: string | null;
  created_at: string;
}

export interface DbStoreConnection {
  id: string;
  user_id: string;
  platform: "ios" | "android";
  display_name: string;
  credentials_encrypted: string;
  credentials_iv: string;
  credentials_tag: string;
  status: "active" | "error" | "revoked";
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
}

export interface DbConnectedApp {
  id: string;
  user_id: string;
  store_connection_id: string;
  saved_app_id: string | null;
  store_app_id: string;
  platform: "ios" | "android";
  name: string;
  bundle_id: string | null;
  sync_enabled: boolean;
  created_at: string;
}

export interface DbAppMetric {
  id: string;
  connected_app_id: string;
  date: string;
  impressions: number | null;
  page_views: number | null;
  installs: number | null;
  uninstalls: number | null;
  conversion_rate: number | null;
  crashes: number | null;
  anr_count: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  raw_data: unknown;
  created_at: string;
}

export type ExperimentStatus = "backlog" | "in_progress" | "live" | "evaluated";
export type ExperimentOutcome = "win" | "neutral" | "loss";
export type TargetMetric = "installs" | "conversion_rate" | "impressions" | "crashes" | "rating_avg";

export interface DbExperiment {
  id: string;
  user_id: string;
  connected_app_id: string | null;
  audit_finding_id: string | null;
  title: string;
  hypothesis: string | null;
  status: ExperimentStatus;
  target_metric: TargetMetric | null;
  expected_duration_days: number;
  started_at: string | null;
  ended_at: string | null;
  pre_window_days: number;
  post_window_days: number;
  outcome: ExperimentOutcome | null;
  outcome_notes: string | null;
  metrics_delta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface DbKeywordTrack {
  id: string;
  user_id: string;
  saved_app_id: string;
  keyword: string;
  country: string;
  track_id: number | null;
  is_active: boolean;
  created_at: string;
}

export interface DbKeywordRankHistory {
  id: string;
  keyword_track_id: string;
  date: string;
  rank: number | null;
  popularity: number | null;
  difficulty: number | null;
  daily_searches: number | null;
  opportunity: number | null;
  created_at: string;
}

export interface DbCompetitor {
  id: string;
  saved_app_id: string;
  user_id: string;
  competitor_store_id: string;
  competitor_platform: "ios" | "android";
  competitor_name: string;
  competitor_icon_url: string | null;
  created_at: string;
}

export interface DbAppProfile {
  id: string;
  saved_app_id: string;
  user_id: string;
  context: AppProfileContext;
  version: number;
  built_at: string;
  created_at: string;
}

export interface AppProfileContext {
  identity: {
    storeId: string;
    platform: "ios" | "android";
    name: string;
    developer: string;
    category: string;
    iconUrl: string;
    url: string;
  };
  storeListing: {
    title: string;
    subtitle: string | null;
    shortDescription: string | null;
    description: string;
    keywordField: string | null;
    promotionalText: string | null;
    whatsNew: string | null;
    screenshotCount: number;
    hasVideo: boolean;
    version: string | null;
    lastUpdated: string | null;
    rating: number;
    ratingsCount: number;
    price: string | null;
    contentRating: string | null;
  };
  asoHealth: {
    currentScore: number;
    previousScore: number | null;
    scoreTrend: "improving" | "declining" | "stable" | "new";
    categoryScores: Record<string, number>;
    strengths: string[];
    weaknesses: string[];
    lastAuditAt: string;
    aiPowered: boolean;
  };
  auditHistory: Array<{
    date: string;
    score: number;
    source: string;
    aiPowered: boolean;
  }>;
  actionPlan: {
    total: number;
    critical: number;
    high: number;
    topActions: Array<{
      title: string;
      priority: string;
      effort: string;
      category: string;
    }>;
  };
  keywords: {
    tracked: Array<{
      keyword: string;
      country: string;
      currentRank: number | null;
      popularity: number | null;
      trend: "improving" | "declining" | "stable" | "new";
    }>;
    totalTracked: number;
  };
  metrics: {
    hasStoreConnection: boolean;
    latestDate: string | null;
    last7d: { impressions: number; installs: number; cvr: number } | null;
    last30d: { impressions: number; installs: number; cvr: number } | null;
    trends: {
      installs: "improving" | "declining" | "stable" | null;
      cvr: "improving" | "declining" | "stable" | null;
      rating: "improving" | "declining" | "stable" | null;
    };
  };
  competitors: Array<{
    name: string;
    storeId: string;
    platform: string;
    lastAuditScore: number | null;
  }>;
  experiments: {
    total: number;
    active: number;
    wins: number;
    losses: number;
    recentOutcomes: Array<{
      title: string;
      outcome: string | null;
      topDelta: string | null;
    }>;
  };
  brandVoice: {
    tone: "formal" | "casual" | "playful" | "technical" | "neutral";
    sentenceStyle: "short" | "mixed" | "long";
    usesEmoji: boolean;
    emojiDensity: "none" | "light" | "heavy";
    usesBullets: boolean;
    capitalization: "standard" | "title-case-heavy" | "all-caps-heavy";
    powerWords: string[];
    ctaStyle: string | null;
    vocabularyLevel: "simple" | "moderate" | "technical";
    samples: {
      openingLine: string | null;
      ctaLine: string | null;
    };
  };
  icp: {
    primaryAudience: string;
    useCases: string[];
    painPoints: string[];
    keyFeatures: string[];
    pricingPosition: "free" | "freemium" | "premium" | "subscription" | "unknown";
    platformSignals: string[];
    demographicSignals: {
      contentRating: string | null;
      category: string;
      broadAge: string | null;
    };
    competitivePosition: string | null;
  };
  compiledAt: string;
  version: number;
}

// ---------------------------------------------------------------------------
// Credit packs \u2014 map Stripe price IDs to credit amounts
// ---------------------------------------------------------------------------

export const CREDIT_PACKS: Record<string, { credits: number; label: string; price: number }> = {
  ...(process.env.STRIPE_PRICE_STARTER   ? { [process.env.STRIPE_PRICE_STARTER.trim()]:   { credits: 1, label: "1 Audit",   price: 29 } } : {}),
  ...(process.env.STRIPE_PRICE_GROWTH    ? { [process.env.STRIPE_PRICE_GROWTH.trim()]:    { credits: 2, label: "2 Audits",  price: 49 } } : {}),
  ...(process.env.STRIPE_PRICE_PORTFOLIO ? { [process.env.STRIPE_PRICE_PORTFOLIO.trim()]: { credits: 5, label: "5 Audits",  price: 99 } } : {}),
};

export function creditsForPriceId(priceId: string): number | null {
  return CREDIT_PACKS[priceId]?.credits ?? null;
}
