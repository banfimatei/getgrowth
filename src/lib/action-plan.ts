// Action Plan Generator
// Sources systematically integrated:
//   - app-store-optimization skill (keyword research, metadata, competitor analysis, scoring, A/B testing, localization, review analysis)
//   - app-store-screenshots skill (OCR indexing, First 3 Rule, gallery strategy, caption writing, styles, CPPs, pre-upload checklist)
//   - "Advanced App Store Optimization" (Phiture, 2022)

import type { AppData, AuditCategory } from "./aso-rules";
import type { AIAnalysis } from "./ai-analyzer";

export type DeepDiveSection =
  | "title"
  | "subtitle"
  | "keywords"
  | "shortDescription"
  | "description"
  | "screenshots"
  | "icon"
  | "ratings"
  | "video"
  | "maintenance"
  | "localization";

export interface ActionItem {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  effort: "quick" | "medium" | "heavy";
  category: string;
  title: string;
  currentState: string;
  action: string;
  brief: string;
  copyOptions?: string[];
  deliverables?: string[];
  impact: string;
  scoreBoost: string;
  aiStatus: "none" | "reviewed" | "available";
  deepDiveSection?: DeepDiveSection;
}

// ---------------------------------------------------------------------------
// App profiling — extracts real features, benefits, and context from app data
// ---------------------------------------------------------------------------

interface AppProfile {
  brand: string;
  coreFunction: string;
  features: string[];
  benefits: string[];
  keywords: string[];
  audience: string;
  categoryVerbs: string[];
}

const NOISE = new Set([
  "the", "and", "for", "with", "your", "you", "from", "that", "this",
  "app", "our", "will", "can", "has", "have", "are", "was", "been",
  "not", "all", "but", "its", "also", "more", "most", "very", "just",
  "any", "each", "than", "them", "into", "over", "such", "about",
  "now", "new", "get", "use", "one", "two", "like", "way", "even",
  "make", "take", "need", "let", "may", "try", "keep", "find", "give",
  "know", "want", "come", "see", "look", "well", "much", "still",
  "every", "own", "right", "here", "too", "does", "did", "had",
  "being", "those", "then", "what", "when", "where", "which", "who",
  "how", "some", "only", "other", "could", "would", "should", "their",
  "there", "these", "through", "during", "before", "after", "between",
  "while", "using", "used", "many", "available", "best", "great",
  "free", "download", "install", "update", "version", "please",
  "thank", "thanks", "enjoy", "love", "amazing", "awesome", "wonderful",
  "perfect", "excellent", "features", "feature", "include", "includes",
  "including", "support", "supports", "designed", "built", "whether",
  "https", "http", "www", "com", "org", "net", "experience",
]);

