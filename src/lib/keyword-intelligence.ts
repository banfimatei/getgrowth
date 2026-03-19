/**
 * Keyword Intelligence Engine — TypeScript port of RespectASO (github.com/respectlytics/respectaso)
 *
 * Provides keyword popularity scoring, difficulty analysis, download estimates,
 * targeting advice, ranking tier breakdowns, competitor analysis, and app rank tracking
 * using only the public iTunes Search API (no API keys needed).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompetitorApp {
  trackId: number;
  name: string;
  icon: string;
  rating: number;
  reviews: number;
  genre: string;
  price: string;
  seller: string;
  storeUrl: string;
  releaseDate: string;
  currentVersionReleaseDate: string;
  bundleId: string;
}

export interface OpportunitySignal {
  signal: string;
  icon: string;
  strength: "Strong" | "Moderate";
  detail: string;
}

export interface DifficultyBreakdown {
  totalScore: number;
  rawTotal: number;
  overrideReason: string | null;
  isBrandKeyword: boolean;
  brandName: string | null;
  ratingVolume: number;
  reviewVelocity: number;
  dominantPlayers: number;
  ratingQuality: number;
  marketAge: number;
  publisherDiversity: number;
  titleRelevance: number;
  interpretation: string;
  titleMatchCount: number;
  medianReviews: number;
  avgReviews: number;
  insights: Array<{ icon: string; type: string; text: string }>;
  opportunitySignals: OpportunitySignal[];
  rankingTiers: RankingTiers;
}

export interface TierAnalysis {
  tierScore: number;
  label: string;
  minReviews: number;
  weakestApp: string;
  medianReviews: number;
  weakCount: number;
  freshCount: number;
  titleKeywordCount: number;
  totalApps: number;
  highlights: string[];
}

export interface RankingTiers {
  top5: TierAnalysis;
  top10: TierAnalysis;
  top20: TierAnalysis;
}

export interface DownloadEstimate {
  dailySearches: number;
  positions: Array<{ pos: number; ttr: number; downloadsLow: number; downloadsHigh: number }>;
  tiers: {
    top5: { low: number; high: number };
    top6_10: { low: number; high: number };
    top11_20: { low: number; high: number };
  };
}

export type TargetingLabel =
  | "Sweet Spot"
  | "Good Target"
  | "Worth Competing"
  | "Hidden Gem"
  | "Decent Option"
  | "Low Volume"
  | "Avoid"
  | "Challenging";

export interface TargetingAdvice {
  label: TargetingLabel;
  icon: string;
  description: string;
}

export interface KeywordAnalysis {
  keyword: string;
  popularity: number;
  difficulty: number;
  difficultyLabel: string;
  difficultyBreakdown: DifficultyBreakdown;
  targetingAdvice: TargetingAdvice;
  dailySearches: number;
  downloadEstimate: DownloadEstimate;
  rankingTiers: RankingTiers;
  opportunity: number;
  appRank: number | null;
  competitors: CompetitorApp[];
  opportunitySignals: OpportunitySignal[];
  isBrand: boolean;
}

/** Partial view sent to free users (no competitors/tiers/downloads detail) */
export interface KeywordAnalysisFree {
  keyword: string;
  popularity: number;
  difficulty: number;
  difficultyLabel: string;
  targetingAdvice: TargetingAdvice;
  dailySearches: number;
  opportunity: number;
  appRank: number | null;
}

// ---------------------------------------------------------------------------
// Token normalization & title evidence (ported from Python)
// ---------------------------------------------------------------------------

const TOKEN_NORMALIZATION: Record<string, string> = {
  options: "option",
  stocks: "stock",
  signals: "signal",
  markets: "market",
};

const FINANCE_INTENT_TOKENS = new Set([
  "option", "options", "trading", "trade", "stock", "stocks",
  "call", "put", "signal", "signals", "invest", "investing",
]);

const FINANCE_STRONG_CONTEXT_TOKENS = new Set([
  "finance", "financial", "stock", "stocks", "trading", "trade",
  "portfolio", "broker", "invest", "investing", "market", "markets",
  "futures", "derivative", "derivatives", "forex", "etf",
]);