function isGarbage(word: string): boolean {
  if (word.length < 3 || NOISE.has(word)) return true;
  if (/^\d+$/.test(word) || /[./:@#]/.test(word)) return true;
  if (/^(ios|android|iphone|ipad|google|apple|play|store|app)$/i.test(word)) return true;
  return false;
}

function extractFeatures(description: string): string[] {
  const features: string[] = [];
  for (const line of description.split(/\n/)) {
    const t = line.trim();
    const listMatch = t.match(/^[\u2022\-*\u2605\u2713\u2714\u25BA\u25B8•]\s*(.{6,100})/);
    if (listMatch) { features.push(listMatch[1].trim()); continue; }
    const emojiMatch = t.match(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*(.{6,100})/u);
    if (emojiMatch) { features.push(emojiMatch[1].trim()); continue; }
    if (t.length > 5 && t.length < 60 && /^[A-Z]/.test(t) && !t.endsWith(".")) {
      const wc = t.split(/\s+/).length;
      if (wc >= 2 && wc <= 8) features.push(t);
    }
  }
  return features.slice(0, 12);
}

function extractBenefits(description: string): string[] {
  const benefits: string[] = [];
  const sentences = description.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  const patterns = [
    /listen to (.{5,50})/i, /stream (.{5,50})/i, /discover (.{5,50})/i,
    /browse (.{5,50})/i, /enjoy (.{5,50})/i, /access (.{5,50})/i,
    /explore (.{5,50})/i, /track (.{5,50})/i, /manage (.{5,50})/i,
    /create (.{5,50})/i, /save (.{5,50})/i, /share (.{5,50})/i,
    /customize (.{5,50})/i, /personalize (.{5,50})/i, /connect (.{5,50})/i,
    /(\d+\+?\s+\w[\w\s]{3,35})/i,
    /(?:high[- ]?quality|hifi|hi-fi|hd|premium)\s+(\w[\w\s]{3,30})/i,
    /(?:curated|handpicked|hand-picked)\s+(\w[\w\s]{3,30})/i,
    /(?:offline|background)\s+(\w[\w\s]{3,30})/i,
  ];
  for (const s of sentences.slice(0, 25)) {
    for (const p of patterns) {
      const m = s.match(p);
      if (m) {
        const phrase = (m[1] || m[0]).trim();
        if (phrase.length > 5 && phrase.length < 60) benefits.push(phrase);
      }
    }
  }
  return [...new Set(benefits)].slice(0, 10);
}

function extractKeywords(description: string, title: string): string[] {
  const words = `${title} ${description}`.toLowerCase().replace(/[^a-z0-9\s\-']/g, " ").split(/\s+/).filter(w => !isGarbage(w));
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  return [...freq.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).map(([w]) => w).slice(0, 15);
}

const CAT_CTX: Record<string, { audience: string; verbs: string[] }> = {
  "Music": { audience: "music listeners", verbs: ["Listen to", "Stream", "Discover"] },
  "Music & Audio": { audience: "music listeners", verbs: ["Listen to", "Stream", "Discover"] },
  "Entertainment": { audience: "entertainment seekers", verbs: ["Watch", "Stream", "Discover"] },
  "Productivity": { audience: "professionals", verbs: ["Organize", "Track", "Manage"] },
  "Health & Fitness": { audience: "health-conscious users", verbs: ["Track", "Monitor", "Achieve"] },
  "Education": { audience: "learners", verbs: ["Learn", "Study", "Master"] },
  "Finance": { audience: "money managers", verbs: ["Track", "Save", "Invest"] },
  "Photo & Video": { audience: "creators", verbs: ["Edit", "Create", "Share"] },
  "Social Networking": { audience: "social users", verbs: ["Connect", "Share", "Discover"] },
  "Travel": { audience: "travelers", verbs: ["Explore", "Book", "Navigate"] },
  "Shopping": { audience: "shoppers", verbs: ["Shop", "Save", "Discover"] },
  "Food & Drink": { audience: "food lovers", verbs: ["Discover", "Order", "Cook"] },
  "Games": { audience: "gamers", verbs: ["Play", "Compete", "Unlock"] },
  "Sports": { audience: "sports fans", verbs: ["Follow", "Track", "Watch"] },
  "News": { audience: "informed readers", verbs: ["Read", "Follow", "Stay Updated on"] },
  "Weather": { audience: "planners", verbs: ["Check", "Track", "Plan Around"] },
  "Utilities": { audience: "power users", verbs: ["Manage", "Optimize", "Control"] },
  "Navigation": { audience: "commuters", verbs: ["Navigate", "Find", "Avoid"] },
  "Lifestyle": { audience: "lifestyle enthusiasts", verbs: ["Discover", "Organize", "Improve"] },
  "Business": { audience: "business professionals", verbs: ["Manage", "Collaborate", "Analyze"] },
  "Medical": { audience: "patients and practitioners", verbs: ["Track", "Monitor", "Manage"] },
  "Reference": { audience: "researchers", verbs: ["Look Up", "Search", "Reference"] },
  "Book": { audience: "readers", verbs: ["Read", "Discover", "Listen to"] },
};

function buildProfile(data: AppData): AppProfile {
  const brand = data.title.split(/[\-:|–—]/)[0].trim();
  const rest = data.title.replace(brand, "").replace(/^[\s\-:|–—]+/, "").trim();
  const coreFunction = rest || data.category || "app";
  const ctx = CAT_CTX[data.category] || { audience: "users", verbs: ["Discover", "Explore", "Try"] };
  return {
    brand,
    coreFunction,
    features: extractFeatures(data.description),
    benefits: extractBenefits(data.description),
    keywords: extractKeywords(data.description, data.title),
    audience: ctx.audience,
    categoryVerbs: ctx.verbs,
  };
}

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
function tc(s: string): string {
  const minor = new Set(["a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"]);
  return s.split(/\s+/).map((w, i) => i === 0 || !minor.has(w.toLowerCase()) ? cap(w.toLowerCase()) : w.toLowerCase()).join(" ");
}

const CAPTION_STOP = new Set([
  "a", "an", "the", "of", "in", "for", "to", "that", "with", "from",
  "and", "or", "but", "is", "are", "you", "your", "our", "all", "its",
  "some", "many", "different", "various", "new", "best", "great", "way",
  "brings", "bring", "allows", "within", "can", "their", "has", "have",
  "been", "being", "will", "would", "so", "at", "on", "by", "up",
  "it", "do", "does", "just", "also", "very", "really", "every",
  "listen", "get", "use", "set", "let",
]);

function condenseCaption(raw: string, maxWords = 4, maxLen = 28): string {
  let text = raw
    .replace(/\bover\s+(\d+)/gi, "$1+")
    .replace(/\bmore than\s+(\d+)/gi, "$1+")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[^a-zA-Z0-9+\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = text
    .split(/\s+/)
    .filter(t => t.length > 1 && !CAPTION_STOP.has(t.toLowerCase()));

  let result = "";
  let count = 0;
  for (const t of tokens) {
    if (count >= maxWords) break;
    const word = count === 0 ? cap(t) : t;
    const next = result ? `${result} ${word}` : word;
    if (next.length > maxLen) break;
    result = next;
    count++;
  }

  if (!result && tokens.length > 0) {
    result = tokens.slice(0, 3).map((t, i) => i === 0 ? cap(t) : t).join(" ");
    if (result.length > maxLen) {
      result = tokens.slice(0, 2).map((t, i) => i === 0 ? cap(t) : t).join(" ");
    }
  }

  return result || cap(raw.split(/\s+/)[0] || "Feature");
}

function sceneDirection(feature: string | undefined, fallback: string): string {
  if (!feature) return fallback;
  let text = feature;
  const period = text.indexOf(".");
  if (period > 10 && period < 70) text = text.substring(0, period);
  if (text.length > 70) {
    const words = text.split(/\s+/);
    text = "";
    for (const w of words) {
      if ((text + " " + w).trim().length > 70) break;
      text = (text + " " + w).trim();
    }
  }
  return text;
}

// ---------------------------------------------------------------------------
// TITLE BRIEF
// Sources: ASO skill §2 metadata, book Ch.2
// ---------------------------------------------------------------------------

function titleBrief(data: AppData, p: AppProfile, cats: AuditCategory[], ai?: AIAnalysis | null): ActionItem[] {
  const cat = cats.find(c => c.id === "title");
  if (!cat) return [];
  const lengthR = cat.results.find(r => r.ruleId === "title-length");
  const kwR = cat.results.find(r => r.ruleId === "title-keywords");
  const frontR = cat.results.find(r => r.ruleId === "title-frontload");
  const remaining = 30 - data.title.length;
  const needsKw = kwR && kwR.score < 60;
  const needsLen = lengthR && lengthR.score < 90 && remaining > 3;
  const needsFront = frontR && frontR.score < 60;
  const hasAiTitle = ai?.title && ai.title.suggestions.length > 0;
  if (!needsKw && !needsLen && !needsFront && !hasAiTitle) return [];

  const titleWords = new Set(data.title.toLowerCase().split(/[\s\-:|–—]+/).filter(w => w.length > 2));
  const available = p.keywords.filter(w => !titleWords.has(w)).slice(0, 6);

  const opts: string[] = [];
  if (needsKw && available.length >= 2) {
    opts.push(`${p.brand} - ${tc(available[0])} & ${tc(available[1])}`.substring(0, 30));
    opts.push(`${tc(available[0])} ${tc(available[1])} - ${p.brand}`.substring(0, 30));
    opts.push(`${p.brand}: ${tc(available[0])} ${tc(available[1])}`.substring(0, 30));
  } else if (needsFront && available.length >= 1) {
    opts.push(`${tc(available[0])} - ${p.brand}`.substring(0, 30));
    opts.push(`${tc(p.coreFunction)} | ${p.brand}`.substring(0, 30));
  } else if (needsLen && available[0]) {
    opts.push(`${data.title} & ${tc(available[0])}`.substring(0, 30));
  }
  // AI suggestions override deterministic ones when available
  if (hasAiTitle) {
    for (const s of ai!.title.suggestions) {
      if (s.length <= 30 && s.length > 0) opts.push(s);
    }
  }
  const validOpts = [...new Set(opts)].filter(o => o.length > 0 && o.length <= 30);

  let b = "";
  if (hasAiTitle) {
    b += `**AI Analysis:**\n`;
    for (const issue of ai!.title.issues) b += `  \u2022 ${issue}\n`;
    b += `\n${ai!.title.reasoning}\n\n`;
  }
  b += `**Current:** "${data.title}" (${data.title.length}/30 chars)\n`;
  b += `**Brand:** "${p.brand}" | **Descriptive keywords:** ${[...titleWords].filter(w => w.length > 2 && !p.brand.toLowerCase().includes(w)).map(w => `"${w}"`).join(", ") || "none"}\n`;
  b += `**Missing high-value keywords:** ${available.slice(0, 4).map(w => `"${w}"`).join(", ")}\n\n`;

  // Per ASO skill: "Front-load keywords in title (first 15 chars most important)"
  // Per ASO skill: "Write for humans first, SEO second"
  if (needsKw) {
    b += `Your title is brand-heavy with limited keyword coverage. Users searching for "${available[0] || data.category.toLowerCase()}" won't find your app unless those terms appear in the title or subtitle.\n\n`;
    b += `**Title format options** (per ASO best practice: "Brand \u2013 Keyword Phrase"):\n`;
    b += `  \u2022 "Brand \u2013 Keyword Phrase" \u2014 safe, clear separation\n`;
    b += `  \u2022 "Keyword Phrase \u2013 Brand" \u2014 if brand isn't a household name, this front-loads search terms\n`;
    b += `  \u2022 "Brand: Keyword Phrase" \u2014 common alternative\n`;
  } else if (needsFront) {
    b += `"${p.brand}" occupies the first 15 characters \u2014 the most visible and heavily weighted zone. Unless it's a household name, move keywords first.\n`;
  } else if (remaining > 0) {
    b += `You have ${remaining} unused characters in your most valuable metadata field. Every unused character is a missed ranking opportunity.\n`;
  } else if (hasAiTitle) {
    b += `Your title uses all 30 characters, but keyword selection can be improved. Swapping low-value terms for higher-volume alternatives can boost rankings without changing length.\n`;
  }

  b += `\n**Rules:**\n`;
  b += `  \u2022 Use every available character (30 max)\n`;
  b += `  \u2022 Front-load keywords in first 15 chars (most weight, always visible in search)\n`;
  b += `  \u2022 Write for humans first, SEO second \u2014 it must read naturally\n`;
  b += `  \u2022 No superlatives ("#1", "best", "top") \u2014 stores reject these\n`;
  b += `  \u2022 ${data.platform === "ios" ? "Apple combines title + subtitle + keyword field \u2014 don't duplicate across them" : "Google extracts keywords from title + description \u2014 title keywords carry the most weight"}`;

  return [{
    id: "title-optimize",
    priority: needsKw ? "critical" : "high",
    effort: "quick",
    category: "Title",
    title: needsKw ? "Restructure title with high-value keywords" : needsFront ? "Front-load keywords before brand name" : remaining > 0 ? `Fill ${remaining} unused title characters` : "Optimize title keyword strategy",
    currentState: `"${data.title}" (${data.title.length}/30 chars)`,
    action: b, brief: b,
    copyOptions: validOpts.length > 0 ? validOpts : undefined,
    deliverables: [
      "Draft 2-3 title variants (30 chars max each)",
      `Update in ${data.platform === "ios" ? "App Store Connect" : "Google Play Console"}`,
      data.platform === "ios" ? "Requires app update submission \u2014 coordinate with next release" : "Takes effect immediately",
      "A/B test for 7+ days before committing (Apple PPO or Google Play Experiments)",
    ],
    impact: "Title is the single most weighted metadata field for search ranking on both stores",
    scoreBoost: needsKw ? "+30-50 on Title score" : "+10-20 on Title score",
    aiStatus: hasAiTitle ? "reviewed" : "available",
    deepDiveSection: "title",
  }];
}

// ---------------------------------------------------------------------------
// SUBTITLE BRIEF (iOS)
// Sources: ASO skill §2 metadata, book Ch.2
// ---------------------------------------------------------------------------

function subtitleBrief(data: AppData, p: AppProfile, cats: AuditCategory[], ai?: AIAnalysis | null): ActionItem[] {
  if (data.platform !== "ios") return [];
  const cat = cats.find(c => c.id === "subtitle");
  if (!cat) return [];
  const lengthR = cat.results.find(r => r.ruleId === "subtitle-length");
  const dupeR = cat.results.find(r => r.ruleId === "subtitle-no-duplicate");
  const empty = !data.subtitle || data.subtitle.length === 0;
  const hasDupes = dupeR && dupeR.score < 70;
  const hasAiSub = ai?.subtitle && ai.subtitle.suggestions.length > 0;
  if (lengthR && !empty && lengthR.score >= 90 && !hasDupes && !hasAiSub) return [];

  const titleWords = new Set(data.title.toLowerCase().split(/[\s\-:,|–—]+/).filter(w => w.length > 2));
  const unique = p.keywords.filter(w => !titleWords.has(w) && w.length > 2).slice(0, 8);
  const verb = p.categoryVerbs[0] || "Discover";

  const opts: string[] = [];
  if (hasAiSub) {
    for (const s of ai!.subtitle!.suggestions) {
      if (s.length <= 30 && s.length > 0) opts.push(s);
    }
  }
  if (unique.length >= 2) opts.push(`${verb} ${tc(unique[0])} & ${tc(unique[1])}`.substring(0, 30));
  if (p.benefits[0]) opts.push(condenseCaption(p.benefits[0], 5, 30));
  if (unique.length >= 3) opts.push(`${tc(unique[0])}, ${tc(unique[1])} & More`.substring(0, 30));
  const validOpts = [...new Set(opts)].filter(o => o.length > 0 && o.length <= 30);

  let b = "";
  if (hasAiSub) {
    b += `**AI Analysis:**\n`;
    for (const issue of ai!.subtitle!.issues) b += `  \u2022 ${issue}\n`;
    b += `\n${ai!.subtitle!.reasoning}\n\n`;
  }
  if (empty) {
    b += `**Current subtitle:** (empty \u2014 not set)\n`;
    b += `**Title words to avoid repeating:** ${[...titleWords].filter(w => w.length > 2).map(w => `"${w}"`).join(", ")}\n`;
    b += `**Available unique keywords:** ${unique.slice(0, 5).map(w => `"${w}"`).join(", ")}\n\n`;
    b += `The subtitle is iOS's second-most weighted metadata field. Apple allocates ~160 indexable characters across title (30) + subtitle (30) + keyword field (100). Leaving the subtitle empty wastes 30 of those characters.\n`;
  } else {
    const dupes = data.subtitle!.toLowerCase().split(/[\s\-:,|]+/).filter(w => titleWords.has(w) && w.length > 2);
    b += `**Current subtitle:** "${data.subtitle}" (${data.subtitle!.length}/30 chars)\n`;
    if (dupes.length > 0) b += `**Duplicated from title:** ${dupes.map(w => `"${w}"`).join(", ")} \u2014 wasting indexable space\n`;
    b += `**Keywords to swap in:** ${unique.slice(0, 5).map(w => `"${w}"`).join(", ")}\n\n`;
    if (hasDupes) {
      b += `Apple's algorithm gives zero extra weight for repeating words across title and subtitle. Replace duplicated words with fresh keywords.\n`;
    } else {
      b += `You have ${30 - data.subtitle!.length} unused characters. Fill them with keywords that don't appear in your title.\n`;
    }
  }
  b += `\n**Subtitle rules** (per ASO skill):\n`;
  b += `  \u2022 30 characters max\n`;
  b += `  \u2022 Zero word overlap with title (Apple combines them automatically)\n`;
  b += `  \u2022 Don't repeat the category name (already indexed for free)\n`;
  b += `  \u2022 Benefit-first language: what the user gets, not what the app is\n`;
  b += `  \u2022 Use every character \u2014 unused space is wasted ranking potential`;

  return [{
    id: "subtitle-optimize",
    priority: empty ? "critical" : "high", effort: "quick", category: "Subtitle",
    title: empty ? "Add a subtitle \u2014 your second most valuable field is empty" : "Optimize subtitle keywords",
    currentState: empty ? "No subtitle set" : `"${data.subtitle}" (${data.subtitle!.length}/30 chars)`,
    action: b, brief: b,
    copyOptions: validOpts.length > 0 ? validOpts : undefined,
    deliverables: [
      "Draft subtitle (30 chars max, zero title-word overlap)",
      "Update in App Store Connect \u203A App Information \u203A Subtitle",
      "Requires app update submission for review",
    ],
    impact: "Unlocks keyword rankings for terms not reachable via title alone",
    scoreBoost: empty ? "+60-90 on Subtitle score" : "+15-30 on Subtitle score",
    aiStatus: hasAiSub ? "reviewed" : "available",
    deepDiveSection: "subtitle",
  }];
}

// ---------------------------------------------------------------------------
// iOS KEYWORD FIELD BRIEF (NEW)
// Sources: ASO skill §2 metadata — "Apple keyword field: no plurals, no duplicates, no spaces between commas"
// ---------------------------------------------------------------------------

function keywordFieldBrief(data: AppData, p: AppProfile, cats: AuditCategory[], ai?: AIAnalysis | null): ActionItem[] {
  if (data.platform !== "ios") return [];

  const hasAiKw = ai?.keywordField && ai.keywordField.suggestedKeywords.length > 0;

  // Surface when: AI has suggestions, OR metadata signals suggest developer
  // hasn't done thorough ASO work.
  const titleCat = cats.find(c => c.id === "title");
  const subtitleCat = cats.find(c => c.id === "subtitle");
  const titleScore = titleCat?.score ?? 100;
  const subtitleScore = subtitleCat?.score ?? 100;
  if (titleScore >= 75 && subtitleScore >= 75 && !hasAiKw) return [];

  const titleWords = new Set(data.title.toLowerCase().split(/[\s\-:,|–—]+/).filter(w => w.length > 2));
  const subtitleWords = new Set((data.subtitle || "").toLowerCase().split(/[\s\-:,|–—]+/).filter(w => w.length > 2));
  const usedWords = new Set([...titleWords, ...subtitleWords]);

  let b = `**Note:** We cannot see your keyword field contents (private to App Store Connect). This guidance assumes it may need optimization based on other metadata gaps detected in your title and subtitle.\n\n`;

  if (hasAiKw) {
    b += `**AI Keyword Recommendations:**\n`;
    b += `${ai!.keywordField!.reasoning}\n\n`;
    b += `**Suggested keywords** (single words to add): ${ai!.keywordField!.suggestedKeywords.join(", ")}\n`;
    if (ai!.keywordField!.avoidKeywords.length > 0) {
      b += `**Avoid** (already covered or wasteful): ${ai!.keywordField!.avoidKeywords.join(", ")}\n`;
    }
    b += `\n`;
  }

  b += `**Field:** 100 characters, comma-separated, invisible to users\n`;
  b += `**Budget:** title (30) + subtitle (30) + keyword field (100) = 160 indexable characters total\n`;
  b += `**Words already used in title/subtitle:** ${[...usedWords].filter(w => w.length > 2).map(w => `"${w}"`).join(", ")}\n\n`;

  b += `**Apple keyword field rules** (per ASO skill):\n`;
  b += `  \u2022 Comma-separated, **no spaces after commas** (spaces waste characters)\n`;
  b += `  \u2022 **No plurals** \u2014 Apple handles singular/plural automatically\n`;
  b += `  \u2022 **No words already in title or subtitle** \u2014 Apple combines all three; duplicates waste budget\n`;
  b += `  \u2022 **No category name** \u2014 already indexed automatically\n`;
  b += `  \u2022 **Single words > phrases** \u2014 Apple recombines single words into phrases, so "music,streaming" covers "music streaming" and "streaming music"\n`;
  b += `  \u2022 **No competitor brand names** \u2014 violates guidelines and can get your app rejected\n`;
  b += `  \u2022 Use all 100 characters \u2014 every unused character is wasted ranking potential\n\n`;

  b += `**Strategy:** Fill with single keywords that complement your title and subtitle. Prioritize terms your target ${p.audience} would search for. Include:\n`;
  b += `  \u2022 Synonyms of your title keywords\n`;
  b += `  \u2022 Related terms Apple might not cluster automatically\n`;
  b += `  \u2022 Long-tail keyword components (individual words that form useful phrases)\n`;
  b += `  \u2022 Misspellings of your brand name (if commonly misspelled)\n\n`;

  b += `**Research cadence:** Per ASO skill: "Research and update quarterly." Each app update is an opportunity to rotate low-performing keywords.`;

  return [{
    id: "keyword-field",
    priority: "low", effort: "medium", category: "Keyword Field (iOS)",
    title: "Audit the 100-character keyword field",
    currentState: "Field contents not visible \u2014 review in App Store Connect",
    action: b, brief: b,
    deliverables: [
      "Open App Store Connect \u203A Keywords and review current contents",
      "Remove any words duplicated from title or subtitle",
      "Remove plurals, category name, and competitor brands",
      "Format: single words, comma-separated, no spaces",
      "Fill all 100 characters with researched keywords",
      "Rotate underperforming keywords each quarter",
    ],
    impact: "The keyword field is the third pillar of iOS indexing \u2014 100 invisible characters dedicated to search ranking. We cannot assess its current state, so review it directly.",
    scoreBoost: "Not directly scored (field is private)",
    aiStatus: hasAiKw ? "reviewed" : "available",
    deepDiveSection: "keywords",
  }];
}

// ---------------------------------------------------------------------------
// SHORT DESCRIPTION BRIEF (Android)
// ---------------------------------------------------------------------------

function shortDescBrief(data: AppData, p: AppProfile, cats: AuditCategory[], ai?: AIAnalysis | null): ActionItem[] {
  if (data.platform !== "android") return [];
  const cat = cats.find(c => c.id === "short-description");
  if (!cat) return [];
  const rule = cat.results[0];
  const hasAiShort = ai?.shortDescription && ai.shortDescription.suggestions.length > 0;
  if (!rule || (rule.score >= 80 && !hasAiShort)) return [];

  const verb = p.categoryVerbs[0] || "Discover";
  const opts: string[] = [];

  if (hasAiShort) {
    for (const s of ai!.shortDescription!.suggestions) {
      if (s.length <= 80 && s.length > 0) opts.push(s);
    }
  }

  const condensedFeat = p.features[0] ? condenseCaption(p.features[0], 6, 50) : "";
  if (condensedFeat) opts.push(`${verb} ${p.coreFunction.toLowerCase()}. ${condensedFeat}.`.substring(0, 80));
  opts.push(`${p.brand}: ${p.coreFunction} for ${p.audience}.`.substring(0, 80));

  let b = "";
  if (hasAiShort) {
    b += `**AI Analysis:**\n`;
    for (const issue of ai!.shortDescription!.issues) b += `  \u2022 ${issue}\n`;
    b += `\n${ai!.shortDescription!.reasoning}\n\n`;
  }
  b += `**Current:** ${data.shortDescription ? `"${data.shortDescription}" (${data.shortDescription.length}/80 chars)` : "(empty)"}\n`;
  b += `**Primary keywords:** ${p.keywords.slice(0, 5).map(w => `"${w}"`).join(", ")}\n\n`;
  b += `The short description appears in Google Play search results and is the second-most indexed text field. Front-load your primary keyword in the first 3 words.\n\n`;
  b += `**Rules:**\n`;
  b += `  \u2022 80 chars max \u2014 use every character\n`;
  b += `  \u2022 Front-load primary keyword\n`;
  b += `  \u2022 Write a compelling pitch, not a keyword list\n`;
  b += `  \u2022 Must read naturally \u2014 this is the first text users see in search results`;

  return [{
    id: "short-desc-optimize",
    priority: data.shortDescription ? "high" : "critical", effort: "quick", category: "Short Description",
    title: data.shortDescription ? "Rewrite short description" : "Add a short description",
    currentState: data.shortDescription ? `"${data.shortDescription}" (${data.shortDescription.length}/80 chars)` : "Not set",
    action: b, brief: b,
    copyOptions: opts.length > 0 ? opts : undefined,
    deliverables: [
      "Write 2-3 variants (80 chars max each)",
      "Update in Google Play Console \u203A Store Listing \u203A Short description",
      "Run a Store Listing Experiment to A/B test variants",
    ],
    impact: "Directly affects Google Play search ranking and search result click-through rate",
    scoreBoost: "+30-60 on Short Description score",
    aiStatus: hasAiShort ? "reviewed" : "available",
    deepDiveSection: "shortDescription",
  }];
}

// ---------------------------------------------------------------------------
// DESCRIPTION BRIEF
// Sources: ASO skill §2, book Ch.2 — "keywords mentioned frequently and earlier have been found more relevant"
// ---------------------------------------------------------------------------

function descriptionBrief(data: AppData, p: AppProfile, cats: AuditCategory[], ai?: AIAnalysis | null): ActionItem[] {
  const cat = cats.find(c => c.id === "description");
  if (!cat) return [];
  const scores = cat.results.map(r => r.score);
  if (scores.every(s => s >= 75) && !ai?.description?.fullRewrite) return [];

  const desc = data.description;
  const first200 = desc.substring(0, 200).replace(/\n/g, " ");
  const wc = desc.split(/\s+/).length;
  const hasBullets = /[\u2022\-*]/.test(desc);
  const hasParagraphs = (desc.match(/\n\n/g) || []).length >= 2;
  const last200 = desc.substring(desc.length - 200).toLowerCase();
  const hasCTA = ["download", "try", "get started", "start", "join", "today", "now"].some(w => last200.includes(w));

  const hasAiRewrite = ai?.description?.fullRewrite && ai.description.fullRewrite.length > 100;
  const hasAiDesc = hasAiRewrite || (ai?.description && ai.description.openingHook.length > 0);

  let b = "";

  // ── Section 1: Current state analysis ──
  b += `**Current description analysis:**\n`;
  b += `  \u2022 Length: ${desc.length} chars, ~${wc} words\n`;
  b += `  \u2022 Structure: ${hasParagraphs ? "\u2705 paragraphs" : "\u274C no paragraph breaks"} | ${hasBullets ? "\u2705 bullet points" : "\u274C no bullet points"} | ${hasCTA ? "\u2705 CTA" : "\u274C no closing CTA"}\n`;
  b += `  \u2022 Opening: "${first200}${desc.length > 200 ? "..." : ""}"\n`;

  if (hasAiDesc && ai!.description.structureIssues && ai!.description.structureIssues.length > 0) {
    b += `\n**Issues found in current description:**\n`;
    for (const issue of ai!.description.structureIssues) b += `  \u274C ${issue}\n`;
  }

  if (hasAiDesc && ai!.description.keywordGaps.length > 0) {
    b += `\n**Missing keywords:** ${ai!.description.keywordGaps.map(w => `"${w}"`).join(", ")}\n`;
  }

  // ── Section 2: Full rewrite (AI) or structural guidance (deterministic) ──
  if (hasAiRewrite) {
    b += `\n---\n\n`;
    b += `**AI-written description** (ready to copy-paste):\n\n`;
    b += `${ai!.description.fullRewrite}\n`;
    b += `\n---\n\n`;
    b += `**Breakdown of the rewrite above:**\n\n`;
    if (ai!.description.openingHook) {
      b += `**Opening hook:** ${ai!.description.openingHook}\n\n`;
    }
    if (ai!.description.featureBullets.length > 0) {
      b += `**Feature bullets:**\n`;
      for (const bullet of ai!.description.featureBullets) b += `${bullet}\n`;
      b += `\n`;
    }
    if (ai!.description.cta) {
      b += `**CTA:** ${ai!.description.cta}\n`;
    }

    if (data.platform === "android" && ai!.description.keywordDensity && ai!.description.keywordDensity.length > 0) {
      b += `\n**Keyword density in the rewrite** (Google indexes full description):\n`;
      for (const kd of ai!.description.keywordDensity) {
        const status = kd.currentCount >= kd.recommendedCount ? "\u2705" : "\u274C";
        b += `  ${status} "${kd.keyword}": ${kd.currentCount}x \u2192 target ${kd.recommendedCount}x\n`;
      }
    }
  } else if (hasAiDesc) {
    b += `\n---\n\n`;
    b += `**AI-suggested description sections:**\n\n`;
    b += `**Opening hook:**\n${ai!.description.openingHook}\n\n`;
    if (ai!.description.featureBullets.length > 0) {
      b += `**Feature bullets:**\n`;
      for (const bullet of ai!.description.featureBullets) b += `${bullet}\n`;
      b += `\n`;
    }
    b += `**CTA:** ${ai!.description.cta}\n`;
  } else {
    // Deterministic fallback — structural guidance only
    const verb = p.categoryVerbs[0] || "Discover";
    b += `\n---\n\n`;
    b += `\u26A0\uFE0F AI analysis was unavailable \u2014 showing structural guidance instead.\n\n`;
    b += `**Recommended 4-section structure:**\n\n`;
    b += `**1. Opening hook** (first 3 lines visible before "Read more"):\n`;
    b += `  Lead with a single compelling sentence that front-loads primary keywords.\n`;
    b += `  \u2022 Avoid: "Welcome to...", "This app is...", "We are..."\n`;
    b += `  \u2022 Pattern: "[Action verb] [specific outcome] with [Brand]."\n`;
    b += `  \u2022 Example: "${verb} ${p.coreFunction.toLowerCase()} with ${p.brand}."\n\n`;

    b += `**2. Feature bullets** (scannable, benefit-focused):\n`;
    if (p.features.length > 0) {
      for (const f of p.features.slice(0, 5)) {
        const clean = f.length > 80 ? f.substring(0, f.lastIndexOf(" ", 80)) : f;
        b += `  \u2022 ${clean}\n`;
      }
    } else {
      b += `  \u2022 [Key feature] \u2014 [benefit to user]\n`;
    }
    b += `\n**3. Social proof:**\n`;
    if (data.ratingsCount > 100) {
      b += `  ${data.rating.toFixed(1)}\u2605 from ${data.ratingsCount.toLocaleString()} ratings. Add: press mentions, awards, download milestones.\n\n`;
    } else {
      b += `  Add: ratings, press mentions, awards, download milestones.\n\n`;
    }
    b += `**4. CTA:** "Download ${p.brand} today \u2014 [one-line benefit]."\n`;
  }

  // ── Platform-specific notes ──
  if (data.platform === "android") {
    b += `\n**Keyword density** (Google Play indexes full description):\n`;
    for (const w of p.keywords.slice(0, 4)) {
      const count = (desc.toLowerCase().split(w).length - 1);
      b += `  "${w}": currently ${count}x \u2192 target 3-5x (naturally placed)\n`;
    }
  } else {
    b += `\n**Note:** iOS description is NOT indexed for search, but it directly impacts conversion rate and is indexed by web search engines.`;
  }

  const deliverables: string[] = [];
  if (hasAiRewrite) {
    deliverables.push("Review the AI-written description above and adapt for brand voice");
    deliverables.push(`Paste into ${data.platform === "ios" ? "App Store Connect \u203A Description" : "Google Play Console \u203A Full description"}`);
    if (data.platform === "ios") {
      deliverables.push("Requires app update submission to take effect");
    }
  } else {
    deliverables.push("Rewrite using the 4-section structure (hook \u2192 features \u2192 social proof \u2192 CTA)");
    deliverables.push(`Target ${data.platform === "android" ? "2,500-4,000" : "1,000-4,000"} chars`);
    if (data.platform === "android") deliverables.push("Front-load primary keywords, use 3-5x each naturally");
    deliverables.push(`Update in ${data.platform === "ios" ? "App Store Connect \u203A Description" : "Google Play Console \u203A Full description"}`);
  }
  deliverables.push("A/B test new vs current description (Google Play Experiments or track conversion via App Store Connect analytics)");

  return [{
    id: "desc-rewrite",
    priority: data.platform === "android" ? "high" : "medium", effort: "medium", category: "Description",
    title: hasAiRewrite ? "Replace description with AI-optimized version" : "Rewrite description with optimized structure and keywords",
    currentState: `${desc.length} chars, ~${wc} words \u2014 ${!hasBullets ? "no bullets, " : ""}${!hasParagraphs ? "no paragraphs, " : ""}${!hasCTA ? "no CTA" : "has CTA"}`,
    action: b, brief: b, deliverables,
    impact: data.platform === "android" ? "Google indexes the full description \u2014 structure and density directly affect rankings" : "Better conversion rate + web SEO",
    scoreBoost: "+15-30 on Description score",
    aiStatus: hasAiDesc ? "reviewed" : "available",
    deepDiveSection: "description",
  }];
}

// ---------------------------------------------------------------------------
// ICON BRIEF (AI-powered vision analysis)
// ---------------------------------------------------------------------------

function iconBrief(data: AppData, p: AppProfile, ai?: AIAnalysis | null): ActionItem[] {
  const hasAiIcon = ai?.icon && ai.icon.assessment.length > 0;
  if (!hasAiIcon) return [];

  const hasIssues = ai!.icon!.issues.length > 0;
  if (!hasIssues && ai!.icon!.suggestions.length === 0) return [];

  let b = `**AI Icon Analysis** (vision-powered):\n`;
  b += `${ai!.icon!.assessment}\n\n`;

  if (hasIssues) {
    b += `**Issues found:**\n`;
    for (const issue of ai!.icon!.issues) b += `  \u2022 ${issue}\n`;
    b += `\n`;
  }

  if (ai!.icon!.suggestions.length > 0) {
    b += `**Suggestions:**\n`;
    for (const s of ai!.icon!.suggestions) b += `  \u2022 ${s}\n`;
    b += `\n`;
  }

  b += `**Icon best practices:**\n`;
  b += `  \u2022 Must be recognizable at 60x60px — the smallest display size\n`;
  b += `  \u2022 Simple, bold shapes with high contrast\n`;
  b += `  \u2022 Should communicate the app's purpose at a glance\n`;
  b += `  \u2022 Test against both light and dark backgrounds\n`;
  b += `  \u2022 Unique within your category — avoid looking like competitors`;

  return [{
    id: "icon-optimize",
    priority: hasIssues ? "high" : "medium",
    effort: "medium",
    category: "Icon",
    title: "Improve app icon based on visual analysis",
    currentState: "Icon analyzed via AI vision",
    action: b, brief: b,
    deliverables: [
      "Design 2-3 icon variants addressing the issues above",
      "Test at 60x60px, 120x120px, and 1024x1024px sizes",
      `Upload to ${data.platform === "ios" ? "App Store Connect" : "Google Play Console"}`,
      `A/B test with ${data.platform === "ios" ? "Apple PPO" : "Google Play Store Listing Experiments"}`,
    ],
    impact: "Icon is the first thing users see in search — affects tap-through rate before anything else",
    scoreBoost: "+5-15 on overall conversion",
    aiStatus: "reviewed",
    deepDiveSection: "icon",
  }];
}

// ---------------------------------------------------------------------------
// VISUAL ASSETS BRIEF
// Sources: app-store-screenshots skill (entire document systematically integrated)
// ---------------------------------------------------------------------------

function visualsBrief(data: AppData, p: AppProfile, cats: AuditCategory[], ai?: AIAnalysis | null): ActionItem[] {
  const actions: ActionItem[] = [];
  const cat = cats.find(c => c.id === "visuals");
  if (!cat) return actions;
  const max = data.platform === "ios" ? 10 : 8;
  const videoR = cat.results.find(r => r.ruleId === "video-presence");

  // --- SCREENSHOT BRIEF ---
  // Only skip if all screenshots filled AND platform is Android (no OCR)
  if (data.screenshotCount < max || data.platform === "ios") {
    const needsNew = data.screenshotCount < max;
    const verb = p.categoryVerbs[0] || "Discover";

    // Gallery plan per screenshots skill: Hero → Differentiator → Popular Feature → Social Proof → Features → CTA
    const galleryRoles = [
      { role: "Hero \u2014 Core Value Proposition", purpose: "Stop the scroll, answer 'what is this app?'" },
      { role: "Key Differentiator", purpose: "What makes you unique vs competitors" },
      { role: "Most Popular Feature", purpose: "The thing users love most" },
      { role: "Social Proof / Outcome", purpose: "Ratings, results, testimonials" },
      { role: "Feature Deep-Dive", purpose: "Supporting feature or integration" },
      { role: "Secondary Feature", purpose: "Additional capability" },
      { role: "Customization / Settings", purpose: "Personalization options" },
      { role: "Secondary Value", purpose: "Advanced features" },
      { role: "Edge Case / Niche Feature", purpose: "Specialized use case" },
      { role: "CTA / Download Prompt", purpose: "Final push to download" },
    ];

    // Generate app-specific captions (2-5 words, benefit-focused, never truncated mid-word)
    const captions: string[] = [];
    const ratingStr = data.rating > 0 ? `${data.rating.toFixed(1)}\u2605` : "";
    const countStr = data.ratingsCount >= 1000 ? `${Math.floor(data.ratingsCount / 1000)}K+` : data.ratingsCount > 0 ? `${data.ratingsCount}` : "";
    const verb2 = p.categoryVerbs[1] || "Explore";
    const verb3 = p.categoryVerbs[2] || "Try";

    // Slot 1: Hero — verb + core function
    captions.push(condenseCaption(`${verb} ${p.coreFunction}`, 4));
    // Slot 2: Differentiator — unique benefit
    captions.push(p.features[1] ? condenseCaption(p.features[1], 4) : p.benefits[0] ? condenseCaption(p.benefits[0], 4) : `Why ${p.brand}?`);
    // Slot 3: Popular feature
    captions.push(p.features[0] ? condenseCaption(p.features[0], 4) : `${verb2} More`);
    // Slot 4: Social proof
    captions.push(ratingStr && countStr ? `${ratingStr} Loved by ${countStr}` : `Loved by ${cap(p.audience)}`);
    // Slots 5+: remaining features, last slot = CTA
    for (let i = 4; i < max; i++) {
      if (i === max - 1) {
        captions.push(`${verb3} ${p.brand} Today`);
      } else {
        const feat = p.features[i - 3];
        const benefit = p.benefits[i - 3];
        if (feat) captions.push(condenseCaption(feat, 4));
        else if (benefit) captions.push(condenseCaption(benefit, 4));
        else captions.push(`${verb2} ${p.brand}`);
      }
    }

    // Generate scene descriptions (brief designer directions, not raw feature text)
    const scenes: string[] = [];
    scenes.push(`Main ${data.category.toLowerCase()} screen with real, populated content`);
    scenes.push(sceneDirection(p.features[1] || p.benefits[0], `What makes ${p.brand} different from competitors`));
    scenes.push(sceneDirection(p.features[0], `Most-used feature screen with real data`));
    scenes.push(`Rating badge or user testimonial overlaid on active screen`);
    for (let i = 4; i < max; i++) {
      if (i === max - 1) {
        scenes.push(`${p.brand} app icon + branding, final CTA to download`);
      } else {
        scenes.push(sceneDirection(p.features[i - 3], `Supporting feature or deeper capability`));
      }
    }

    const hasAiScreenshots = ai?.screenshots && ai.screenshots.perScreenshot.length > 0;

    let b = `**Current:** ${data.screenshotCount}/${max} slots used\n\n`;

    if (hasAiScreenshots) {
      b += `**AI Screenshot Analysis** (vision-powered):\n`;
      b += `${ai!.screenshots.overallAssessment}\n`;
      b += `**Gallery coherence:** ${ai!.screenshots.galleryCoherence}/10\n\n`;

      if (ai!.screenshots.firstThreeVerdict) {
        b += `**First 3 Rule verdict:** ${ai!.screenshots.firstThreeVerdict}\n\n`;
      }

      b += `**Per-screenshot analysis:**\n`;
      for (const ss of ai!.screenshots.perScreenshot) {
        b += `\n  \u2705 **Slot ${ss.slot}:**\n`;
        b += `     Shows: ${ss.whatItShows}\n`;
        if (ss.style) b += `     Style: ${ss.style}\n`;
        if (ss.captionVisible && ss.captionVisible !== "none") b += `     Visible caption: "${ss.captionVisible}"\n`;
        if (ss.captionQuality) b += `     Caption assessment: ${ss.captionQuality}\n`;
        b += `     Suggested caption: "${ss.captionSuggestion}"\n`;
        if (ss.issues.length > 0) {
          for (const issue of ss.issues) b += `     \u274C ${issue}\n`;
        }
      }

      if (ai!.screenshots.missingSlots.length > 0) {
        b += `\n**Missing screenshots to add:**\n`;
        for (const ms of ai!.screenshots.missingSlots) {
          b += `\n  \u274C **Slot ${ms.slot}:**\n`;
          b += `     What to show: ${ms.whatToShow}\n`;
          b += `     Suggested caption: "${ms.captionSuggestion}"\n`;
          if (ms.recommendedStyle) b += `     Recommended style: ${ms.recommendedStyle}\n`;
        }
      }

      if (ai!.screenshots.commonMistakesFound && ai!.screenshots.commonMistakesFound.length > 0) {
        b += `\n**Common mistakes detected:**\n`;
        for (const m of ai!.screenshots.commonMistakesFound) b += `  \u274C ${m}\n`;
      }
    } else {
      b += `\u26A0\uFE0F **Note:** AI vision analysis was unavailable for this audit. The captions below are auto-generated from your description text \u2014 not from actual screenshot analysis. Re-run the audit if AI was expected.\n\n`;
      b += `**The First 3 Rule** (per screenshots skill):\n`;
      b += `80% of App Store impressions show only the first 3 screenshots. Users spend ~7 seconds on an app page. 65% of downloads happen immediately after search. Your first 3 must be a complete elevator pitch:\n`;
      b += `  1. **What is it?** \u2014 Core value proposition\n`;
      b += `  2. **What does it do?** \u2014 Best feature/outcome\n`;
      b += `  3. **Why do I need it?** \u2014 Differentiator from alternatives\n\n`;

      b += `**Gallery plan for ${p.brand}:**\n`;
      for (let i = 0; i < max; i++) {
        const exists = i < data.screenshotCount;
        const role = galleryRoles[Math.min(i, galleryRoles.length - 1)];
        b += `\n  ${exists ? "\u2705" : "\u274C"} **Slot ${i + 1} \u2014 ${role.role}**\n`;
        b += `     Caption: "${captions[i]}"\n`;
        b += `     Scene: ${scenes[Math.min(i, scenes.length - 1)]}\n`;
      }
    }

    // Per screenshots skill: Caption Writing rules with examples
    b += `\n\n**Caption writing rules** (per screenshots skill):\n`;
    b += `  \u2022 **2-5 words** per caption (readable at thumbnail size)\n`;
    b += `  \u2022 **Benefit-focused**, not feature-focused\n`;
    b += `  \u2022 **40pt+ bold sans-serif font** (for readability AND Apple OCR)\n`;
    b += `  \u2022 **Keyword-aware** \u2014 incorporate ASO target keywords naturally\n\n`;
    b += `  **Bad \u2192 Good examples** (from screenshots skill, applied to ${data.category}):\n`;

    // Category-specific bad → good examples
    const catExamples: [string, string][] = [];
    const catLower = data.category.toLowerCase();
    if (catLower.includes("music") || catLower.includes("audio")) {
      catExamples.push(["Audio Player Interface", "Stream Music Anytime"], ["Settings and Preferences", "Personalize Your Sound"], ["Easy to Use", `Discover ${tc(p.keywords[0] || "Music")} Channels`]);
    } else if (catLower.includes("fitness") || catLower.includes("health")) {
      catExamples.push(["Data Dashboard", "Track Your Progress"], ["Push Notifications", "Never Miss a Workout"], ["Metrics Screen", "Reach Your Goals Faster"]);
    } else if (catLower.includes("product") || catLower.includes("business")) {
      catExamples.push(["Task List View", "Focus on What Matters"], ["Calendar Integration", "See Your Week at a Glance"], ["Export Function", "Share Reports in One Tap"]);
    } else if (catLower.includes("photo") || catLower.includes("video")) {
      catExamples.push(["Filter Selection", "Stunning Photos Instantly"], ["Editing Tools", "Pro Edits, Zero Learning"], ["Share Button", "Post to All Platforms"]);
    } else {
      catExamples.push(["App Main Screen", `${verb} ${tc(p.keywords[0] || "Content")}`], ["Settings Page", "Tailored to You"], ["Feature List", `${tc(p.keywords[1] || "Everything")} You Need`]);
    }
    for (const [bad, good] of catExamples) {
      b += `    \u274C "${bad}" \u2192 \u2705 "${good}"\n`;
    }

    // Per screenshots skill: Conversion Psychology
    b += `\n**Conversion psychology** (per screenshots skill):\n`;
    b += `  \u2022 **Processing fluency:** High-contrast text on clean backgrounds is processed faster, increasing download likelihood\n`;
    b += `  \u2022 **Emotional triggers:** Outcome-focused language ("Sleep Better Tonight") outperforms technical language ("Sleep Tracking")\n`;
    b += `  \u2022 **Specificity:** "Save 2 Hours Every Week" outperforms "Calendar Integration"\n`;

    // Per screenshots skill: Screenshot Styles
    b += `\n**Screenshot style** (per screenshots skill, 96% of top apps use Device Frame with Caption):\n`;
    b += `  Recommended for ${p.brand}: **Device Frame with Caption** \u2014 current-gen device mockup (iPhone 16 Pro / Pixel 9) showing real in-app UI with benefit caption above.\n`;
    if (catLower.includes("fitness") || catLower.includes("travel") || catLower.includes("social") || catLower.includes("lifestyle")) {
      b += `  Consider **Lifestyle Context** for 1-2 screenshots \u2014 ${data.platform === "ios" ? "iOS users respond more to lifestyle imagery and emotional triggers" : "showing real-world context drives engagement"}\n`;
    }

    // Platform-specific audience insight (per screenshots skill)
    if (data.platform === "ios") {
      b += `\n**Platform audience** (per screenshots skill):\n`;
      b += `  iOS users respond more to lifestyle imagery, emotional triggers, and minimalist design. Captions should emphasize outcomes and feelings, not technical specs.\n`;
    } else {
      b += `\n**Platform audience** (per screenshots skill):\n`;
      b += `  Android users are more feature-oriented \u2014 they want to see specific functionality and capabilities. Keep promotional text under 20% of the image.\n`;
    }

    // Apple OCR (iOS only, per screenshots skill)
    if (data.platform === "ios") {
      b += `\n**Apple OCR indexing** (per screenshots skill \u2014 major 2025-2026 ranking signal):\n`;
      b += `  Apple extracts text from screenshot captions via OCR and uses it as a keyword ranking signal. Captions are now a secondary keyword field.\n\n`;
      b += `  **OCR specs:**\n`;
      b += `    \u2022 Bold sans-serif fonts (SF Pro, Helvetica Neue, Inter) at 40pt+ minimum\n`;
      b += `    \u2022 Dark text on light bg or white on dark \u2014 no mid-tones\n`;
      b += `    \u2022 Position text in top 1/3 of screenshot for best extraction\n`;
      b += `    \u2022 First 3 screenshots carry heaviest indexing weight\n`;
      b += `    \u2022 Align caption keywords with title + subtitle to amplify signals\n`;
      b += `    \u2022 OCR check: zoom screenshot to 25% \u2014 if you can still read it, OCR can too\n\n`;
      b += `  **Semantic indexing** (per screenshots skill):\n`;
      b += `  Apple's 2026 algorithm uses semantic clustering beyond exact keywords. Ranking for "${p.keywords[0] || data.category.toLowerCase()}" gains visibility for related terms automatically. Write captions that are thematically rich, not keyword-stuffed.\n`;
    }

    // Design specs (per screenshots skill, 2026 values)
    b += `\n**Design specs** (per screenshots skill, 2026):\n`;
    if (data.platform === "ios") {
      b += `  \u2022 iPhone 6.9" (16/17 Pro Max): 1320 x 2868 px \u2014 **upload this size**, Apple scales down\n`;
      b += `  \u2022 iPhone 6.7" (15 Pro Max): 1290 x 2796 px (required)\n`;
      b += `  \u2022 iPhone 5.5" (legacy): 1242 x 2208 px (for SE/older coverage)\n`;
      b += `  \u2022 iPad 13": 2064 x 2752 px (if iPad app)\n`;
      b += `  \u2022 Min upload strategy: 6.9" + 5.5" covers modern + legacy\n`;
      b += `  \u2022 Format: PNG or JPEG (no alpha/transparency for JPEG)\n`;
    } else {
      b += `  \u2022 Standard phone: 1080 x 1920 px (9:16)\n`;
      b += `  \u2022 High-res phone: 1440 x 2560 px\n`;
      b += `  \u2022 7" tablet: 1200 x 1920 px (boosts tablet search visibility)\n`;
      b += `  \u2022 Feature graphic: 1024 x 500 px (required for featuring)\n`;
      b += `  \u2022 Format: PNG or JPEG (24-bit, no alpha), max 8 MB per image\n`;
    }

    // Common mistakes (per screenshots skill, applied to this app)
    b += `\n**Common mistakes to avoid** (per screenshots skill):\n`;
    b += `  \u274C Settings, onboarding, or login screens \u2014 show the app in-use with real data\n`;
    b += `  \u274C Too much text on screenshot \u2014 stick to 2-5 word captions\n`;
    b += `  \u274C All screenshots look the same \u2014 vary composition and content across gallery\n`;
    b += `  \u274C Feature-focused captions ("Push Notifications") \u2014 use benefit-focused ("Never Miss a Beat")\n`;
    b += `  \u274C Generic captions with zero search volume ("Easy to Use") \u2014 use keyword-rich text\n`;
    b += `  \u274C Decorative/script fonts \u2014 use bold sans-serif for readability AND OCR\n`;
    b += `  \u274C Outdated device frames \u2014 use current-gen (iPhone 16 Pro, Pixel 9)\n`;
    b += `  \u274C Empty states or placeholder data \u2014 always show realistic, populated content\n`;
    if (data.platform !== "ios") {
      b += `  \u274C Reusing iOS screenshots on Android \u2014 different aspect ratios AND audience psychology\n`;
    }

    // Pre-upload checklist (per screenshots skill, complete)
    b += `\n**Pre-upload checklist** (per screenshots skill):\n`;
    b += `  \u25A2 Correct dimensions for each target device\n`;
    b += `  \u25A2 First 3 screenshots answer: What is it? / What does it do? / Why do I need it?\n`;
    b += `  \u25A2 All captions are benefit-focused, keyword-rich, 40pt+ bold sans-serif\n`;
    b += `  \u25A2 No onboarding, login, or settings screens in gallery\n`;
    b += `  \u25A2 Hero screenshot (slot 1) is the strongest asset\n`;
    b += `  \u25A2 Gallery order follows strategic positioning (6-8 minimum)\n`;
    b += `  \u25A2 ASO keywords distributed across captions\n`;
    b += `  \u25A2 Screenshots show real data, not empty states\n`;
    b += `  \u25A2 Current-gen device frames\n`;
    b += `  \u25A2 Text readable at small thumbnail size in store search\n`;
    if (data.platform === "ios") {
      b += `  \u25A2 Caption text passes OCR (high contrast, clean font, 40pt+)\n`;
    } else {
      b += `  \u25A2 Screenshots comply with Google Play content policy (no fake badges, false claims)\n`;
    }

    // A/B testing guidance (per screenshots skill)
    b += `\n**A/B testing** (per screenshots skill):\n`;
    if (data.platform === "ios") {
      b += `  Use Apple Product Page Optimization (PPO) \u2014 test up to 3 treatments against original:\n`;
      b += `  \u2022 Different screenshot orders (try leading with Feature vs Social Proof)\n`;
      b += `  \u2022 Different caption copy (benefit-focused vs outcome-focused)\n`;
      b += `  \u2022 Different visual styles (device frame vs full-bleed)\n`;
    } else {
      b += `  Use Google Play Store Listing Experiments \u2014 7+ days with 50%+ traffic for significance:\n`;
      b += `  \u2022 Different screenshot orders\n`;
      b += `  \u2022 With vs without device frames\n`;
      b += `  \u2022 Benefit-focused vs feature-focused vs social proof messaging\n`;
    }

    // Custom Product Pages (iOS only, per screenshots skill)
    if (data.platform === "ios") {
      b += `\n**Custom Product Pages** (per screenshots skill):\n`;
      b += `  Apple supports up to 70 CPPs with unique screenshots per keyword cluster. Average 8.6% conversion lift, up to 60% CPA reduction.\n`;
      b += `  \u2022 Map high-intent keyword clusters to dedicated CPPs\n`;
      b += `  \u2022 Align CPP screenshots with the target keywords for OCR\n`;
      b += `  \u2022 Link CPPs to Apple Search Ads campaigns for keyword-specific landing pages\n`;
    }

    // Build deliverables dynamically from AI findings
    const deliverables: string[] = [];
    const slotsToRedo: number[] = [];
    const captionsToFix: number[] = [];
    let needsDeviceFrameUpdate = false;
    let needsUIUpdate = false;

    if (hasAiScreenshots) {
      for (const ss of ai!.screenshots.perScreenshot) {
        const issues = ss.issues.map(i => i.toLowerCase()).join(" ");
        const hasFrameIssue = issues.includes("outdated device") || issues.includes("old device") || issues.includes("iphone 8") || issues.includes("home button");
        const hasUIIssue = issues.includes("outdated ui") || issues.includes("2019") || issues.includes("2020") || issues.includes("placeholder") || issues.includes("old date");
        const hasCaptionIssue = (ss.captionQuality || "").toLowerCase().match(/weak|generic|filler|repetitive|low/);

        if (hasFrameIssue) needsDeviceFrameUpdate = true;
        if (hasUIIssue) needsUIUpdate = true;
        if (hasFrameIssue || hasUIIssue) slotsToRedo.push(ss.slot);
        if (hasCaptionIssue) captionsToFix.push(ss.slot);
      }

      // Also check commonMistakesFound for broad issues
      const mistakes = (ai!.screenshots.commonMistakesFound || []).map(m => m.toLowerCase()).join(" ");
      if (mistakes.includes("outdated device") || mistakes.includes("old device")) needsDeviceFrameUpdate = true;
      if (mistakes.includes("outdated ui") || mistakes.includes("2019") || mistakes.includes("2020") || mistakes.includes("old date")) needsUIUpdate = true;
    }

    const needsRedo = slotsToRedo.length > 0;

    if (needsDeviceFrameUpdate) {
      deliverables.push(`Reshoot all ${data.screenshotCount} existing screenshots with current-gen device frames (iPhone 16 Pro / Pixel 9)`);
    }
    if (needsUIUpdate) {
      deliverables.push("Update all screenshots to show the current app version (outdated UI/dates detected)");
    }
    if (needsRedo && !needsDeviceFrameUpdate && !needsUIUpdate) {
      deliverables.push(`Redo screenshots for slot${slotsToRedo.length > 1 ? "s" : ""} ${slotsToRedo.join(", ")} (issues detected by AI — see analysis above)`);
    }
    if (captionsToFix.length > 0) {
      deliverables.push(`Rewrite captions for slot${captionsToFix.length > 1 ? "s" : ""} ${captionsToFix.join(", ")} — replace generic/weak text with benefit-focused, keyword-rich copy`);
    }
    if (needsNew) {
      deliverables.push(`Design ${max - data.screenshotCount} new screenshots for slots ${data.screenshotCount + 1}-${max} (see missing slots above)`);
    }
    if (!needsRedo && !captionsToFix.length && !needsNew) {
      deliverables.push(`Write benefit-focused, keyword-rich captions for all ${max} slots`);
    }
    deliverables.push(`Export at platform-required resolutions`);
    deliverables.push(`Upload to ${data.platform === "ios" ? "App Store Connect \u203A Media Manager" : "Google Play Console \u203A Store Listing"}`);
    if (data.platform === "ios") deliverables.push("Verify OCR readability (zoom to 25% test)");
    deliverables.push("Set up A/B test with current vs new screenshots");

    // Build a title that reflects the actual scope
    const reshootAll = needsDeviceFrameUpdate || needsUIUpdate;
    let actionTitle: string;
    if (reshootAll && needsNew) {
      actionTitle = `Reshoot all ${data.screenshotCount} screenshots + design ${max - data.screenshotCount} new`;
    } else if (reshootAll) {
      actionTitle = `Reshoot all ${data.screenshotCount} screenshots with modern device frames`;
    } else if (needsRedo && needsNew) {
      actionTitle = `Redo ${slotsToRedo.length} existing + design ${max - data.screenshotCount} new screenshots`;
    } else if (needsRedo) {
      actionTitle = `Redo ${slotsToRedo.length} screenshots (outdated) + optimize all captions`;
    } else if (needsNew) {
      actionTitle = `Design ${max - data.screenshotCount} new screenshots + optimize all captions`;
    } else {
      actionTitle = "Optimize screenshot captions for keywords and conversion";
    }

    const isHighEffort = needsRedo || data.screenshotCount < 4;
    const isCritical = data.screenshotCount < 3 || (needsDeviceFrameUpdate && needsUIUpdate);

    actions.push({
      id: "screenshots-optimize",
      priority: isCritical ? "critical" : "high",
      effort: isHighEffort ? "heavy" : "medium",
      category: "Visual Assets",
      title: actionTitle,
      currentState: `${data.screenshotCount}/${max} screenshots`,
      action: b, brief: b, deliverables,
      impact: "Screenshots are the #1 conversion driver" + (data.platform === "ios" ? " \u2014 captions are also a keyword ranking signal via OCR" : ""),
      scoreBoost: "+15-30 on Visual Assets score",
      aiStatus: hasAiScreenshots ? "reviewed" : "available",
      deepDiveSection: "screenshots",
    });
  }

  // --- VIDEO BRIEF ---
  if (videoR && videoR.score < 60) {
    const hasAiVideo = ai?.video && ai.video.storyboard.length > 0;
    const vFeats = p.features.slice(0, 4).map(f => sceneDirection(f, ""));
    let b = `**Current:** ${data.hasVideo ? "Video detected" : "No preview video detected"}\n\n`;

    if (hasAiVideo) {
      b += `**AI Video Assessment:**\n${ai!.video!.assessment}\n\n`;
      b += `**AI-recommended storyboard for ${p.brand}:**\n\n`;
      for (const seg of ai!.video!.storyboard) {
        b += `  \u2022 **${seg.duration} \u2014 ${seg.segment}:** ${seg.content}\n`;
      }
    } else {
      b += `**Video storyboard for ${p.brand}:**\n\n`;

      if (data.platform === "ios") {
        b += `  \u2022 **0-3s \u2014 Hook:** ${vFeats[0] || `Core ${p.coreFunction} experience`} \u2014 the wow moment that stops scrolling\n`;
        b += `  \u2022 **3-10s \u2014 Feature 1:** ${vFeats[1] || "Primary use case"} \u2014 demonstrate with real content\n`;
        b += `  \u2022 **10-18s \u2014 Feature 2:** ${vFeats[2] || "Key differentiator"} \u2014 what makes ${p.brand} unique\n`;
        b += `  \u2022 **18-25s \u2014 Feature 3:** ${vFeats[3] || "Social proof or advanced feature"}\n`;
        b += `  \u2022 **25-30s \u2014 CTA:** ${p.brand} app icon + tagline\n`;
      } else {
        b += `  \u2022 **0-3s \u2014 Hook:** Most compelling ${p.coreFunction} moment\n`;
        b += `  \u2022 **3-15s \u2014 Core loop:** ${vFeats[0] || "Main feature"} in action\n`;
        b += `  \u2022 **15-25s \u2014 Features:** ${vFeats[1] || "Feature 2"} + ${vFeats[2] || "Feature 3"}\n`;
        b += `  \u2022 **25-30s \u2014 CTA:** Download prompt + ${p.brand} branding\n`;
      }
    }

    b += `\n`;
    if (data.platform === "ios") {
      b += `**Specs:** 15-30s, H.264 .mov or .mp4, no letterboxing\n`;
      b += `**Sizes:** 1320x2868 (6.9"), 1290x2796 (6.7"), 1284x2778 (6.5"), 1242x2208 (5.5")\n`;
      b += `**Rules:** Real app footage only (no renders), no people outside the device, loops silently in store, audio optional\n`;
    } else {
      b += `**Specs:** 30s-2min YouTube video, landscape preferred\n`;
      b += `**Upload:** YouTube URL in Google Play Console \u203A Promo video\n`;
    }

    b += `\n**Hook is everything:** The first 3 seconds determine whether users watch or scroll. Show your core outcome immediately \u2014 not a logo animation or loading screen.`;

    actions.push({
      id: "video-create",
      priority: "medium", effort: "heavy", category: "Visual Assets",
      title: `Create ${data.platform === "ios" ? "App Preview" : "promo"} video for ${p.brand}`,
      currentState: "No preview video detected",
      action: b, brief: b,
      deliverables: [
        "Script storyboard (see plan above)",
        "Record in-app screen captures with real content",
        data.platform === "ios" ? "Edit to 15-30s, export H.264 .mov for all device sizes" : "Edit to 30-60s, upload to YouTube",
        "Add background music (royalty-free) and caption overlays",
      ],
      impact: "Videos increase conversion rate and time-on-page \u2014 auto-play silently in store",
      scoreBoost: "+10-15 on Visual Assets score",
      aiStatus: hasAiVideo ? "reviewed" : "available",
      deepDiveSection: "video",
    });
  }

  return actions;
}

// ---------------------------------------------------------------------------
// RATINGS & REVIEW MANAGEMENT BRIEF
// Sources: ASO skill §7 review analysis, §1 keyword research (review keyword extraction)
// ---------------------------------------------------------------------------

function ratingsBrief(data: AppData, p: AppProfile, cats: AuditCategory[], ai?: AIAnalysis | null): ActionItem[] {
  const actions: ActionItem[] = [];
  const cat = cats.find(c => c.id === "ratings");
  if (!cat) return actions;
  const scoreR = cat.results.find(r => r.ruleId === "rating-score");
  const countR = cat.results.find(r => r.ruleId === "ratings-count");
  const hasAiRatings = ai?.ratings && ai.ratings.assessment.length > 0;

  if (scoreR && data.rating > 0 && data.rating < 4.0) {
    let b = "";
    if (hasAiRatings) {
      b += `**AI Assessment:**\n${ai!.ratings!.assessment}\n\n`;
      if (ai!.ratings!.promptStrategy) {
        b += `**Recommended prompt timing:** ${ai!.ratings!.promptStrategy}\n\n`;
      }
    }
    b += `**Current:** ${data.rating.toFixed(1)}\u2605 from ${data.ratingsCount.toLocaleString()} ratings\n`;
    b += `**Target:** 4.0\u2605+ (conversion threshold) \u2192 4.5\u2605+ (optimal)\n\n`;

    b += `**Recovery plan** (per ASO skill: review analysis \u2192 fixes \u2192 prompts \u2192 responses):\n\n`;
    b += `**1. Analyze negative reviews** (this week):\n`;
    b += `   Per ASO skill: "extract common themes, identify issues, find feature requests"\n`;
    b += `   \u2022 Export recent 1-2\u2605 reviews from ${data.platform === "ios" ? "App Store Connect \u203A Ratings and Reviews" : "Google Play Console \u203A Reviews"}\n`;
    b += `   \u2022 Categorize top 3 complaint themes by frequency\n`;
    b += `   \u2022 Look for feature requests hidden in negative reviews\n`;
    b += `   \u2022 Prioritize fixes by frequency \u00D7 severity\n\n`;

    b += `**2. Ship fixes** (next sprint):\n`;
    b += `   Fix the #1 complaint. Mention it prominently in release notes. This builds trust and encourages re-rating.\n\n`;

    b += `**3. Implement review prompts:**\n`;
    b += `   Per ASO skill: "Ask for ratings after positive in-app experiences"\n`;
    if (data.platform === "ios") {
      b += `   \u2022 Use SKStoreReviewController.requestReview()\n`;
      b += `   \u2022 Apple limits 3 prompts per device per 365 days \u2014 time them well\n`;
    } else {
      b += `   \u2022 Use Google Play In-App Review API\n`;
      b += `   \u2022 Show a soft pre-prompt first ("Enjoying ${p.brand}?") to filter sentiment\n`;
      b += `   \u2022 "Yes" \u2192 system review dialog | "No" \u2192 in-app feedback form\n`;
    }
    b += `   Trigger after: completing a key action, 3rd+ session, positive outcome in ${p.brand}\n`;
    b += `   Never after: errors, crashes, purchases, onboarding\n\n`;

    b += `**4. Respond to reviews** (ongoing):\n`;
    b += `   Per ASO skill: "respond within 24-48 hours, always professional"\n`;
    b += `   \u2022 Reply to every negative review within 24-48h\n`;
    b += `   \u2022 Template: "Thanks for the feedback. We've fixed [issue] in v[X.X]. Would love for you to try again."\n`;
    b += `   \u2022 ${data.platform === "ios" ? "Users can update ratings after developer response" : "Users are prompted to re-rate after developer replies"}\n`;
    b += `   \u2022 Never argue, never dismiss \u2014 every response is public`;

    actions.push({
      id: "ratings-improve",
      priority: "critical", effort: "heavy", category: "Ratings & Reviews",
      title: `Recover rating from ${data.rating.toFixed(1)}\u2605 to 4.0\u2605+`,
      currentState: `${data.rating.toFixed(1)}\u2605 from ${data.ratingsCount.toLocaleString()} ratings`,
      action: b, brief: b,
      deliverables: [
        "Export and categorize recent negative reviews (top 3 complaint themes)",
        "Ship fixes for #1 complaint with prominent release notes",
        `Implement ${data.platform === "ios" ? "SKStoreReviewController" : "In-App Review API"} with smart trigger logic`,
        "Set up review monitoring and response workflow (24-48h SLA)",
      ],
      impact: "Ratings below 4.0 reduce conversion by up to 50% and hurt search rankings",
      scoreBoost: "+20-40 on Ratings score",
      aiStatus: hasAiRatings ? "reviewed" : "available",
      deepDiveSection: "ratings",
    });
  }

  if (countR && countR.score < 60 && !(scoreR && data.rating < 4.0)) {
    let b = "";
    if (hasAiRatings) {
      b += `**AI Assessment:**\n${ai!.ratings!.assessment}\n\n`;
      if (ai!.ratings!.promptStrategy) b += `**Recommended prompt timing:** ${ai!.ratings!.promptStrategy}\n\n`;
    }
    b += `**Current:** ${data.ratingsCount.toLocaleString()} ratings\n`;
    b += `**Benchmark:** 1,000+ for social proof, 10,000+ for strong algorithm signal\n\n`;
    b += data.platform === "ios"
      ? `**Implementation:** SKStoreReviewController.requestReview()\n  \u2022 3 prompts max per device per 365 days\n  \u2022 Trigger after: ${p.features[0] ? sceneDirection(p.features[0], "completing a key action") : "completing a key action"}, 3rd session, positive outcome\n  \u2022 Never after errors, purchases, or onboarding`
      : `**Implementation:** Google Play In-App Review API\n  \u2022 Soft pre-prompt: "Enjoying ${p.brand}?"\n  \u2022 "Yes" \u2192 system review dialog | "No" \u2192 feedback form\n  \u2022 Quota managed by Google \u2014 cannot force-show`;

    actions.push({
      id: "ratings-volume",
      priority: "high", effort: "medium", category: "Ratings & Reviews",
      title: "Increase ratings volume with strategic prompts",
      currentState: `${data.ratingsCount.toLocaleString()} ratings`,
      action: b, brief: b,
      deliverables: [
        `Implement ${data.platform === "ios" ? "SKStoreReviewController" : "In-App Review API"}`,
        "Define 3 positive in-app moments for trigger points",
        ...(data.platform === "android" ? ["Build soft pre-prompt UI to filter sentiment"] : []),
      ],
      impact: "Higher volume improves algorithm trust signals and social proof",
      scoreBoost: "+10-25 on Ratings score",
      aiStatus: hasAiRatings ? "reviewed" : "available",
      deepDiveSection: "ratings",
    });
  }

  return actions;
}

// ---------------------------------------------------------------------------
// MAINTENANCE BRIEF
// ---------------------------------------------------------------------------

function maintenanceBrief(data: AppData, p: AppProfile, cats: AuditCategory[], ai?: AIAnalysis | null): ActionItem[] {
  const cat = cats.find(c => c.id === "maintenance");
  if (!cat) return [];
  const rule = cat.results[0];
  const hasAiMaint = ai?.maintenance && ai.maintenance.assessment.length > 0;
  if (!rule || (rule.score >= 70 && !hasAiMaint)) return [];

  let b = "";
  if (hasAiMaint) {
    b += `**AI Assessment:**\n${ai!.maintenance!.assessment}\n\n`;
    if (ai!.maintenance!.seasonalOpportunities && ai!.maintenance!.seasonalOpportunities.length > 0) {
      b += `**Seasonal opportunities:**\n`;
      for (const s of ai!.maintenance!.seasonalOpportunities) b += `  \u2022 ${s}\n`;
      b += `\n`;
    }
    if (ai!.maintenance!.suggestions.length > 0) {
      b += `**Recommendations:**\n`;
      for (const s of ai!.maintenance!.suggestions) b += `  \u2022 ${s}\n`;
      b += `\n`;
    }
  }
  b += `**Last update:** ${rule?.message || "unknown"}\n`;
  b += `**Current version:** ${data.version || "unknown"}\n\n`;
  b += `Both stores use update recency as a quality signal. Each update is also a metadata refresh opportunity.\n\n`;
  b += `**Update checklist for ${p.brand}:**\n`;
  b += `  \u2022 Ship a new build (even minor improvements count)\n`;
  b += `  \u2022 Write compelling "What's New" text\n`;
  if (data.platform === "ios") {
    b += `  \u2022 Refresh title, subtitle, and/or keyword field with latest keyword research\n`;
    b += `  \u2022 Refresh screenshots if needed (new captions = new OCR-indexable keywords)\n`;
  } else {
    b += `  \u2022 Refresh short description and full description keywords\n`;
    b += `  \u2022 Update feature graphic if seasonal opportunity exists\n`;
  }
  b += `  \u2022 Target cadence: every 4-6 weeks\n`;
  b += `  \u2022 Per ASO skill: "Monitor metrics daily for first 2 weeks" after each update`;

  return [{
    id: "ship-update",
    priority: "high", effort: "medium", category: "Maintenance",
    title: "Ship an app update to refresh rankings signal",
    currentState: rule.message, action: b, brief: b,
    deliverables: [
      "Prepare new build with improvements",
      "Write release notes highlighting user-facing changes",
      "Refresh ASO metadata alongside the update",
      `Submit to ${data.platform === "ios" ? "App Store Connect" : "Google Play Console"}`,
      "Monitor ranking and conversion metrics daily for 2 weeks post-update",
    ],
    impact: "Both stores favor actively maintained apps in rankings",
    scoreBoost: "+30-50 on Maintenance score",
    aiStatus: hasAiMaint ? "reviewed" : "available",
    deepDiveSection: "maintenance",
  }];
}

// ---------------------------------------------------------------------------
// FEATURE GRAPHIC BRIEF (Android only, AI-powered)
// ---------------------------------------------------------------------------

function featureGraphicBrief(data: AppData, p: AppProfile, ai?: AIAnalysis | null): ActionItem[] {
  const hasAiFg = ai?.featureGraphic && ai.featureGraphic.assessment.length > 0;
  const hasFg = !!data.featureGraphicUrl;

  let b = "";

  if (hasAiFg) {
    b += `**AI Feature Graphic Analysis** (vision-powered):\n`;
    b += `${ai!.featureGraphic!.assessment}\n\n`;
    if (ai!.featureGraphic!.issues.length > 0) {
      b += `**Issues found:**\n`;
      for (const issue of ai!.featureGraphic!.issues) b += `  \u2022 ${issue}\n`;
      b += `\n`;
    }
    if (ai!.featureGraphic!.suggestions.length > 0) {
      b += `**Suggestions:**\n`;
      for (const s of ai!.featureGraphic!.suggestions) b += `  \u2022 ${s}\n`;
      b += `\n`;
    }
  }

  b += `**Current:** ${hasFg ? "Feature graphic detected" : "No feature graphic detected"}\n`;
  b += `**Required size:** 1024 x 500 px (PNG or JPEG)\n\n`;

  b += `**Feature graphic best practices:**\n`;
  b += `  \u2022 Required for Google Play editorial featuring and promotion\n`;
  b += `  \u2022 Appears as a hero banner at the top of your store listing\n`;
  b += `  \u2022 Must clearly communicate what ${p.brand} does — visual storytelling over text\n`;
  b += `  \u2022 Minimal text — small text is unreadable on mobile\n`;
  b += `  \u2022 Keep important content centered (edges may crop on some devices)\n`;
  b += `  \u2022 Works on both light and dark backgrounds\n`;
  b += `  \u2022 Don't duplicate screenshot content — this is a hero banner, not a screenshot\n`;
  b += `  \u2022 Update seasonally or with major feature launches\n\n`;

  b += `**Content policy (Google Play):**\n`;
  b += `  \u274C No fake badges, unverified awards, or false superlative claims\n`;
  b += `  \u274C No direct competitor comparisons by name\n`;
  b += `  \u274C Promotional text under 20% of image area\n`;
  b += `  \u274C No misleading imagery showing features not in the app`;

  return [{
    id: "feature-graphic",
    priority: hasFg ? "medium" : "high",
    effort: "medium",
    category: "Conversion",
    title: hasFg ? "Optimize feature graphic for better conversion" : "Create a feature graphic (required for featuring)",
    currentState: hasFg ? "Feature graphic exists" : "No feature graphic",
    action: b, brief: b,
    deliverables: [
      "Design feature graphic at exactly 1024 x 500 px",
      "Test readability on mobile (small screen)",
      "Upload to Google Play Console \u203A Store Listing \u203A Feature graphic",
      "A/B test via Store Listing Experiments",
    ],
    impact: "Required for Google Play editorial featuring; appears as hero banner on listing page",
    scoreBoost: "+10-20 on Conversion score",
    aiStatus: hasAiFg ? "reviewed" : "available",
    deepDiveSection: "icon",
  }];
}

// ---------------------------------------------------------------------------
// CONVERSION / PROMOTIONAL TEXT BRIEF
// ---------------------------------------------------------------------------

function conversionBrief(data: AppData, p: AppProfile, cats: AuditCategory[], ai?: AIAnalysis | null): ActionItem[] {
  // Android: feature graphic brief
  if (data.platform === "android") {
    return featureGraphicBrief(data, p, ai);
  }

  const cat = cats.find(c => c.id === "conversion");
  if (!cat) return [];
  const promoR = cat.results.find(r => r.ruleId === "promotional-text");
  const hasAiPromo = ai?.promotionalText && ai.promotionalText.suggestions.length > 0;
  if (!promoR || (promoR.score >= 80 && !hasAiPromo)) return [];

  const opts: string[] = [];

  if (hasAiPromo) {
    for (const s of ai!.promotionalText!.suggestions) {
      if (s.length <= 170 && s.length > 0) opts.push(s);
    }
  }

  const featSnippet = p.features[0] ? sceneDirection(p.features[0], p.coreFunction) : p.coreFunction;
  if (data.version) {
    opts.push(`\u2B50 New in v${data.version}: ${featSnippet}. ${data.ratingsCount > 100 ? `Join ${data.ratingsCount.toLocaleString()}+ ${p.audience}.` : `Try ${p.brand} today.`}`.substring(0, 170));
  }
  if (data.ratingsCount > 100) {
    opts.push(`${data.rating.toFixed(1)}\u2605 rated by ${data.ratingsCount.toLocaleString()}+ ${p.audience}. ${cap(p.categoryVerbs[0] || "Discover")} ${p.coreFunction.toLowerCase()} with ${p.brand}.`.substring(0, 170));
  }

  let b = "";
  if (hasAiPromo) {
    b += `**AI Analysis:**\n${ai!.promotionalText!.reasoning}\n\n`;
  }
  b += `**Current:** ${data.promotionalText ? `"${data.promotionalText}"` : "(not set)"}\n`;
  b += `**Limit:** 170 characters\n`;
  b += `**Key advantage:** Can be changed anytime WITHOUT an app update\n\n`;
  b += `Use for:\n`;
  b += `  \u2022 Feature announcements ("New: ${condenseCaption(featSnippet, 6, 50)}")\n`;
  b += `  \u2022 Social proof ("${data.rating > 0 ? data.rating.toFixed(1) + "\u2605" : "Loved"} by ${data.ratingsCount > 100 ? data.ratingsCount.toLocaleString() + "+" : ""} ${p.audience}")\n`;
  b += `  \u2022 Seasonal campaigns or limited-time offers\n\n`;
  b += `Rotate monthly. Appears above the description \u2014 first text users read.`;

  return [{
    id: "promo-text",
    priority: "medium", effort: "quick", category: "Conversion",
    title: "Add promotional text (no app update required)",
    currentState: data.promotionalText ? `"${data.promotionalText}"` : "Not set",
    action: b, brief: b,
    copyOptions: opts.length > 0 ? opts : undefined,
    deliverables: [
      "Write 2-3 promotional text variants (170 chars max)",
      "Update in App Store Connect \u203A Promotional Text",
      "Set monthly calendar reminder to rotate",
    ],
    impact: "First text users read on your store page \u2014 above the description",
    scoreBoost: "+15-25 on Conversion score",
    aiStatus: hasAiPromo ? "reviewed" : "available",
    deepDiveSection: "title",
  }];
}

// ---------------------------------------------------------------------------
// LOCALIZATION OPPORTUNITY BRIEF (NEW)
// Sources: ASO skill §6 localization, screenshots skill localization section
// ---------------------------------------------------------------------------

function localizationBrief(data: AppData, p: AppProfile, ai?: AIAnalysis | null): ActionItem[] {
  const hasAiLoc = ai?.localization && ai.localization.reasoning.length > 0;

  let b = `**Current state:** English only (assumed from audit)\n\n`;

  if (hasAiLoc) {
    b += `**AI Localization Assessment:**\n`;
    b += `**Priority:** ${ai!.localization!.priority}\n`;
    b += `${ai!.localization!.reasoning}\n\n`;
    if (ai!.localization!.tier1Markets.length > 0) {
      b += `**Recommended Tier 1 markets** (full localization): ${ai!.localization!.tier1Markets.join(", ")}\n`;
    }
    if (ai!.localization!.tier2Markets.length > 0) {
      b += `**Recommended Tier 2 markets** (translated captions): ${ai!.localization!.tier2Markets.join(", ")}\n`;
    }
    b += `\n`;
  }

  b += `**Market tiers** (per ASO/screenshots skills):\n\n`;
  b += `  **Tier 1 \u2014 Full localization** (new screenshots + translated captions + local keywords):\n`;
  b += `    Japanese, Korean, Chinese (Simplified)\n`;
  b += `    Highest ROI markets for ${data.category} apps\n\n`;
  b += `  **Tier 2 \u2014 Translated captions** (same screenshots, translated text + local keywords):\n`;
  b += `    German, French, Spanish, Portuguese (BR)\n\n`;
  b += `  **Tier 3 \u2014 English defaults** (no action needed):\n`;
  b += `    Remaining locales\n\n`;

  b += `**What to localize** (priority order):\n`;
  b += `  1. Title and subtitle/short description (highest ranking impact)\n`;
  b += `  2. ${data.platform === "ios" ? "Keyword field (100 chars of local keywords)" : "Full description (Google indexes it for local search)"}\n`;
  b += `  3. Screenshot captions (local keywords for OCR on iOS)\n`;
  b += `  4. Full description\n`;
  b += `  5. Screenshots themselves (if budget allows)\n\n`;

  b += `**Per ASO skill:** "Research local ASO keywords per market. Cultural keyword adaptation matters \u2014 direct translations often miss local search terms."\n`;
  b += `**Per screenshots skill:** "Translate ALL visible text, not just headlines. Consider cultural color preferences and imagery norms."`;

  return [{
    id: "localization",
    priority: "low", effort: "heavy", category: "International Growth",
    title: "Localize store listing for top international markets",
    currentState: "English only",
    action: b, brief: b,
    deliverables: [
      "Identify top 3-5 target markets by category download volume",
      "Research local ASO keywords per market (not just translations)",
      "Localize title + subtitle + keyword field for Tier 1 markets",
      "Translate screenshot captions with local keywords",
      "Set up per-market keyword tracking",
    ],
    impact: "Localization typically yields 20-30% download increase in target markets",
    scoreBoost: "Expands reach to new markets (doesn't change English audit score)",
    aiStatus: hasAiLoc ? "reviewed" : "available",
    deepDiveSection: "localization",
  }];
}

// ---------------------------------------------------------------------------
// WHAT'S NEW BRIEF (AI-powered)
// ---------------------------------------------------------------------------

function whatsNewBrief(data: AppData, p: AppProfile, ai?: AIAnalysis | null): ActionItem[] {
  const hasAi = ai?.whatsNew && ai.whatsNew.assessment.length > 0;
  if (!hasAi) return [];

  let b = `**AI Assessment:**\n${ai!.whatsNew!.assessment}\n\n`;

  if (data.whatsNew) {
    const preview = data.whatsNew.length > 300 ? data.whatsNew.substring(0, 300) + "..." : data.whatsNew;
    b += `**Current What's New text:**\n${preview}\n\n`;
  } else {
    b += `**Current:** No What's New text detected\n\n`;
  }

  if (ai!.whatsNew!.suggestions.length > 0) {
    b += `**AI-suggested What's New copy:**\n`;
    for (const s of ai!.whatsNew!.suggestions) b += `\n${s}\n`;
    b += `\n`;
  }

  b += `**Best practices:**\n`;
  b += `  \u2022 Lead with the most exciting user-facing change\n`;
  b += `  \u2022 Write for users, not developers — no internal jargon or ticket numbers\n`;
  b += `  \u2022 Include keywords naturally (indexed on Google Play)\n`;
  b += `  \u2022 ${data.platform === "ios" ? "Limit: 4,000 chars. Shown in the Updates tab." : "Shown under What's New section."}`;

  return [{
    id: "whats-new",
    priority: "medium", effort: "quick", category: "What's New",
    title: "Improve release notes for next update",
    currentState: data.whatsNew ? `${data.whatsNew.length} chars` : "Not set",
    action: b, brief: b,
    copyOptions: ai!.whatsNew!.suggestions.length > 0 ? ai!.whatsNew!.suggestions : undefined,
    deliverables: [
      "Rewrite What's New copy using AI suggestions above",
      `Update in ${data.platform === "ios" ? "App Store Connect \u203A What's New" : "Google Play Console \u203A Release notes"}`,
    ],
    impact: "What's New drives re-engagement from existing users and appears in Updates tab",
    scoreBoost: "Indirect \u2014 improves user perception and re-engagement",
    aiStatus: "reviewed",
    deepDiveSection: "maintenance",
  }];
}

// ---------------------------------------------------------------------------
// A/B TESTING BRIEF (AI-powered)
// ---------------------------------------------------------------------------

function abTestingBrief(data: AppData, _p: AppProfile, ai?: AIAnalysis | null): ActionItem[] {
  const hasAi = ai?.abTesting && ai.abTesting.experiments.length > 0;
  if (!hasAi) return [];

  let b = `**AI Testing Recommendations:**\n`;
  b += `**Priority:** ${ai!.abTesting!.priority}\n\n`;

  for (let i = 0; i < ai!.abTesting!.experiments.length; i++) {
    const exp = ai!.abTesting!.experiments[i];
    b += `**Experiment ${i + 1}: ${exp.name}**\n`;
    b += `  Hypothesis: ${exp.hypothesis}\n`;
    b += `  Variants:\n`;
    for (const v of exp.variants) b += `    \u2022 ${v}\n`;
    b += `  Primary metric: ${exp.metric}\n\n`;
  }

  if (data.platform === "ios") {
    b += `**Platform:** Apple Product Page Optimization (PPO)\n`;
    b += `  \u2022 Up to 3 treatments against original\n`;
    b += `  \u2022 Test screenshot order, caption copy, or visual styles\n`;
    b += `  \u2022 Set up in App Store Connect \u203A Product Page Optimization\n`;
  } else {
    b += `**Platform:** Google Play Store Listing Experiments\n`;
    b += `  \u2022 Run for 7+ days with 50%+ traffic for statistical significance\n`;
    b += `  \u2022 Test screenshots, short description, or icon\n`;
    b += `  \u2022 Set up in Google Play Console \u203A Store Listing Experiments\n`;
  }

  return [{
    id: "ab-testing",
    priority: ai!.abTesting!.priority === "high" ? "high" : "medium",
    effort: "medium",
    category: "A/B Testing",
    title: `Run ${ai!.abTesting!.experiments.length} store listing experiment${ai!.abTesting!.experiments.length > 1 ? "s" : ""}`,
    currentState: "No active experiments detected",
    action: b, brief: b,
    deliverables: [
      ...ai!.abTesting!.experiments.map(e => `Set up experiment: "${e.name}"`),
      `Run each for ${data.platform === "ios" ? "minimum 7 days" : "7+ days with 50%+ traffic"}`,
      "Analyze results and implement winning variants",
    ],
    impact: "A/B testing removes guesswork \u2014 data-driven decisions improve conversion",
    scoreBoost: "Depends on experiment outcomes",
    aiStatus: "reviewed",
    deepDiveSection: "title",
  }];
}

// ---------------------------------------------------------------------------
// CUSTOM STORE LISTINGS BRIEF (Android, AI-powered)
// ---------------------------------------------------------------------------

function customStoreListingsBrief(data: AppData, ai?: AIAnalysis | null): ActionItem[] {
  const hasAi = ai?.screenshots?.customStoreListings && ai.screenshots.customStoreListings.shouldUse;
  if (!hasAi) return [];

  const csl = ai!.screenshots!.customStoreListings!;
  let b = `**AI Custom Store Listings Recommendation:**\n${csl.reasoning}\n\n`;

  if (csl.listingIdeas.length > 0) {
    b += `**Listing ideas for ${data.title}:**\n`;
    for (let i = 0; i < csl.listingIdeas.length; i++) {
      b += `  ${i + 1}. ${csl.listingIdeas[i]}\n`;
    }
    b += `\n`;
  }

  b += `**Google Play Custom Store Listings:**\n`;
  b += `  \u2022 Create multiple store listings per app (Android's equivalent to iOS CPPs)\n`;
  b += `  \u2022 Country-specific listings with localized screenshots and descriptions\n`;
  b += `  \u2022 Custom listings for paid campaign landing pages\n`;
  b += `  \u2022 Each listing can have different screenshots, short description, and full description\n`;
  b += `  \u2022 Set up in Google Play Console \u203A Store presence \u203A Custom store listings\n\n`;

  b += `**Implementation:**\n`;
  b += `  1. Identify target segments (countries, campaign audiences, user types)\n`;
  b += `  2. Create tailored screenshots and descriptions for each segment\n`;
  b += `  3. Link custom listings to paid campaigns for targeted landing pages\n`;
  b += `  4. Monitor conversion rates per listing vs default`;

  return [{
    id: "custom-store-listings",
    priority: "medium", effort: "heavy", category: "Custom Store Listings",
    title: `Create ${csl.listingIdeas.length} custom store listings for targeted conversion`,
    currentState: "Default listing only",
    action: b, brief: b,
    deliverables: [
      ...csl.listingIdeas.map(idea => `Create listing: "${idea}"`),
      "Design segment-specific screenshots for each listing",
      "Set up in Google Play Console \u203A Custom store listings",
      "Link to relevant ad campaigns",
    ],
    impact: "Custom listings improve conversion for specific audiences and ad campaigns",
    scoreBoost: "Improves conversion for targeted segments",
    aiStatus: "reviewed",
    deepDiveSection: "localization",
  }];
}

// ---------------------------------------------------------------------------
// CPP STRATEGY BRIEF (iOS, AI-powered)
// ---------------------------------------------------------------------------

function cppBrief(data: AppData, _p: AppProfile, ai?: AIAnalysis | null): ActionItem[] {
  // Android: custom store listings (equivalent to CPPs)
  if (data.platform === "android") {
    return customStoreListingsBrief(data, ai);
  }

  const hasCpp = ai?.screenshots?.cppStrategy && ai.screenshots.cppStrategy.shouldUseCPPs;
  if (!hasCpp) return [];

  const cpp = ai!.screenshots!.cppStrategy!;
  let b = `**AI CPP Recommendation:**\n${cpp.reasoning}\n\n`;

  if (cpp.keywordClusters.length > 0) {
    b += `**Keyword clusters for dedicated CPPs:**\n`;
    for (let i = 0; i < cpp.keywordClusters.length; i++) {
      b += `  ${i + 1}. ${cpp.keywordClusters[i]}\n`;
    }
    b += `\n`;
  }

  b += `**Custom Product Pages** (per screenshots skill):\n`;
  b += `  \u2022 Up to 70 CPPs per app, each with unique screenshots\n`;
  b += `  \u2022 Average 8.6% conversion lift, up to 60% CPA reduction vs default page\n`;
  b += `  \u2022 Each CPP gets its own screenshot set and promotional text\n`;
  b += `  \u2022 Link CPPs to Apple Search Ads for keyword-specific landing pages\n`;
  b += `  \u2022 Align CPP screenshot captions with target keyword cluster for OCR indexing\n\n`;

  b += `**Implementation:**\n`;
  b += `  1. Identify 2-3 high-intent keyword clusters from your search ads or organic data\n`;
  b += `  2. Design screenshot sets tailored to each cluster's user intent\n`;
  b += `  3. Write keyword-optimized captions matching each cluster\n`;
  b += `  4. Create CPPs in App Store Connect \u203A Custom Product Pages\n`;
  b += `  5. Link to Apple Search Ads campaigns targeting those keywords`;

  return [{
    id: "cpp-strategy",
    priority: "medium", effort: "heavy", category: "Custom Product Pages",
    title: `Create ${cpp.keywordClusters.length} Custom Product Pages for keyword clusters`,
    currentState: "No CPPs detected",
    action: b, brief: b,
    deliverables: [
      ...cpp.keywordClusters.map(c => `Design screenshot set for: "${c}"`),
      "Create CPPs in App Store Connect",
      "Link to Apple Search Ads campaigns",
      "Monitor conversion rates per CPP vs default page",
    ],
    impact: "CPPs deliver average 8.6% conversion lift and up to 60% CPA reduction on paid campaigns",
    scoreBoost: "Improves paid acquisition ROI + organic conversion for specific keyword intents",
    aiStatus: "reviewed",
    deepDiveSection: "screenshots",
  }];
}

// ---------------------------------------------------------------------------
// MAIN GENERATOR
// ---------------------------------------------------------------------------

export function generateActionPlan(
  appData: AppData,
  categories: AuditCategory[],
  _overallScore: number,
  ai?: AIAnalysis | null,
): ActionItem[] {
  const p = buildProfile(appData);

  const actions = [
    ...titleBrief(appData, p, categories, ai),
    ...subtitleBrief(appData, p, categories, ai),
    ...keywordFieldBrief(appData, p, categories, ai),
    ...shortDescBrief(appData, p, categories, ai),
    ...descriptionBrief(appData, p, categories, ai),
    ...iconBrief(appData, p, ai),
    ...visualsBrief(appData, p, categories, ai),
    ...ratingsBrief(appData, p, categories, ai),
    ...whatsNewBrief(appData, p, ai),
    ...maintenanceBrief(appData, p, categories, ai),
    ...conversionBrief(appData, p, categories, ai),
    ...abTestingBrief(appData, p, ai),
    ...cppBrief(appData, p, ai),
    ...localizationBrief(appData, p, ai),
  ];

  // Add AI top insights as a standalone action item
  if (ai?.topInsights && ai.topInsights.length > 0) {
    let b = `**Key strategic insights from AI analysis:**\n\n`;
    for (let i = 0; i < ai.topInsights.length; i++) {
      b += `${i + 1}. ${ai.topInsights[i]}\n`;
    }
    actions.unshift({
      id: "ai-insights",
      priority: "high", effort: "quick", category: "Strategic Insights",
      title: "Top priorities from AI analysis",
      currentState: `${ai.topInsights.length} insights identified`,
      action: b, brief: b,
      impact: "AI-identified priorities based on full listing analysis including visual review",
      scoreBoost: "Varies by action",
      aiStatus: "reviewed",
    });
  }

  return actions.sort((a, b) => {
    const pr = { critical: 0, high: 1, medium: 2, low: 3 };
    const ef = { quick: 0, medium: 1, heavy: 2 };
    const d = pr[a.priority] - pr[b.priority];
    return d !== 0 ? d : ef[a.effort] - ef[b.effort];
  });
}