function tokenize(text: string): string[] {
  const raw = (text || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  return raw.map((tok) => TOKEN_NORMALIZATION[tok] ?? tok);
}

function hasFinanceIntent(kwTokens: Set<string>): boolean {
  for (const t of kwTokens) if (FINANCE_INTENT_TOKENS.has(t)) return true;
  return false;
}

function hasFinanceContext(titleTokens: Set<string>, genre: string): boolean {
  if ((genre || "").toLowerCase().includes("finance")) return true;
  for (const t of titleTokens) if (FINANCE_STRONG_CONTEXT_TOKENS.has(t)) return true;
  return false;
}

interface TitleEvidence {
  exactPhrase: boolean;
  allWords: boolean;
  partialOverlap: number;
  proximity: number;
  evidence: number;
}

function keywordTitleEvidence(keyword: string, title: string, genre = ""): TitleEvidence {
  const kw = (keyword || "").toLowerCase().trim();
  const titleLower = (title || "").toLowerCase();
  const kwTokens = new Set(tokenize(kw));
  const titleTokensList = tokenize(titleLower);
  const titleTokens = new Set(titleTokensList);

  if (kwTokens.size === 0 || titleTokens.size === 0) {
    return { exactPhrase: false, allWords: false, partialOverlap: 0, proximity: 0, evidence: 0 };
  }

  let exactPhrase = kw ? titleLower.includes(kw) : false;
  let allWords = [...kwTokens].every((tok) => titleTokens.has(tok));
  let overlap = [...kwTokens].filter((tok) => titleTokens.has(tok)).length / kwTokens.size;

  let proximity = 0;
  if (allWords && kwTokens.size > 1) {
    const positions: number[] = [];
    for (const token of kwTokens) {
      const idx = titleTokensList.indexOf(token);
      if (idx >= 0) positions.push(idx);
    }
    if (positions.length > 0) {
      const span = Math.max(1, Math.max(...positions) - Math.min(...positions) + 1);
      proximity = Math.min(1.0, kwTokens.size / span);
    }
  }

  const financeIntent = hasFinanceIntent(kwTokens);
  const financeContext = hasFinanceContext(titleTokens, genre);
  if (financeIntent && !financeContext && (exactPhrase || allWords)) {
    exactPhrase = false;
    allWords = false;
    overlap = Math.min(overlap, 0.5);
  }
  if (financeIntent && !financeContext && !exactPhrase && !allWords) {
    overlap = 0;
  }

  let strongScore = 0;
  if (exactPhrase) strongScore = 1.0;
  else if (allWords) strongScore = 0.85 + 0.15 * proximity;

  let partialScore = 0;
  if (!exactPhrase && !allWords && overlap > 0) {
    partialScore = Math.min(0.5, overlap * 0.5);
  }

  return {
    exactPhrase,
    allWords,
    partialOverlap: overlap,
    proximity,
    evidence: Math.max(strongScore, partialScore),
  };
}

// ---------------------------------------------------------------------------
// Brand keyword detection
// ---------------------------------------------------------------------------

function isBrandKeyword(
  keyword: string,
  leader: CompetitorApp,
  competitors: CompetitorApp[],
): [boolean, string | null] {
  const kwTokens = new Set(tokenize(keyword));
  if (kwTokens.size === 0) return [false, null];

  const seller = leader.seller;
  const sellerTokens = new Set(tokenize(seller));
  if (sellerTokens.size === 0) return [false, null];

  if (![...kwTokens].every((t) => sellerTokens.has(t))) return [false, null];

  if (leader.reviews >= 1000) return [true, seller];

  const leaderSellerLower = seller.trim().toLowerCase();
  const independent = competitors
    .slice(1)
    .filter((c) => c.seller.trim().toLowerCase() !== leaderSellerLower)
    .slice(0, 4);
  if (independent.length === 0) return [false, null];

  const runnerReviews = independent.map((c) => c.reviews).sort((a, b) => a - b);
  const n = runnerReviews.length;
  const medianRu =
    n % 2 === 1
      ? runnerReviews[Math.floor(n / 2)]
      : (runnerReviews[n / 2 - 1] + runnerReviews[n / 2]) / 2;

  return medianRu >= 10000 ? [true, seller] : [false, null];
}

// ---------------------------------------------------------------------------
// Log interpolation helper
// ---------------------------------------------------------------------------

function logInterpolate(value: number, bands: [number, number][]): number {
  if (value <= 0) return 0;
  if (value >= bands[bands.length - 1][0]) return bands[bands.length - 1][1];

  for (let i = 0; i < bands.length; i++) {
    const [threshold, score] = bands[i];
    if (value < threshold) {
      if (i === 0) return (value / threshold) * score;
      const [prevT, prevS] = bands[i - 1];
      const ratio = Math.log(value / prevT) / Math.log(threshold / prevT);
      return prevS + ratio * (score - prevS);
    }
  }
  return bands[bands.length - 1][1];
}

function linearInterpolate(value: number, bands: [number, number][]): number {
  if (value <= 0) return 0;
  if (value >= bands[bands.length - 1][0]) return bands[bands.length - 1][1];

  for (let i = 1; i < bands.length; i++) {
    const [threshold, score] = bands[i];
    if (value < threshold) {
      const [prevT, prevS] = bands[i - 1];
      const ratio = (value - prevT) / (threshold - prevT);
      return prevS + ratio * (score - prevS);
    }
  }
  return bands[bands.length - 1][1];
}

// ---------------------------------------------------------------------------
// iTunes Search API
// ---------------------------------------------------------------------------

interface ITunesRawResult {
  trackId: number;
  trackName: string;
  artworkUrl100: string;
  averageUserRating: number;
  userRatingCount: number;
  releaseDate: string;
  currentVersionReleaseDate: string;
  primaryGenreName: string;
  formattedPrice: string;
  description: string;
  sellerName: string;
  bundleId: string;
  trackViewUrl: string;
}

function parseApp(r: ITunesRawResult): CompetitorApp {
  const desc = r.description || "";
  return {
    trackId: r.trackId,
    name: r.trackName || "",
    icon: r.artworkUrl100 || "",
    rating: r.averageUserRating || 0,
    reviews: r.userRatingCount || 0,
    genre: r.primaryGenreName || "",
    price: r.formattedPrice || "Free",
    seller: r.sellerName || "",
    storeUrl: r.trackViewUrl || "",
    releaseDate: r.releaseDate || "",
    currentVersionReleaseDate: r.currentVersionReleaseDate || "",
    bundleId: r.bundleId || "",
  };
}

export async function searchiTunes(
  keyword: string,
  country = "us",
  limit = 25,
): Promise<CompetitorApp[]> {
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", keyword);
  url.searchParams.set("country", country);
  url.searchParams.set("entity", "software");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(30_000),
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((r: ITunesRawResult) => parseApp(r));
}

export async function findAppRank(
  keyword: string,
  trackId: number,
  country = "us",
): Promise<number | null> {
  const results = await searchiTunes(keyword, country, 200);
  for (let i = 0; i < results.length; i++) {
    if (results[i].trackId === trackId) return i + 1;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Popularity Estimator (6-signal model)
// ---------------------------------------------------------------------------

export function estimatePopularity(competitors: CompetitorApp[], keyword: string): number | null {
  if (competitors.length === 0) return null;

  const n = competitors.length;
  const kwLower = keyword.toLowerCase().trim();
  const wordCount = kwLower.split(/\s+/).length || 1;

  // Signal 1: Result count (0-25)
  let resultScore = Math.min(25, n * 2.5);

  // Signal 2: Leader strength (0-30)
  const topHalf = competitors.slice(0, Math.max(Math.floor(n / 2), 1));
  const maxReviews = Math.max(...topHalf.map((c) => c.reviews));
  let leaderScore: number;
  if (maxReviews <= 0) {
    leaderScore = 0;
  } else if (maxReviews >= 1_000_000) {
    leaderScore = 30;
  } else {
    const leaderBands: [number, number][] = [
      [10, 1], [100, 5], [1_000, 10], [10_000, 17], [100_000, 24], [1_000_000, 30],
    ];
    leaderScore = logInterpolate(maxReviews, leaderBands);
  }

  // Signal 3: Title match density (0-20)
  let titleMatches = 0;
  let exactPhraseMatches = 0;
  let relevanceSum = 0;
  for (const c of competitors) {
    const ev = keywordTitleEvidence(kwLower, c.name, c.genre);
    relevanceSum += ev.evidence;
    if (ev.exactPhrase) { titleMatches++; exactPhraseMatches++; }
    else if (ev.allWords) titleMatches++;
  }
  const matchRatio = n > 0 ? titleMatches / n : 0;
  let titleScore = Math.min(20, matchRatio * 40);

  // Signal 4: Market depth (0-10)
  const sortedCounts = competitors.map((c) => c.reviews).sort((a, b) => a - b);
  const median = n % 2 === 1
    ? sortedCounts[Math.floor(n / 2)]
    : (sortedCounts[n / 2 - 1] + sortedCounts[n / 2]) / 2;
  const depthBands: [number, number][] = [
    [10, 0.5], [100, 3], [1_000, 5], [10_000, 8], [50_000, 10],
  ];
  let depthScore = median <= 0 ? 0 : median >= 50_000 ? 10 : logInterpolate(median, depthBands);

  // Signal 5: Keyword specificity (-5 to -30)
  const spPoints: [number, number][] = [[1, 0], [2, -3], [3, -8], [4, -15], [5, -22], [6, -28]];
  let specificityPenalty: number;
  if (wordCount <= 1) specificityPenalty = 0;
  else if (wordCount >= 6) specificityPenalty = -28;
  else {
    specificityPenalty = -28;
    for (let i = 0; i < spPoints.length - 1; i++) {
      const [loW, loV] = spPoints[i];
      const [hiW, hiV] = spPoints[i + 1];
      if (loW <= wordCount && wordCount <= hiW) {
        const t = (wordCount - loW) / (hiW - loW);
        specificityPenalty = loV + t * (hiV - loV);
        break;
      }
    }
  }

  // Signal 6: Exact phrase bonus (0-15)
  const exactRatio = n > 0 ? exactPhraseMatches / n : 0;
  let exactBonus = Math.min(15, exactRatio * 50);

  // Small sample dampening
  const sampleDampening = Math.min(1.0, n / 10);
  titleScore *= sampleDampening;
  exactBonus *= sampleDampening;

  // Backfill-aware dampening
  const relevanceRatio = n > 0 ? relevanceSum / n : 0;
  const relevance = Math.max(0.3, Math.min(1.0, relevanceRatio * 2.6));
  resultScore *= relevance;
  leaderScore *= relevance;
  depthScore *= relevance;

  const total = Math.round(
    resultScore + leaderScore + titleScore + depthScore + specificityPenalty + exactBonus,
  );
  return Math.max(5, Math.min(100, total));
}

// ---------------------------------------------------------------------------
// Difficulty Calculator (7-factor weighted system)
// ---------------------------------------------------------------------------

function ratingVolumeScore(medianRatings: number): number {
  if (medianRatings <= 0) return 0;
  if (medianRatings >= 100_000) return 100;
  const bands: [number, number][] = [
    [50, 5], [200, 15], [500, 30], [2_000, 50],
    [5_000, 65], [10_000, 78], [25_000, 88], [100_000, 95],
  ];
  return logInterpolate(medianRatings, bands);
}

function reviewVelocityScore(competitors: CompetitorApp[]): number {
  const now = Date.now();
  const velocities: number[] = [];
  for (const c of competitors) {
    if (c.releaseDate && c.reviews > 0) {
      try {
        const released = new Date(c.releaseDate).getTime();
        const ageYears = Math.max(0.5, (now - released) / (365.25 * 86_400_000));
        velocities.push(c.reviews / ageYears);
      } catch { /* skip */ }
    }
  }
  if (velocities.length === 0) return 50;
  velocities.sort((a, b) => a - b);
  const vn = velocities.length;
  const medianVel = vn % 2 === 1
    ? velocities[Math.floor(vn / 2)]
    : (velocities[vn / 2 - 1] + velocities[vn / 2]) / 2;
  if (medianVel <= 0) return 0;
  if (medianVel >= 50_000) return 100;
  const bands: [number, number][] = [
    [10, 5], [50, 15], [200, 30], [1_000, 50], [5_000, 70], [20_000, 85], [50_000, 95],
  ];
  return logInterpolate(medianVel, bands);
}

function ratingQualityScore(avgQuality: number): number {
  if (avgQuality <= 0) return 0;
  if (avgQuality >= 5.0) return 100;
  const bands: [number, number][] = [
    [0, 0], [3.0, 20], [3.5, 35], [4.0, 50], [4.3, 70], [4.5, 85], [5.0, 100],
  ];
  return linearInterpolate(avgQuality, bands);
}

function marketAgeScore(competitors: CompetitorApp[]): number {
  const now = Date.now();
  const ages: number[] = [];
  for (const c of competitors) {
    if (c.releaseDate) {
      try {
        const released = new Date(c.releaseDate).getTime();
        ages.push((now - released) / (365.25 * 86_400_000));
      } catch { /* skip */ }
    }
  }
  if (ages.length === 0) return 50;
  const avgAge = ages.reduce((s, v) => s + v, 0) / ages.length;
  if (avgAge <= 0) return 0;
  if (avgAge >= 10) return 100;
  const bands: [number, number][] = [
    [0.5, 10], [1.0, 20], [2.0, 35], [3.0, 50], [5.0, 70], [8.0, 85], [10.0, 100],
  ];
  return linearInterpolate(avgAge, bands);
}

interface RawDifficultyResult {
  rawScore: number;
  ratingVolume: number;
  reviewVelocity: number;
  dominantPlayers: number;
  ratingQuality: number;
  marketAge: number;
  publisherDiversity: number;
  titleRelevance: number;
  titleMatchCount: number;
  medianReviews: number;
  avgReviews: number;
  ratingCounts: number[];
  avgQualityVal: number;
  relevanceSum: number;
}

function computeRawDifficulty(
  competitors: CompetitorApp[],
  keyword: string,
  fullResultCount?: number,
): RawDifficultyResult {
  const n = competitors.length;
  if (n === 0) {
    return {
      rawScore: 0, ratingVolume: 0, reviewVelocity: 0, dominantPlayers: 0,
      ratingQuality: 0, marketAge: 0, publisherDiversity: 0, titleRelevance: 0,
      titleMatchCount: 0, medianReviews: 0, avgReviews: 0, ratingCounts: [], avgQualityVal: 0,
      relevanceSum: 0,
    };
  }

  const kwLower = keyword.toLowerCase().trim();
  const ratingCounts = competitors.map((c) => c.reviews);
  const sortedCounts = [...ratingCounts].sort((a, b) => a - b);
  const medianRatings = n % 2 === 1
    ? sortedCounts[Math.floor(n / 2)]
    : (sortedCounts[n / 2 - 1] + sortedCounts[n / 2]) / 2;
  const avgRatings = ratingCounts.reduce((s, v) => s + v, 0) / n;

  const rv = ratingVolumeScore(medianRatings);
  const rvl = reviewVelocityScore(competitors);

  // Dominant players
  const LOG_CEILING = Math.log10(10_000_000);
  const topHalfSize = Math.max(Math.floor(n / 2), 1);
  let dominanceTotal = 0;
  for (let i = 0; i < ratingCounts.length; i++) {
    const r = ratingCounts[i];
    if (r <= 0) continue;
    const appDominance = Math.min(1.0, Math.log10(Math.max(r, 1)) / LOG_CEILING);
    const weight = i < topHalfSize ? 2.0 : 1.0;
    dominanceTotal += appDominance * weight;
  }
  const weightSum = 2.0 * topHalfSize + 1.0 * Math.max(n - topHalfSize, 0);
  let dp = Math.min(100, (dominanceTotal / Math.max(weightSum, 1)) * 100);

  // Rating quality (review-weighted)
  let weightedSum = 0;
  let weightTotal = 0;
  for (const c of competitors) {
    if (c.rating > 0 && c.reviews > 0) {
      const w = Math.log1p(c.reviews);
      weightedSum += c.rating * w;
      weightTotal += w;
    }
  }
  const avgQualityVal = weightTotal > 0 ? weightedSum / weightTotal : 0;
  let rq = ratingQualityScore(avgQualityVal);

  let ma = marketAgeScore(competitors);

  // Publisher diversity
  const uniquePubs = new Set(competitors.filter((c) => c.seller).map((c) => c.seller.toLowerCase()));
  let pd = Math.min(100, (uniquePubs.size / Math.max(n, 1)) * 100);

  // Title relevance
  let titleMatchCount = 0;
  let relevanceSum = 0;
  for (const c of competitors) {
    const ev = keywordTitleEvidence(kwLower, c.name, c.genre);
    relevanceSum += ev.evidence;
    if (ev.exactPhrase || ev.allWords) titleMatchCount++;
  }
  let tr = Math.min(100, (titleMatchCount / Math.max(n, 1)) * 100);

  // Small sample dampening
  const dampeningN = fullResultCount ?? n;
  const sampleDampening = Math.min(1.0, dampeningN / 10);
  pd *= sampleDampening;
  tr *= sampleDampening;
  dp *= sampleDampening;
  rq *= sampleDampening;

  // Backfill-aware dampening
  const relevanceRatio = relevanceSum / Math.max(n, 1);
  const relFactor = Math.max(0.3, Math.min(1.0, relevanceRatio * 2.6));
  pd *= relFactor;
  rq *= relFactor;
  ma *= relFactor;

  const rawScore = Math.max(1, Math.min(100, Math.round(
    rv * 0.30 + rvl * 0.10 + dp * 0.20 + rq * 0.10 + ma * 0.10 + pd * 0.10 + tr * 0.10,
  )));

  return {
    rawScore,
    ratingVolume: Math.round(rv * 10) / 10,
    reviewVelocity: Math.round(rvl * 10) / 10,
    dominantPlayers: Math.round(dp * 10) / 10,
    ratingQuality: Math.round(rq * 10) / 10,
    marketAge: Math.round(ma * 10) / 10,
    publisherDiversity: Math.round(pd * 10) / 10,
    titleRelevance: Math.round(tr * 10) / 10,
    titleMatchCount,
    medianReviews: Math.round(medianRatings),
    avgReviews: Math.round(avgRatings),
    ratingCounts,
    avgQualityVal,
    relevanceSum,
  };
}

function scoreToLabel(s: number): string {
  if (s <= 15) return "Very Easy";
  if (s <= 35) return "Easy";
  if (s <= 55) return "Moderate";
  if (s <= 75) return "Hard";
  if (s <= 90) return "Very Hard";
  return "Extreme";
}

const DIFFICULTY_ORDER = ["Very Easy", "Easy", "Moderate", "Hard", "Very Hard", "Extreme"];

function capLabel(label: string, ceiling: string): string {
  return DIFFICULTY_ORDER.indexOf(label) > DIFFICULTY_ORDER.indexOf(ceiling) ? ceiling : label;
}

// ---------------------------------------------------------------------------
// Tier highlights
// ---------------------------------------------------------------------------

function tierHighlights(
  tierSize: number, n: number, minReviews: number, weakestApp: string,
  median: number, weak: number, fresh: number, titleOpt: number,
  avgRating?: number,
): string[] {
  const hl: string[] = [];
  if (n < tierSize) {
    const open = tierSize - n;
    hl.push(`Only ${n} app${n !== 1 ? "s" : ""} rank here — ${open} open spot${open !== 1 ? "s" : ""}.`);
    return hl;
  }

  if (titleOpt === 0) hl.push("No app uses this keyword in its title — strong ASO opportunity.");
  else if (titleOpt < Math.floor(n / 2)) hl.push(`Only ${titleOpt} of ${n} apps target this keyword in their title — room for optimization.`);
  else hl.push(`${titleOpt} of ${n} apps already target this keyword in their title.`);

  const ratingStr = avgRating && avgRating > 0 ? `, ${avgRating.toFixed(1)}★ avg` : "";
  if (median >= 10_000) hl.push(`High-authority tier — median ${median.toLocaleString()} reviews${ratingStr}.`);
  else if (median >= 1_000) hl.push(`Moderate authority — median ${median.toLocaleString()} reviews${ratingStr}.`);
  else hl.push(`Low-authority tier — median ${median.toLocaleString()} reviews${ratingStr}.`);

  if (weak > 0) hl.push(`${weak} of ${n} apps have low authority (<1K reviews) — realistic displacement targets.`);

  if (fresh > 0) hl.push(`${fresh} app${fresh !== 1 ? "s" : ""} entered this tier within the last year — market is accessible.`);

  return hl;
}

// ---------------------------------------------------------------------------
// Ranking tier analysis
// ---------------------------------------------------------------------------

function computeRankingTiers(
  competitors: CompetitorApp[],
  keyword: string,
  overallScore: number,
  overallMatchRatio: number,
  overallLeaderReviews: number,
  isBrand: boolean,
): RankingTiers {
  const now = Date.now();
  const fullN = competitors.length;

  const emptyTier: TierAnalysis = {
    tierScore: 0, label: "Easy", minReviews: 0, weakestApp: "—", medianReviews: 0,
    weakCount: 0, freshCount: 0, titleKeywordCount: 0, totalApps: 0,
    highlights: ["No competitors found — wide open."],
  };

  const tiers: Record<string, TierAnalysis> = {};

  for (const [tierName, tierSize] of [["top5", 5], ["top10", 10], ["top20", 20]] as const) {
    const tierApps = competitors.slice(0, tierSize);
    const n = tierApps.length;
    if (n === 0) { tiers[tierName] = { ...emptyTier }; continue; }

    const raw = computeRawDifficulty(tierApps, keyword, fullN);
    let tierScore = raw.rawScore;

    // Post-processing using OVERALL context
    if (keyword.trim() && fullN >= 2) {
      let tierCap: number | null = null;
      if (overallLeaderReviews < 1_000 && !isBrand) {
        tierCap = Math.round(15 + 35 * Math.log10(overallLeaderReviews + 1) / Math.log10(1001));
      }
      if (tierCap !== null && tierScore > tierCap) {
        tierScore = overallMatchRatio > 0.2
          ? Math.round(tierCap + (tierScore - tierCap) * overallMatchRatio)
          : tierCap;
      }
      if (overallMatchRatio < 0.2 && overallLeaderReviews < 1_000 && !isBrand) {
        const ratioFactor = Math.min(1.0, 0.6 + 2.0 * overallMatchRatio);
        const leaderFactor = Math.log10(overallLeaderReviews + 1) / Math.log10(1001);
        const discount = Math.max(0.6, Math.min(1.0, ratioFactor + (1.0 - ratioFactor) * leaderFactor));
        tierScore = Math.max(1, Math.round(tierScore * discount));
      }
    }
    tierScore = Math.max(1, Math.min(100, tierScore));

    const reviews = raw.ratingCounts;
    const minRev = Math.min(...reviews);
    const minIdx = reviews.indexOf(minRev);
    const barrierApp = tierApps[minIdx]?.name || "Unknown";
    const sortedRev = [...reviews].sort((a, b) => a - b);
    const medianRev = n % 2 === 1 ? sortedRev[Math.floor(n / 2)] : (sortedRev[n / 2 - 1] + sortedRev[n / 2]) / 2;
    const weakCount = reviews.filter((r) => r < 1_000).length;

    let freshCount = 0;
    for (const c of tierApps) {
      if (c.releaseDate) {
        try {
          const released = new Date(c.releaseDate).getTime();
          if ((now - released) < 365 * 86_400_000) freshCount++;
        } catch { /* skip */ }
      }
    }

    const tierAvgRating = tierApps.filter(c => c.rating > 0).length > 0
      ? tierApps.reduce((s, c) => s + (c.rating > 0 ? c.rating : 0), 0) / tierApps.filter(c => c.rating > 0).length
      : 0;

    tiers[tierName] = {
      tierScore,
      label: scoreToLabel(tierScore),
      minReviews: minRev,
      weakestApp: barrierApp,
      medianReviews: Math.round(medianRev),
      weakCount,
      freshCount,
      titleKeywordCount: raw.titleMatchCount,
      totalApps: n,
      highlights: tierHighlights(tierSize, n, minRev, barrierApp, medianRev, weakCount, freshCount, raw.titleMatchCount, Math.round(tierAvgRating * 10) / 10),
    };
  }

  // Floor: every tier >= overall
  if (overallScore > 0) {
    for (const key of Object.keys(tiers)) {
      if (tiers[key].tierScore < overallScore) tiers[key].tierScore = overallScore;
      tiers[key].label = scoreToLabel(tiers[key].tierScore);
    }
  }

  // Monotonicity: top5 >= top10 >= top20
  if (tiers.top10 && tiers.top5 && tiers.top10.tierScore > tiers.top5.tierScore) {
    tiers.top10.tierScore = tiers.top5.tierScore;
    tiers.top10.label = capLabel(tiers.top10.label, tiers.top5.label);
  }
  if (tiers.top20 && tiers.top10 && tiers.top20.tierScore > tiers.top10.tierScore) {
    tiers.top20.tierScore = tiers.top10.tierScore;
    tiers.top20.label = capLabel(tiers.top20.label, tiers.top10.label);
  }

  return tiers as unknown as RankingTiers;
}

// ---------------------------------------------------------------------------
// Insights generation
// ---------------------------------------------------------------------------

function generateInsights(
  ratingCounts: number[], median: number, avg: number,
  serious: number, mega: number, ultra: number,
  titleMatches: number, n: number, avgQuality: number,
): Array<{ icon: string; type: string; text: string }> {
  const insights: Array<{ icon: string; type: string; text: string }> = [];

  if (ultra > 0) {
    insights.push({ icon: "🏢", type: "barrier", text: `${ultra} app${ultra > 1 ? "s" : ""} with 1M+ reviews — dominated by major brands` });
  } else if (mega > 0) {
    insights.push({ icon: "⚠️", type: "barrier", text: `${mega} app${mega > 1 ? "s" : ""} with 100K+ reviews — strong incumbents` });
  }

  if (avg > 0 && median > 0 && avg > median * 3) {
    insights.push({ icon: "📊", type: "info", text: `Review distribution is skewed — median (${median.toLocaleString()}) is much lower than mean (${Math.round(avg).toLocaleString()}). A few giants inflate the average.` });
  }

  if (titleMatches === 0 && n > 0) {
    insights.push({ icon: "🎯", type: "opportunity", text: "No competitors have this exact keyword in their title — potential title optimization gap" });
  } else if (titleMatches <= 2) {
    insights.push({ icon: "🎯", type: "opportunity", text: `Only ${titleMatches} of ${n} competitors use this keyword in their title` });
  } else {
    insights.push({ icon: "🔒", type: "barrier", text: `${titleMatches} of ${n} competitors already have this keyword in their title` });
  }

  if (avgQuality >= 4.5) {
    insights.push({ icon: "⭐", type: "barrier", text: `High quality bar — avg rating is ${avgQuality.toFixed(1)} stars. Users expect excellence.` });
  }

  const weakCount = ratingCounts.filter((r) => r < 1_000).length;
  if (weakCount >= 3) {
    insights.push({ icon: "💡", type: "opportunity", text: `${weakCount} of ${n} competitors have <1,000 reviews — beatable with a quality app` });
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Opportunity signals
// ---------------------------------------------------------------------------

function findOpportunities(
  competitors: CompetitorApp[], keyword: string,
  titleMatches: number, ratingCounts: number[], n: number,
): OpportunitySignal[] {
  const signals: OpportunitySignal[] = [];

  if (titleMatches === 0) {
    signals.push({ signal: "Title Gap", icon: "🎯", strength: "Strong", detail: "No top app has this keyword in its title. Exact-match title optimization could give you an edge in search rankings." });
  } else if (titleMatches <= Math.floor(n / 3)) {
    signals.push({ signal: "Title Gap", icon: "🎯", strength: "Moderate", detail: `Only ${titleMatches} of ${n} competitors have this keyword in their title. There's room for title optimization.` });
  }

  const weakApps = competitors.filter((c) => c.reviews < 1_000);
  if (weakApps.length > 0) {
    const weakest = weakApps.reduce((min, c) => c.reviews < min.reviews ? c : min, weakApps[0]);
    signals.push({
      signal: "Weak Competitors", icon: "📉",
      strength: weakApps.length >= 3 ? "Strong" : "Moderate",
      detail: `${weakApps.length} of ${n} apps have <1,000 reviews. The weakest (${weakest.name}) has only ${weakest.reviews.toLocaleString()} reviews — these positions are displaceable.`,
    });
  }

  const now = Date.now();
  const freshApps = competitors.filter((c) => {
    if (!c.releaseDate) return false;
    try { return (now - new Date(c.releaseDate).getTime()) < 365 * 86_400_000; }
    catch { return false; }
  });
  if (freshApps.length > 0) {
    signals.push({ signal: "Active Market", icon: "🆕", strength: "Moderate", detail: `${freshApps.length} app${freshApps.length > 1 ? "s" : ""} launched in the last 12 months — this market is still attracting new entrants.` });
  }

  const genres = new Set(competitors.map((c) => c.genre).filter(Boolean));
  if (genres.size >= 3) {
    const list = [...genres].sort().slice(0, 3).join(", ");
    const suffix = genres.size > 3 ? "..." : "";
    signals.push({ signal: "Cross-Genre", icon: "🔀", strength: "Moderate", detail: `Results span ${genres.size} genres (${list}${suffix}). The keyword isn't locked to one category — a well-positioned app in any genre could rank.` });
  }

  return signals;
}

// ---------------------------------------------------------------------------
// Full difficulty calculation
// ---------------------------------------------------------------------------

export function calculateDifficulty(
  competitors: CompetitorApp[],
  keyword: string,
): { score: number; breakdown: DifficultyBreakdown } {
  if (competitors.length === 0) {
    const emptyTier: TierAnalysis = {
      tierScore: 0, label: "No Data", minReviews: 0, weakestApp: "—",
      medianReviews: 0, weakCount: 0, freshCount: 0, titleKeywordCount: 0,
      totalApps: 0, highlights: [],
    };
    return {
      score: 0,
      breakdown: {
        totalScore: 0, rawTotal: 0, overrideReason: null, isBrandKeyword: false,
        brandName: null, ratingVolume: 0, reviewVelocity: 0, dominantPlayers: 0,
        ratingQuality: 0, marketAge: 0, publisherDiversity: 0, titleRelevance: 0,
        interpretation: "No Data", titleMatchCount: 0, medianReviews: 0, avgReviews: 0,
        insights: [], opportunitySignals: [],
        rankingTiers: { top5: emptyTier, top10: emptyTier, top20: emptyTier },
      },
    };
  }

  const n = competitors.length;
  const kwLower = keyword.toLowerCase().trim();
  const raw = computeRawDifficulty(competitors, keyword);
  let total = raw.rawScore;

  const topHalf = raw.ratingCounts.slice(0, Math.max(Math.floor(n / 2), 1));
  const serious = raw.ratingCounts.filter((r) => r > 10_000).length;
  const mega = topHalf.filter((r) => r > 100_000).length;
  const ultra = topHalf.filter((r) => r > 1_000_000).length;

  let overrideReason: string | null = null;
  const leaderReviews = competitors[0]?.reviews ?? 0;
  const matchRatio = n > 0 ? raw.titleMatchCount / n : 0;

  const [brand, brandName] = kwLower && competitors.length > 0
    ? isBrandKeyword(kwLower, competitors[0], competitors)
    : [false, null];

  // Post-processing
  const smallCaps: Record<number, number> = { 1: 10, 2: 20, 3: 31, 4: 40 };
  if (n in smallCaps && total > smallCaps[n]) {
    total = smallCaps[n];
    overrideReason = "small_result_set";
  }

  if (kwLower && n >= 2) {
    let leaderCap: number | null = null;
    if (leaderReviews < 1_000 && !brand) {
      leaderCap = Math.round(15 + 35 * Math.log10(leaderReviews + 1) / Math.log10(1001));
    }
    if (leaderCap !== null && total > leaderCap) {
      total = matchRatio > 0.2
        ? Math.round(leaderCap + (total - leaderCap) * matchRatio)
        : leaderCap;
      overrideReason = "weak_leader";
    }

    if (matchRatio < 0.2 && leaderReviews < 1_000 && !brand) {
      const ratioFactor = Math.min(1.0, 0.6 + 2.0 * matchRatio);
      const leaderFactor = Math.log10(leaderReviews + 1) / Math.log10(1001);
      const discount = Math.max(0.6, Math.min(1.0, ratioFactor + (1.0 - ratioFactor) * leaderFactor));
      const discounted = Math.max(1, Math.round(total * discount));
      if (discounted < total) { total = discounted; overrideReason = "backfill"; }
    }
  }

  total = Math.max(1, Math.min(100, total));
  const interpretation = scoreToLabel(total);

  let insights = generateInsights(
    raw.ratingCounts, raw.medianReviews, raw.avgReviews,
    serious, mega, ultra, raw.titleMatchCount, n, raw.avgQualityVal,
  );

  if (brand) {
    insights.unshift({
      icon: "🏷️", type: "info",
      text: `Brand keyword — '${kwLower}' matches publisher ${brandName}. Difficulty reflects the full competitive landscape.`,
    });
  }

  if (overrideReason && raw.rawScore !== total) {
    let overrideText: string;
    if (overrideReason === "small_result_set") {
      overrideText = `Score adjusted from ${raw.rawScore} → ${total}. Only ${n} app${n > 1 ? "s" : ""} found — very little competition exists.`;
    } else if (matchRatio > 0.3) {
      overrideText = `Score adjusted from ${raw.rawScore} → ${total}. The #1 app has only ${leaderReviews.toLocaleString()} reviews, but ${raw.titleMatchCount} of ${n} competitors target this keyword — real competition exists.`;
    } else {
      overrideText = `Score adjusted from ${raw.rawScore} → ${total}. The #1 app has only ${leaderReviews.toLocaleString()} reviews. The remaining results are generic backfill from broader search terms.`;
    }

    if (overrideReason !== "small_result_set" && matchRatio <= 0.3) {
      insights = insights.map((ins) => {
        if (["strong incumbents", "dominated by major brands", "High quality bar", "Users expect excellence"].some((p) => ins.text.includes(p))) {
          return { ...ins, text: ins.text + " (but most are backfill, not targeting this keyword)", type: "info" };
        }
        return ins;
      });
    }
    insights.unshift({ icon: "📍", type: "opportunity", text: overrideText });
  }

  const opportunitySignals = findOpportunities(competitors, kwLower, raw.titleMatchCount, raw.ratingCounts, n);

  const rankingTiers = computeRankingTiers(
    competitors, keyword, total, matchRatio, leaderReviews, brand,
  );

  return {
    score: total,
    breakdown: {
      totalScore: total, rawTotal: raw.rawScore, overrideReason,
      isBrandKeyword: brand, brandName,
      ratingVolume: raw.ratingVolume, reviewVelocity: raw.reviewVelocity,
      dominantPlayers: raw.dominantPlayers, ratingQuality: raw.ratingQuality,
      marketAge: raw.marketAge, publisherDiversity: raw.publisherDiversity,
      titleRelevance: raw.titleRelevance, interpretation,
      titleMatchCount: raw.titleMatchCount, medianReviews: raw.medianReviews,
      avgReviews: raw.avgReviews, insights, opportunitySignals, rankingTiers,
    },
  };
}

// ---------------------------------------------------------------------------
// Download Estimator
// ---------------------------------------------------------------------------

const POP_TO_SEARCHES: [number, number][] = [
  [5, 1], [10, 3], [15, 5], [20, 10], [25, 20], [30, 35], [35, 55],
  [40, 90], [45, 140], [50, 200], [55, 290], [60, 400], [65, 550],
  [70, 750], [75, 1_100], [80, 2_000], [85, 4_000], [90, 8_000],
  [95, 16_000], [100, 32_000],
];

const TTR: Record<number, number> = {
  1: 0.30, 2: 0.18, 3: 0.12, 4: 0.085, 5: 0.060,
  6: 0.045, 7: 0.033, 8: 0.025, 9: 0.019, 10: 0.013,
  11: 0.009, 12: 0.007, 13: 0.0055, 14: 0.0042, 15: 0.0033,
  16: 0.0025, 17: 0.0019, 18: 0.0014, 19: 0.0010, 20: 0.0007,
};

const CVR_LOW = 0.05;
const CVR_HIGH = 0.20;

const MARKET_SIZE: Record<string, number> = {
  us: 1.0, cn: 0.45, jp: 0.35, gb: 0.30, de: 0.25, fr: 0.22,
  kr: 0.20, br: 0.18, in: 0.15, ca: 0.15, au: 0.12, ru: 0.12,
  it: 0.12, es: 0.10, mx: 0.10, tw: 0.08, nl: 0.07, se: 0.06,
  ch: 0.06, pl: 0.05, tr: 0.05, th: 0.05, id: 0.05, be: 0.04,
  at: 0.04, no: 0.04, dk: 0.04, sg: 0.04, il: 0.04, ae: 0.04,
  sa: 0.04, ph: 0.04, my: 0.04, za: 0.03, ie: 0.03, fi: 0.03,
  pt: 0.03, nz: 0.03, cl: 0.03, ar: 0.03, co: 0.03, ng: 0.03,
  eg: 0.03, pk: 0.02, ke: 0.02, gh: 0.02, tz: 0.02, ug: 0.02,
};
const MARKET_SIZE_DEFAULT = 0.03;

function dailySearches(popularity: number): number {
  if (!popularity || popularity <= 0) return 0;
  const pts = POP_TO_SEARCHES;
  if (popularity <= pts[0][0]) return pts[0][1] * (popularity / pts[0][0]);
  if (popularity >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 1; i < pts.length; i++) {
    const [p0, s0] = pts[i - 1];
    const [p1, s1] = pts[i];
    if (popularity <= p1) {
      const ratio = (popularity - p0) / (p1 - p0);
      return s0 + ratio * (s1 - s0);
    }
  }
  return pts[pts.length - 1][1];
}

export function estimateDownloads(popularity: number, country = "us"): DownloadEstimate {
  let searches = dailySearches(popularity);
  const marketMult = MARKET_SIZE[(country || "us").toLowerCase()] ?? MARKET_SIZE_DEFAULT;
  searches *= marketMult;

  const positions: Array<{ pos: number; ttr: number; downloadsLow: number; downloadsHigh: number }> = [];
  for (let pos = 1; pos <= 20; pos++) {
    const ttr = TTR[pos] ?? 0.001;
    positions.push({
      pos,
      ttr: Math.round(ttr * 10000) / 100,
      downloadsLow: Math.round(searches * ttr * CVR_LOW * 100) / 100,
      downloadsHigh: Math.round(searches * ttr * CVR_HIGH * 100) / 100,
    });
  }

  function tierAvg(start: number, end: number) {
    const subset = positions.filter((p) => p.pos >= start && p.pos <= end);
    if (subset.length === 0) return { low: 0, high: 0 };
    return {
      low: Math.round(subset.reduce((s, p) => s + p.downloadsLow, 0) / subset.length * 100) / 100,
      high: Math.round(subset.reduce((s, p) => s + p.downloadsHigh, 0) / subset.length * 100) / 100,
    };
  }

  return {
    dailySearches: Math.round(searches * 100) / 100,
    positions,
    tiers: { top5: tierAvg(1, 5), top6_10: tierAvg(6, 10), top11_20: tierAvg(11, 20) },
  };
}

// ---------------------------------------------------------------------------
// Targeting Advice classifier
// ---------------------------------------------------------------------------

export function classifyTargeting(popularity: number | null, difficulty: number): TargetingAdvice {
  if (popularity !== null && popularity > 0) {
    if (popularity >= 40 && difficulty <= 40)
      return { label: "Sweet Spot", icon: "🎯", description: "High popularity + low difficulty — ideal keyword to target with good ASO." };
    if (popularity >= 40 && difficulty <= 60)
      return { label: "Good Target", icon: "✅", description: "Solid popularity with manageable difficulty." };
    if (popularity >= 40)
      return { label: "Worth Competing", icon: "⚔️", description: "High demand but tough competition. Consider long-tail variants." };
    if (popularity >= 30 && difficulty <= 40)
      return { label: "Hidden Gem", icon: "💎", description: "Moderate volume with little competition. Good for niche apps." };
    if (popularity >= 30 && difficulty <= 60)
      return { label: "Decent Option", icon: "👍", description: "Moderate demand and competition. Can work as a supporting keyword." };
    if (popularity < 30 && difficulty <= 30)
      return { label: "Low Volume", icon: "🔍", description: "Easy to rank but few people search for this. Best as a supporting keyword." };
    if (popularity < 30 && difficulty > 30)
      return { label: "Avoid", icon: "🚫", description: "Low search volume with notable competition." };
    return { label: "Challenging", icon: "⚔️", description: "Strong competition. Focus on long-tail variants." };
  }

  if (difficulty <= 25) return { label: "Sweet Spot", icon: "🎯", description: "Low competition — a well-optimized app can rank quickly." };
  if (difficulty <= 50) return { label: "Decent Option", icon: "👍", description: "Achievable with strong ASO." };
  if (difficulty <= 75) return { label: "Worth Competing", icon: "⚔️", description: "Consider long-tail variants." };
  return { label: "Avoid", icon: "🚫", description: "Dominated by established apps. Target easier keywords first." };
}

// ---------------------------------------------------------------------------
// Orchestrators
// ---------------------------------------------------------------------------

export async function analyzeKeyword(
  keyword: string,
  country = "us",
  trackId?: number,
): Promise<KeywordAnalysis> {
  const competitors = await searchiTunes(keyword, country, 25);
  const popularity = estimatePopularity(competitors, keyword) ?? 5;
  const { score: difficulty, breakdown } = calculateDifficulty(competitors, keyword);
  const downloads = estimateDownloads(popularity, country);
  const targeting = classifyTargeting(popularity, difficulty);

  let appRank: number | null = null;
  if (trackId) {
    const idx = competitors.findIndex((c) => c.trackId === trackId);
    if (idx >= 0) {
      appRank = idx + 1;
    } else {
      appRank = await findAppRank(keyword, trackId, country);
    }
  }

  const opportunity = Math.round(popularity * (100 - difficulty) / 100);

  return {
    keyword,
    popularity,
    difficulty,
    difficultyLabel: breakdown.interpretation,
    difficultyBreakdown: breakdown,
    targetingAdvice: targeting,
    dailySearches: downloads.dailySearches,
    downloadEstimate: downloads,
    rankingTiers: breakdown.rankingTiers,
    opportunity,
    appRank,
    competitors,
    opportunitySignals: breakdown.opportunitySignals,
    isBrand: breakdown.isBrandKeyword,
  };
}

/**
 * Analyze multiple keywords with concurrency control.
 * @param keywords - array of keywords to analyze
 * @param country - two-letter country code
 * @param trackId - optional iTunes trackId for rank tracking
 * @param concurrency - max parallel requests (default 5)
 */
export async function analyzeKeywords(
  keywords: string[],
  country = "us",
  trackId?: number,
  concurrency = 5,
): Promise<KeywordAnalysis[]> {
  const results: KeywordAnalysis[] = [];
  const queue = [...keywords];

  async function worker() {
    while (queue.length > 0) {
      const kw = queue.shift();
      if (!kw) break;
      try {
        const result = await analyzeKeyword(kw, country, trackId);
        results.push(result);
      } catch (err) {
        console.error(`Keyword analysis failed for "${kw}":`, err);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, keywords.length) }, () => worker());
  await Promise.all(workers);

  return results.sort((a, b) => b.opportunity - a.opportunity);
}

/**
 * Strip a full KeywordAnalysis down to the free tier view.
 */
export function toFreeView(full: KeywordAnalysis): KeywordAnalysisFree {
  return {
    keyword: full.keyword,
    popularity: full.popularity,
    difficulty: full.difficulty,
    difficultyLabel: full.difficultyLabel,
    targetingAdvice: full.targetingAdvice,
    dailySearches: full.dailySearches,
    opportunity: full.opportunity,
    appRank: full.appRank,
  };
}

// ---------------------------------------------------------------------------
// Country scanning (for Country Opportunity Finder)
// ---------------------------------------------------------------------------

export const SUPPORTED_COUNTRIES: [string, string][] = [
  ["us", "United States"], ["gb", "United Kingdom"], ["ca", "Canada"],
  ["au", "Australia"], ["de", "Germany"], ["fr", "France"],
  ["jp", "Japan"], ["kr", "South Korea"], ["cn", "China"],
  ["br", "Brazil"], ["in", "India"], ["mx", "Mexico"],
  ["es", "Spain"], ["it", "Italy"], ["nl", "Netherlands"],
  ["se", "Sweden"], ["no", "Norway"], ["dk", "Denmark"],
  ["fi", "Finland"], ["pt", "Portugal"], ["ru", "Russia"],
  ["tr", "Turkey"], ["sa", "Saudi Arabia"], ["ae", "UAE"],
  ["sg", "Singapore"], ["th", "Thailand"], ["id", "Indonesia"],
  ["ph", "Philippines"], ["vn", "Vietnam"], ["tw", "Taiwan"],
];

export interface CountryOpportunity {
  country: string;
  countryName: string;
  popularity: number;
  difficulty: number;
  difficultyLabel: string;
  opportunity: number;
  appRank: number | null;
  dailySearches: number;
  topCompetitor: string;
  topCompetitorReviews: number;
  targetingAdvice: TargetingAdvice;
}

export async function scanCountries(
  keyword: string,
  trackId?: number,
  concurrency = 5,
): Promise<CountryOpportunity[]> {
  const results: CountryOpportunity[] = [];
  const queue = [...SUPPORTED_COUNTRIES];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const [code, name] = item;
      try {
        const competitors = await searchiTunes(keyword, code, 25);
        const popularity = estimatePopularity(competitors, keyword) ?? 5;
        const { score: difficulty } = calculateDifficulty(competitors, keyword);
        const downloads = estimateDownloads(popularity, code);
        const targeting = classifyTargeting(popularity, difficulty);
        const opportunity = Math.round(popularity * (100 - difficulty) / 100);

        let appRank: number | null = null;
        if (trackId) {
          const idx = competitors.findIndex((c) => c.trackId === trackId);
          appRank = idx >= 0 ? idx + 1 : null;
        }

        results.push({
          country: code,
          countryName: name,
          popularity,
          difficulty,
          difficultyLabel: scoreToLabel(difficulty),
          opportunity,
          appRank,
          dailySearches: downloads.dailySearches,
          topCompetitor: competitors[0]?.name || "—",
          topCompetitorReviews: competitors[0]?.reviews || 0,
          targetingAdvice: targeting,
        });
      } catch (err) {
        console.error(`Country scan failed for ${code}:`, err);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, SUPPORTED_COUNTRIES.length) }, () => worker());
  await Promise.all(workers);

  return results.sort((a, b) => b.opportunity - a.opportunity);
}
