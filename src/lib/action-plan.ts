import type { AppData, AuditCategory } from "./aso-rules";

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
  example?: string;
  impact: string;
  scoreBoost: string;
}

interface AppProfile {
  brand: string;
  coreFunction: string;
  features: string[];
  benefits: string[];
  keywords: string[];
  categoryKeywords: string[];
  audience: string;
}

// ---------------------------------------------------------------------------
// App profiling — extracts real features, benefits, and keywords from app data
// ---------------------------------------------------------------------------

const NOISE_WORDS = new Set([
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
  "including", "support", "supports", "supported", "whether",
  "experience", "designed", "built", "create", "created",
  "https", "http", "www", "com", "org", "net",
]);

function isGarbage(word: string): boolean {
  if (word.length < 3) return true;
  if (NOISE_WORDS.has(word)) return true;
  if (/^\d+$/.test(word)) return true;
  if (/[./:@#]/.test(word)) return true;
  if (/^(ios|android|iphone|ipad|google|apple|play|store|app)$/i.test(word)) return true;
  return false;
}

function extractFeatures(description: string): string[] {
  const features: string[] = [];
  const lines = description.split(/\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    // Bullet points or list items often describe features
    const listMatch = trimmed.match(/^[\u2022\-*\u2605\u2713\u2714\u25BA\u25B8•]\s*(.+)/);
    if (listMatch && listMatch[1].length > 5 && listMatch[1].length < 120) {
      features.push(listMatch[1].trim());
      continue;
    }
    // Lines starting with emoji often describe features
    const emojiMatch = trimmed.match(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*(.+)/u);
    if (emojiMatch && emojiMatch[1].length > 5 && emojiMatch[1].length < 120) {
      features.push(emojiMatch[1].trim());
      continue;
    }
    // Short capitalized lines (feature headings)
    if (trimmed.length > 5 && trimmed.length < 60 && /^[A-Z]/.test(trimmed) && !trimmed.endsWith(".")) {
      const wordCount = trimmed.split(/\s+/).length;
      if (wordCount >= 2 && wordCount <= 8) {
        features.push(trimmed);
      }
    }
  }

  return features.slice(0, 12);
}

function extractCoreFunctionFromTitle(title: string, category: string): string {
  // Try to get the descriptive part after brand separator
  const parts = title.split(/[\-:|–—]/);
  if (parts.length > 1) {
    return parts.slice(1).join(" ").trim();
  }
  // Fall back to category
  return category || "app";
}

function extractBenefitPhrases(description: string): string[] {
  const benefits: string[] = [];
  const sentences = description.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);

  const benefitPatterns = [
    /listen to (.{5,40})/i,
    /stream (.{5,40})/i,
    /discover (.{5,40})/i,
    /browse (.{5,40})/i,
    /enjoy (.{5,40})/i,
    /access (.{5,40})/i,
    /explore (.{5,40})/i,
    /track (.{5,40})/i,
    /manage (.{5,40})/i,
    /create (.{5,40})/i,
    /save (.{5,40})/i,
    /share (.{5,40})/i,
    /sync (.{5,40})/i,
    /customize (.{5,40})/i,
    /personalize (.{5,40})/i,
    /(\d+\+?\s+\w[\w\s]{3,30})/i,  // "100+ channels", "50K+ users"
    /(?:high[- ]?quality|hifi|hi-fi|hd|premium)\s+(\w[\w\s]{3,25})/i,
    /(?:curated|handpicked|hand-picked)\s+(\w[\w\s]{3,25})/i,
    /(?:offline|background)\s+(\w[\w\s]{3,25})/i,
  ];

  for (const sentence of sentences.slice(0, 20)) {
    for (const pattern of benefitPatterns) {
      const match = sentence.match(pattern);
      if (match) {
        const phrase = (match[1] || match[0]).trim();
        if (phrase.length > 5 && phrase.length < 60) {
          benefits.push(phrase);
        }
      }
    }
  }

  return [...new Set(benefits)].slice(0, 10);
}

function extractMeaningfulKeywords(description: string, title: string): string[] {
  const combined = `${title} ${description}`.toLowerCase();
  const words = combined
    .replace(/[^a-z0-9\s\-']/g, " ")
    .split(/\s+/)
    .filter(w => !isGarbage(w));

  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  return [...freq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, 15);
}

const CATEGORY_CONTEXT: Record<string, { audience: string; verbs: string[]; benefits: string[] }> = {
  "Music": { audience: "music listeners", verbs: ["Listen", "Stream", "Discover"], benefits: ["high-quality audio", "curated playlists", "offline listening"] },
  "Music & Audio": { audience: "music listeners", verbs: ["Listen", "Stream", "Discover"], benefits: ["high-quality audio", "curated playlists", "offline listening"] },
  "Entertainment": { audience: "entertainment seekers", verbs: ["Watch", "Stream", "Discover"], benefits: ["endless content", "personalized picks", "offline viewing"] },
  "Productivity": { audience: "professionals", verbs: ["Organize", "Track", "Manage"], benefits: ["save time", "stay focused", "work smarter"] },
  "Health & Fitness": { audience: "health-conscious users", verbs: ["Track", "Monitor", "Improve"], benefits: ["reach goals", "build habits", "stay motivated"] },
  "Education": { audience: "learners", verbs: ["Learn", "Study", "Master"], benefits: ["learn faster", "retain more", "skill up"] },
  "Finance": { audience: "financial planners", verbs: ["Track", "Save", "Invest"], benefits: ["save money", "grow wealth", "budget smarter"] },
  "Photo & Video": { audience: "creators", verbs: ["Edit", "Create", "Share"], benefits: ["stunning results", "pro-quality edits", "instant sharing"] },
  "Social Networking": { audience: "social users", verbs: ["Connect", "Share", "Discover"], benefits: ["grow your network", "share moments", "stay connected"] },
  "Travel": { audience: "travelers", verbs: ["Explore", "Book", "Navigate"], benefits: ["save on travel", "discover places", "stress-free trips"] },
  "Shopping": { audience: "shoppers", verbs: ["Shop", "Save", "Discover"], benefits: ["best deals", "save money", "find anything"] },
  "Food & Drink": { audience: "food lovers", verbs: ["Discover", "Order", "Cook"], benefits: ["new recipes", "quick delivery", "eat better"] },
  "Games": { audience: "gamers", verbs: ["Play", "Compete", "Unlock"], benefits: ["endless fun", "challenge friends", "level up"] },
  "Sports": { audience: "sports fans", verbs: ["Follow", "Track", "Watch"], benefits: ["live scores", "never miss a game", "real-time updates"] },
  "News": { audience: "informed readers", verbs: ["Read", "Follow", "Stay"], benefits: ["breaking news", "stay informed", "trusted sources"] },
  "Weather": { audience: "weather watchers", verbs: ["Check", "Track", "Plan"], benefits: ["accurate forecasts", "severe alerts", "plan ahead"] },
  "Utilities": { audience: "power users", verbs: ["Manage", "Optimize", "Control"], benefits: ["save time", "work faster", "take control"] },
  "Navigation": { audience: "drivers and commuters", verbs: ["Navigate", "Find", "Avoid"], benefits: ["fastest routes", "real-time traffic", "never get lost"] },
  "Lifestyle": { audience: "lifestyle enthusiasts", verbs: ["Discover", "Organize", "Improve"], benefits: ["simplify life", "stay organized", "live better"] },
  "Business": { audience: "business professionals", verbs: ["Manage", "Collaborate", "Analyze"], benefits: ["boost productivity", "team collaboration", "data-driven decisions"] },
};

function buildAppProfile(data: AppData): AppProfile {
  const brandParts = data.title.split(/[\-:|–—]/);
  const brand = brandParts[0].trim();
  const coreFunction = extractCoreFunctionFromTitle(data.title, data.category);
  const features = extractFeatures(data.description);
  const benefits = extractBenefitPhrases(data.description);
  const keywords = extractMeaningfulKeywords(data.description, data.title);
  const catCtx = CATEGORY_CONTEXT[data.category] || CATEGORY_CONTEXT["Lifestyle"];
  const categoryKeywords = catCtx ? catCtx.benefits : [];
  const audience = catCtx ? catCtx.audience : "users";

  return { brand, coreFunction, features, benefits, keywords, categoryKeywords, audience };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function titleCase(s: string): string {
  const minor = new Set(["a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"]);
  return s.split(/\s+/).map((w, i) =>
    i === 0 || !minor.has(w.toLowerCase()) ? capitalize(w.toLowerCase()) : w.toLowerCase()
  ).join(" ");
}

// ---------------------------------------------------------------------------
// Screenshot caption generator — benefit-focused, 2-5 words per skill rules
// ---------------------------------------------------------------------------

function generateScreenshotPlan(data: AppData, profile: AppProfile): { slot: number; role: string; caption: string; scene: string }[] {
  const maxScreenshots = data.platform === "ios" ? 10 : 8;
  const catCtx = CATEGORY_CONTEXT[data.category] || { verbs: ["Discover", "Explore", "Use"], benefits: [] };
  const verb = catCtx.verbs[0] || "Discover";
  const verb2 = catCtx.verbs[1] || "Explore";
  const verb3 = catCtx.verbs[2] || "Try";

  const featureNames = profile.features.slice(0, 8);
  const benefitPhrases = profile.benefits.slice(0, 6);

  // Build captions based on gallery order strategy from the screenshots skill:
  // 1=Hero, 2=Differentiator, 3=Popular Feature, 4=Social Proof, 5+=Additional
  const plan: { slot: number; role: string; caption: string; scene: string }[] = [];

  // Slot 1: Hero — core value proposition
  plan.push({
    slot: 1,
    role: "Hero — Core Value Proposition",
    caption: `${verb} ${profile.coreFunction}`.substring(0, 40),
    scene: `Show the primary screen in-use — ${featureNames[0] || `the core ${data.category.toLowerCase()} experience`} with real content, not empty states`,
  });

  // Slot 2: Key differentiator
  if (benefitPhrases[0]) {
    plan.push({
      slot: 2,
      role: "Key Differentiator",
      caption: titleCase(benefitPhrases[0]).substring(0, 40),
      scene: `Highlight what makes ${profile.brand} unique — ${featureNames[1] || benefitPhrases[0]}`,
    });
  } else {
    plan.push({
      slot: 2,
      role: "Key Differentiator",
      caption: `${verb2} ${titleCase(profile.keywords[0] || data.category)}`.substring(0, 40),
      scene: `Show the feature that sets ${profile.brand} apart from competitors`,
    });
  }

  // Slot 3: Most popular feature
  plan.push({
    slot: 3,
    role: "Most Popular Feature",
    caption: featureNames[1]
      ? `${verb3} ${titleCase(featureNames[1].split(/[–—\-:]/).pop()?.trim() || featureNames[1])}`.substring(0, 40)
      : `${verb3} ${titleCase(profile.keywords[1] || "More Features")}`.substring(0, 40),
    scene: `Demonstrate the most-used feature — ${featureNames[1] || "the feature users engage with most"}`,
  });

  // Slot 4: Social proof
  const ratingStr = data.rating > 0 ? `${data.rating.toFixed(1)}\u2605` : "";
  const countStr = data.ratingsCount >= 1000
    ? `${Math.floor(data.ratingsCount / 1000)}K+`
    : data.ratingsCount > 0 ? `${data.ratingsCount.toLocaleString()}` : "";
  const proofCaption = ratingStr && countStr
    ? `${ratingStr} Rated by ${countStr} ${profile.audience}`
    : `Loved by ${profile.audience}`;

  plan.push({
    slot: 4,
    role: "Social Proof",
    caption: proofCaption.substring(0, 45),
    scene: "Overlay rating badge or user testimonial on an in-use screen — show real social proof",
  });

  // Slot 5+: Additional features
  const additionalFeatures = featureNames.slice(2);
  const additionalBenefits = benefitPhrases.slice(1);

  for (let i = 4; i < maxScreenshots; i++) {
    const featureIdx = i - 4;
    const feat = additionalFeatures[featureIdx];
    const benefit = additionalBenefits[featureIdx];
    const kw = profile.keywords[i] || profile.keywords[featureIdx % profile.keywords.length];

    let caption: string;
    let scene: string;

    if (feat) {
      const shortFeat = feat.length > 35 ? feat.split(/[–—\-:,]/).pop()?.trim() || feat : feat;
      caption = titleCase(shortFeat).substring(0, 40);
      scene = `Show ${feat} in action with real data`;
    } else if (benefit) {
      caption = titleCase(benefit).substring(0, 40);
      scene = `Demonstrate this benefit with an in-app screen`;
    } else if (kw) {
      caption = `${verb2} ${titleCase(kw)}`.substring(0, 40);
      scene = `Feature deep-dive or secondary capability`;
    } else {
      caption = `More from ${profile.brand}`.substring(0, 40);
      scene = `Additional feature or settings/customization screen`;
    }

    const role = i === maxScreenshots - 1 ? "CTA / Download Prompt" : `Feature ${i - 3}`;
    plan.push({ slot: i + 1, role, caption, scene });
  }

  return plan;
}

// ---------------------------------------------------------------------------
// Brief generators — each section produces a fully tailored brief
// ---------------------------------------------------------------------------

function generateTitleBrief(data: AppData, profile: AppProfile, categories: AuditCategory[]): ActionItem[] {
  const actions: ActionItem[] = [];
  const titleCat = categories.find(c => c.id === "title");
  if (!titleCat) return actions;

  const lengthRule = titleCat.results.find(r => r.ruleId === "title-length");
  const keywordRule = titleCat.results.find(r => r.ruleId === "title-keywords");
  const frontloadRule = titleCat.results.find(r => r.ruleId === "title-frontload");

  const remaining = 30 - data.title.length;
  const needsKeywords = keywordRule && keywordRule.score < 60;
  const needsLength = lengthRule && lengthRule.score < 90 && remaining > 3;
  const needsFrontload = frontloadRule && frontloadRule.score < 60;

  if (!needsKeywords && !needsLength && !needsFrontload) return actions;

  const titleWords = new Set(data.title.toLowerCase().split(/[\s\-:|–—]+/).filter(w => w.length > 2));
  const availableKeywords = profile.keywords
    .filter(w => !titleWords.has(w))
    .slice(0, 6);

  const copyOptions: string[] = [];

  if (needsKeywords && availableKeywords.length >= 2) {
    copyOptions.push(
      `${profile.brand} - ${titleCase(availableKeywords[0])} & ${titleCase(availableKeywords[1])}`.substring(0, 30),
      `${profile.brand}: ${titleCase(availableKeywords[0])} ${titleCase(availableKeywords[1])}`.substring(0, 30),
      `${titleCase(availableKeywords[0])} ${titleCase(availableKeywords[1])} - ${profile.brand}`.substring(0, 30),
    );
  } else if (needsLength && remaining > 3 && availableKeywords[0]) {
    copyOptions.push(
      `${data.title} & ${titleCase(availableKeywords[0])}`.substring(0, 30),
      `${data.title} ${titleCase(availableKeywords[0])}`.substring(0, 30),
    );
  } else if (needsFrontload && availableKeywords.length >= 1) {
    copyOptions.push(
      `${titleCase(availableKeywords[0])} - ${profile.brand}`.substring(0, 30),
      `${titleCase(profile.coreFunction)} | ${profile.brand}`.substring(0, 30),
    );
  }

  const validOptions = copyOptions.filter(o => o.length > 0 && o.length <= 30);

  let brief = `**Current title:** "${data.title}" (${data.title.length}/30 chars)\n`;
  brief += `**Brand:** "${profile.brand}" | **Descriptive part:** "${profile.coreFunction}"\n`;
  brief += `**Keywords in title:** ${[...titleWords].filter(w => w.length > 2).map(w => `"${w}"`).join(", ") || "none beyond brand"}\n`;
  brief += `**High-value keywords NOT in title:** ${availableKeywords.slice(0, 4).map(w => `"${w}"`).join(", ")}\n\n`;

  if (needsKeywords) {
    brief += `Your title is brand-heavy with limited keyword coverage. Users searching for "${availableKeywords[0] || data.category.toLowerCase()}" won't find you unless those terms are in your title or subtitle. Restructure to "Brand \u2013 Keyword Phrase" format.`;
  } else if (needsLength) {
    brief += `You have ${remaining} unused characters in your highest-weighted metadata field. Every unused character is a missed ranking opportunity.`;
  } else if (needsFrontload) {
    brief += `"${profile.brand}" occupies the first 15 characters (the most visible/weighted zone). Unless it's a household name, move keywords first: "Keyword \u2013 Brand".`;
  }

  brief += `\n\n**Rules:** Front-load keywords in first 15 chars. Write for humans first. No superlatives ("best", "#1") — stores reject these.`;

  actions.push({
    id: "title-optimize",
    priority: needsKeywords ? "critical" : "high",
    effort: "quick",
    category: "Title",
    title: needsKeywords
      ? "Restructure title with high-value keywords"
      : needsFrontload ? "Front-load keywords before brand name" : `Fill ${remaining} unused title characters`,
    currentState: `"${data.title}" (${data.title.length}/30 chars)`,
    action: brief,
    brief,
    copyOptions: validOptions.length > 0 ? validOptions : undefined,
    deliverables: [
      `Draft 2-3 title variants (30 chars max)`,
      `Update in ${data.platform === "ios" ? "App Store Connect" : "Google Play Console"}`,
      "A/B test for 7+ days before committing",
      ...(data.platform === "ios" ? ["Requires app update submission"] : []),
    ],
    impact: "Title is the single most weighted metadata field for search ranking",
    scoreBoost: needsKeywords ? "+30-50 on Title score" : "+10-20 on Title score",
  });

  return actions;
}

function generateSubtitleBrief(data: AppData, profile: AppProfile, categories: AuditCategory[]): ActionItem[] {
  if (data.platform !== "ios") return [];
  const cat = categories.find(c => c.id === "subtitle");
  if (!cat) return [];

  const lengthRule = cat.results.find(r => r.ruleId === "subtitle-length");
  const dupeRule = cat.results.find(r => r.ruleId === "subtitle-no-duplicate");
  const isEmpty = !data.subtitle || data.subtitle.length === 0;
  const hasDupes = dupeRule && dupeRule.score < 70;

  if (lengthRule && (isEmpty || lengthRule.score < 90 || hasDupes)) {
    const titleWords = new Set(data.title.toLowerCase().split(/[\s\-:,|–—]+/).filter(w => w.length > 2));
    const uniqueKeywords = profile.keywords
      .filter(w => !titleWords.has(w) && w.length > 2)
      .slice(0, 8);

    const catCtx = CATEGORY_CONTEXT[data.category];
    const copyOptions: string[] = [];

    if (uniqueKeywords.length >= 2) {
      const verb = catCtx?.verbs[0] || "Discover";
      copyOptions.push(
        `${verb} ${titleCase(uniqueKeywords[0])} & ${titleCase(uniqueKeywords[1])}`.substring(0, 30),
      );
    }
    if (profile.benefits[0]) {
      copyOptions.push(titleCase(profile.benefits[0]).substring(0, 30));
    }
    if (uniqueKeywords.length >= 3) {
      copyOptions.push(
        `${titleCase(uniqueKeywords[0])}, ${titleCase(uniqueKeywords[1])} & More`.substring(0, 30),
      );
    }

    const validOptions = copyOptions.filter(o => o.length > 0 && o.length <= 30);

    let brief = "";
    if (isEmpty) {
      brief += `**Current subtitle:** (empty \u2014 field not set)\n`;
      brief += `**Title words (avoid duplicating):** ${[...titleWords].filter(w => w.length > 2).map(w => `"${w}"`).join(", ")}\n`;
      brief += `**Keywords available for subtitle:** ${uniqueKeywords.slice(0, 5).map(w => `"${w}"`).join(", ")}\n\n`;
      brief += `The subtitle is iOS's second-most weighted metadata field. Apple combines title + subtitle + keyword field into ~160 indexable characters. Leaving the subtitle empty wastes 30 of those.\n\n`;
      brief += `**Rules:** No word overlap with title (Apple doesn't double-count). No category name (already indexed). Benefit-first language. Use every character.`;
    } else {
      const dupeWords = data.subtitle!.toLowerCase().split(/[\s\-:,|]+/)
        .filter(w => titleWords.has(w) && w.length > 2);
      brief += `**Current subtitle:** "${data.subtitle}" (${data.subtitle!.length}/30 chars)\n`;
      if (dupeWords.length > 0) {
        brief += `**Words duplicated from title:** ${dupeWords.map(w => `"${w}"`).join(", ")} \u2014 these add zero extra ranking value\n`;
      }
      brief += `**Keywords to swap in:** ${uniqueKeywords.slice(0, 5).map(w => `"${w}"`).join(", ")}\n\n`;
      brief += hasDupes
        ? `Replace duplicated words with fresh keywords. Apple's algorithm gives no extra weight for repeating the same word across title and subtitle.`
        : `You have ${30 - data.subtitle!.length} unused characters. Fill them with your next-priority keywords that don't appear in the title.`;
    }

    return [{
      id: "subtitle-optimize",
      priority: isEmpty ? "critical" : "high",
      effort: "quick",
      category: "Subtitle",
      title: isEmpty ? "Add a subtitle \u2014 your second most valuable field is empty" : "Optimize subtitle keywords",
      currentState: isEmpty ? "No subtitle set" : `"${data.subtitle}" (${data.subtitle!.length}/30 chars)`,
      action: brief,
      brief,
      copyOptions: validOptions.length > 0 ? validOptions : undefined,
      deliverables: [
        "Draft subtitle (30 chars max, zero title-word overlap)",
        "Update in App Store Connect \u203A App Information \u203A Subtitle",
        "Requires app update submission for review",
      ],
      impact: "Unlocks keyword rankings for terms not reachable via title alone",
      scoreBoost: isEmpty ? "+60-90 on Subtitle score" : "+15-30 on Subtitle score",
    }];
  }

  return [];
}

function generateShortDescBrief(data: AppData, profile: AppProfile, categories: AuditCategory[]): ActionItem[] {
  if (data.platform !== "android") return [];
  const cat = categories.find(c => c.id === "short-description");
  if (!cat) return [];
  const rule = cat.results[0];
  if (!rule || rule.score >= 80) return [];

  const catCtx = CATEGORY_CONTEXT[data.category] || { verbs: ["Discover"] };
  const verb = catCtx.verbs[0] || "Discover";

  const copyOptions: string[] = [];
  if (profile.benefits[0]) {
    copyOptions.push(
      `${verb} ${profile.coreFunction.toLowerCase()}: ${profile.benefits[0]}. ${titleCase(profile.keywords[0] || "")} & more.`.substring(0, 80),
    );
  }
  if (profile.features[0]) {
    copyOptions.push(
      `${profile.brand}: ${profile.features[0]}. ${profile.coreFunction}.`.substring(0, 80),
    );
  }

  let brief = `**Current short description:** ${data.shortDescription ? `"${data.shortDescription}" (${data.shortDescription.length}/80 chars)` : "(empty)"}\n`;
  brief += `**Primary keywords:** ${profile.keywords.slice(0, 5).map(w => `"${w}"`).join(", ")}\n\n`;
  brief += `The short description appears in Google Play search results and is the second-most indexed text field. Front-load your primary keyword in the first 3 words. It must read naturally \u2014 this is the first text users see in search results.\n\n`;
  brief += `**Rules:** 80 chars max. Front-load keywords. Write a compelling pitch, not a keyword list. Ends with benefit or call to action.`;

  return [{
    id: "short-desc-optimize",
    priority: data.shortDescription ? "high" : "critical",
    effort: "quick",
    category: "Short Description",
    title: data.shortDescription ? "Rewrite short description for better keyword coverage" : "Add a short description",
    currentState: data.shortDescription ? `"${data.shortDescription}" (${data.shortDescription.length}/80 chars)` : "Not set",
    action: brief,
    brief,
    copyOptions: copyOptions.length > 0 ? copyOptions : undefined,
    deliverables: [
      "Write 2-3 short description variants (80 chars max each)",
      "Update in Google Play Console \u203A Store Listing \u203A Short description",
      "Run a Store Listing Experiment to A/B test variants",
    ],
    impact: "Directly affects Google Play search ranking and click-through rate",
    scoreBoost: "+30-60 on Short Description score",
  }];
}

function generateDescriptionBrief(data: AppData, profile: AppProfile, categories: AuditCategory[]): ActionItem[] {
  const cat = categories.find(c => c.id === "description");
  if (!cat) return [];

  const structRule = cat.results.find(r => r.ruleId === "desc-structure");
  const densityRule = cat.results.find(r => r.ruleId === "desc-keyword-density");
  const lengthRule = cat.results.find(r => r.ruleId === "desc-length");

  const needsWork = (structRule && structRule.score < 70) ||
    (densityRule && densityRule.score < 70) ||
    (lengthRule && lengthRule.score < 70);

  if (!needsWork) return [];

  const desc = data.description;
  const first200 = desc.substring(0, 200).replace(/\n/g, " ");
  const wordCount = desc.split(/\s+/).length;
  const hasBullets = /[\u2022\-*]/.test(desc);
  const hasParagraphs = (desc.match(/\n\n/g) || []).length >= 2;

  let brief = `**Current description:** ${desc.length} chars, ~${wordCount} words\n`;
  brief += `**First 3 lines (visible before "Read more"):** "${first200}${desc.length > 200 ? "..." : ""}"\n`;
  brief += `**Structure:** ${hasParagraphs ? "Has paragraphs" : "No paragraph breaks"} | ${hasBullets ? "Has bullet points" : "No bullet points"}\n`;
  brief += `**Features detected:** ${profile.features.length > 0 ? profile.features.slice(0, 4).map(f => `"${f}"`).join(", ") : "None (description lacks structured feature content)"}\n\n`;

  brief += `**Recommended structure:**\n\n`;
  brief += `**1. Opening hook** (first 3 lines \u2014 visible without tapping "Read more"):\n`;
  brief += `   Lead with your core value proposition. Front-load primary keywords.\n`;
  brief += `   E.g.: "${profile.brand} is the ${profile.coreFunction.toLowerCase()} that ${profile.benefits[0] || `delivers ${profile.categoryKeywords[0] || "results"}`}. ${profile.features[0] ? capitalize(profile.features[0]) + "." : ""}"\n\n`;
  brief += `**2. Feature list** (bullet points \u2014 scannable):\n`;

  for (const feat of profile.features.slice(0, 5)) {
    brief += `   \u2022 ${feat}\n`;
  }
  if (profile.features.length === 0) {
    brief += `   \u2022 [Core feature 1 \u2014 describe the benefit]\n`;
    brief += `   \u2022 [Core feature 2 \u2014 describe the benefit]\n`;
    brief += `   \u2022 [Core feature 3 \u2014 describe the benefit]\n`;
  }

  brief += `\n**3. Social proof:**\n`;
  if (data.ratingsCount > 100) {
    brief += `   "${data.rating.toFixed(1)}\u2605 rated by ${data.ratingsCount.toLocaleString()}+ ${profile.audience}"\n`;
  } else {
    brief += `   Add press mentions, awards, or user milestones\n`;
  }

  brief += `\n**4. Call to action:**\n`;
  brief += `   "Download ${profile.brand} and ${profile.benefits[0] || `start your ${data.category.toLowerCase()} experience`} today."`;

  if (data.platform === "android") {
    brief += `\n\n**Keyword density targets** (Google indexes full description):`;
    for (const w of profile.keywords.slice(0, 4)) {
      const count = (desc.toLowerCase().split(w).length - 1);
      brief += `\n   "${w}": currently ${count}x \u2192 target 3-5x`;
    }
  }

  return [{
    id: "desc-rewrite",
    priority: data.platform === "android" ? "high" : "medium",
    effort: "medium",
    category: "Description",
    title: "Rewrite description with optimized structure and keywords",
    currentState: `${desc.length} chars, ~${wordCount} words \u2014 ${!hasBullets ? "no bullets" : "has bullets"}, ${!hasParagraphs ? "no paragraphs" : "has paragraphs"}`,
    action: brief,
    brief,
    deliverables: [
      "Rewrite full description following the 4-section structure",
      `Target length: ${data.platform === "android" ? "2,500-4,000 chars" : "1,000-4,000 chars"}`,
      ...(data.platform === "android" ? [
        "Primary keywords appear 3-5x each, front-loaded in first paragraph",
        "Update in Google Play Console \u203A Store Listing \u203A Full description",
      ] : [
        "Update in App Store Connect \u203A Version Information \u203A Description",
        "Note: iOS description is NOT indexed for search, but impacts conversion + web SEO",
      ]),
    ],
    impact: data.platform === "android"
      ? "Google indexes the full description \u2014 structure and density directly affect rankings"
      : "Better conversion rate from store page visitors + web SEO",
    scoreBoost: "+15-30 on Description score",
  }];
}

function generateVisualsBrief(data: AppData, profile: AppProfile, categories: AuditCategory[]): ActionItem[] {
  const actions: ActionItem[] = [];
  const cat = categories.find(c => c.id === "visuals");
  if (!cat) return actions;

  const maxScreenshots = data.platform === "ios" ? 10 : 8;
  const countRule = cat.results.find(r => r.ruleId === "screenshot-count");
  const videoRule = cat.results.find(r => r.ruleId === "video-presence");

  // --- Screenshot brief ---
  if (countRule && (data.screenshotCount < maxScreenshots || data.platform === "ios")) {
    const plan = generateScreenshotPlan(data, profile);
    const needsNew = data.screenshotCount < maxScreenshots;

    let brief = `**Current screenshots:** ${data.screenshotCount}/${maxScreenshots} slots used\n\n`;
    brief += `**Screenshot gallery plan for ${profile.brand}:**\n`;

    for (const item of plan) {
      const exists = item.slot <= data.screenshotCount;
      brief += `\n  ${exists ? "\u2705" : "\u274C"} **Slot ${item.slot} \u2014 ${item.role}**\n`;
      brief += `     Caption: "${item.caption}"\n`;
      brief += `     Scene: ${item.scene}\n`;
    }

    if (data.platform === "ios") {
      brief += `\n**Apple OCR optimization (2025-2026 ranking signal):**\n`;
      brief += `Apple extracts text from screenshot captions via OCR and uses it for keyword ranking. Your captions are effectively a secondary keyword field.\n\n`;
      brief += `**Caption design specs for OCR indexing:**\n`;
      brief += `  \u2022 Font: Bold sans-serif (SF Pro, Helvetica Neue, Inter) at 40pt+ minimum\n`;
      brief += `  \u2022 Contrast: Dark text on light background or white on dark (no mid-tones)\n`;
      brief += `  \u2022 Position: Top 1/3 of screenshot for maximum OCR reliability\n`;
      brief += `  \u2022 First 3 screenshots carry heaviest indexing weight \u2014 put primary keywords there\n`;
      brief += `  \u2022 Align caption keywords with title + subtitle to amplify ranking signals\n`;
      brief += `  \u2022 OCR check: zoom screenshot to 25% \u2014 if you can still read it, OCR can too\n`;
    }

    brief += `\n**Design specs:**\n`;
    if (data.platform === "ios") {
      brief += `  \u2022 iPhone 6.9" (16/17 Pro Max): 1320 x 2868 px (upload this \u2014 Apple scales down)\n`;
      brief += `  \u2022 iPhone 6.7" (15 Pro Max): 1290 x 2796 px\n`;
      brief += `  \u2022 iPhone 5.5" (legacy): 1242 x 2208 px\n`;
      brief += `  \u2022 iPad 13": 2064 x 2752 px (if iPad app)\n`;
      brief += `  \u2022 Min upload strategy: 6.9" + 5.5" covers modern + legacy devices\n`;
    } else {
      brief += `  \u2022 Standard phone: 1080 x 1920 px (9:16)\n`;
      brief += `  \u2022 High-res phone: 1440 x 2560 px\n`;
      brief += `  \u2022 7" tablet: 1200 x 1920 px (optional, boosts tablet visibility)\n`;
      brief += `  \u2022 Feature graphic: 1024 x 500 px (required for featuring)\n`;
    }

    brief += `\n**Rules:** Real in-app UI required (no abstract art). No empty states. Current-gen device frames (iPhone 16 Pro, Pixel 9). Captions: 2-5 words, benefit-focused.`;

    const deliverables: string[] = [];
    if (needsNew) {
      deliverables.push(`Design ${maxScreenshots - data.screenshotCount} new screenshots for slots ${data.screenshotCount + 1}-${maxScreenshots}`);
    }
    deliverables.push(
      `Write benefit-focused captions for all ${maxScreenshots} slots (see plan above)`,
      `Export at required resolutions for ${data.platform === "ios" ? "all device sizes" : "phone + tablet"}`,
      `Upload to ${data.platform === "ios" ? "App Store Connect \u203A Media Manager" : "Google Play Console \u203A Store Listing"}`,
    );
    if (data.platform === "ios") {
      deliverables.push("Verify OCR readability: zoom to 25% and confirm captions are still legible");
    }

    actions.push({
      id: "screenshots-optimize",
      priority: data.screenshotCount < 3 ? "critical" : "high",
      effort: data.screenshotCount < 4 ? "heavy" : "medium",
      category: "Visual Assets",
      title: needsNew
        ? `Design ${maxScreenshots - data.screenshotCount} new screenshots + optimize all captions`
        : "Optimize screenshot captions for keywords and conversion",
      currentState: `${data.screenshotCount}/${maxScreenshots} screenshots uploaded`,
      action: brief,
      brief,
      deliverables,
      impact: "Screenshots are the #1 conversion driver" + (data.platform === "ios" ? " \u2014 captions are now also a keyword ranking signal via OCR" : ""),
      scoreBoost: "+15-30 on Visual Assets score",
    });
  }

  // --- Video brief ---
  if (videoRule && videoRule.score < 60) {
    const features = profile.features.slice(0, 4);
    const fallbackFeatures = profile.benefits.slice(0, 4);
    const scenes = features.length > 0 ? features : fallbackFeatures;

    let brief = `**Current state:** No preview video detected\n\n`;
    brief += `**Video storyboard for ${profile.brand}:**\n\n`;

    if (data.platform === "ios") {
      brief += `  **0-3s \u2014 Hook:** Open with the core "${profile.coreFunction}" experience in action. Show the wow moment \u2014 ${scenes[0] || `what makes ${profile.brand} compelling`}. Must grab attention immediately (video loops silently).\n\n`;
      brief += `  **3-10s \u2014 Feature 1:** ${scenes[0] || "Primary feature"} \u2014 demonstrate the main use case with real content.\n\n`;
      brief += `  **10-18s \u2014 Feature 2:** ${scenes[1] || "Key differentiator"} \u2014 show what makes ${profile.brand} different from alternatives.\n\n`;
      brief += `  **18-25s \u2014 Feature 3:** ${scenes[2] || "Social proof or advanced feature"} \u2014 ${data.ratingsCount > 100 ? `flash the ${data.rating.toFixed(1)}\u2605 rating` : "show depth and polish"}.\n\n`;
      brief += `  **25-30s \u2014 CTA:** End screen with ${profile.brand} app icon and tagline.\n\n`;
      brief += `**Specs:** 15-30s, H.264 .mov or .mp4, no letterboxing\n`;
      brief += `**Sizes:** 1320x2868 (6.9"), 1290x2796 (6.7"), 1284x2778 (6.5"), 1242x2208 (5.5")\n`;
      brief += `**Rules:** Real app footage only (no renders), no people outside the device, loops silently in store`;
    } else {
      brief += `  **0-3s \u2014 Hook:** The most compelling "${profile.coreFunction}" moment. Grab attention instantly.\n\n`;
      brief += `  **3-15s \u2014 Core experience:** ${scenes[0] || "Main feature"} in action \u2014 show the primary use case.\n\n`;
      brief += `  **15-25s \u2014 Features:** ${scenes[1] || "Feature 2"} and ${scenes[2] || "Feature 3"} \u2014 show depth.\n\n`;
      brief += `  **25-30s \u2014 CTA:** Download prompt with ${profile.brand} branding.\n\n`;
      brief += `**Specs:** 30s-2min YouTube video, landscape preferred\n`;
      brief += `**Upload:** Add YouTube URL in Google Play Console \u203A Store Listing \u203A Promo video`;
    }

    actions.push({
      id: "video-create",
      priority: "medium",
      effort: "heavy",
      category: "Visual Assets",
      title: `Create ${data.platform === "ios" ? "App Preview" : "promo"} video for ${profile.brand}`,
      currentState: "No preview video detected",
      action: brief,
      brief,
      deliverables: [
        "Write video script/storyboard (see plan above)",
        `Record in-app screen captures for each scene \u2014 use real content, not empty states`,
        data.platform === "ios"
          ? "Edit to 15-30s, export H.264 .mov for all required device sizes"
          : "Edit to 30-60s, upload to YouTube, add URL to Play Console",
        "Add subtle background music (royalty-free) and caption overlays",
      ],
      impact: "Videos increase conversion rate and time-on-page \u2014 auto-play silently in store",
      scoreBoost: "+10-15 on Visual Assets score",
    });
  }

  return actions;
}

function generateRatingsBrief(data: AppData, profile: AppProfile, categories: AuditCategory[]): ActionItem[] {
  const actions: ActionItem[] = [];
  const cat = categories.find(c => c.id === "ratings");
  if (!cat) return actions;

  const scoreRule = cat.results.find(r => r.ruleId === "rating-score");
  const countRule = cat.results.find(r => r.ruleId === "ratings-count");
  const lowRating = scoreRule && data.rating > 0 && data.rating < 4.0;
  const lowCount = countRule && countRule.score < 60;

  if (lowRating) {
    let brief = `**Current rating:** ${data.rating.toFixed(1)}\u2605 from ${data.ratingsCount.toLocaleString()} ratings\n`;
    brief += `**Target:** 4.0\u2605+ (conversion threshold) \u2192 4.5\u2605+ (optimal)\n`;
    brief += `**Gap:** +${(4.0 - data.rating).toFixed(1)} stars to cross the 4.0 threshold\n\n`;
    brief += `**Recovery plan:**\n\n`;
    brief += `**1. Analyze negative reviews** (this week):\n`;
    brief += `   Export recent 1-2\u2605 reviews from ${data.platform === "ios" ? "App Store Connect \u203A Ratings and Reviews" : "Google Play Console \u203A Reviews"}. Categorize top 3 complaint themes. Prioritize fixes by frequency \u00D7 severity.\n\n`;
    brief += `**2. Ship fixes + implement review prompts** (next sprint):\n`;
    brief += `   Fix the #1 complaint and mention it in release notes.\n`;
    brief += `   ${data.platform === "ios"
      ? "Implement SKStoreReviewController.requestReview() \u2014 Apple limits 3 prompts per device per year. Trigger after:"
      : "Implement Google Play In-App Review API \u2014 show a pre-prompt first to filter unhappy users to a feedback form. Trigger after:"}\n`;
    brief += `   \u2022 Completing a key action (e.g., ${profile.features[0] || "using a core feature"})\n`;
    brief += `   \u2022 3rd+ session\n`;
    brief += `   \u2022 After a positive moment in ${profile.brand}\n\n`;
    brief += `**3. Respond to negative reviews** (ongoing):\n`;
    brief += `   Reply within 24-48h with empathy + fix timeline. ${data.platform === "ios" ? "Users can update ratings after developer response." : "Users are prompted to re-rate after developer replies."}\n`;
    brief += `   Template: "Thanks for the feedback. We've fixed [issue] in v[X.X]. Would love for you to try again."`;

    actions.push({
      id: "ratings-improve",
      priority: "critical",
      effort: "heavy",
      category: "Ratings",
      title: `Recover rating from ${data.rating.toFixed(1)}\u2605 to 4.0\u2605+`,
      currentState: `${data.rating.toFixed(1)}\u2605 from ${data.ratingsCount.toLocaleString()} ratings`,
      action: brief,
      brief,
      deliverables: [
        "Export and categorize recent negative reviews (top 3 themes)",
        "Ship bug fixes for #1 complaint",
        `Implement ${data.platform === "ios" ? "SKStoreReviewController" : "In-App Review API"} with smart trigger logic`,
        "Set up review monitoring and response workflow (24-48h SLA)",
      ],
      impact: "Ratings below 4.0 reduce conversion by up to 50% and hurt search rankings",
      scoreBoost: "+20-40 on Ratings score",
    });
  }

  if (lowCount && !lowRating) {
    let brief = `**Current volume:** ${data.ratingsCount.toLocaleString()} ratings\n`;
    brief += `**Benchmark:** 1,000+ for credible social proof, 10,000+ for strong algorithm signal\n\n`;
    brief += data.platform === "ios"
      ? `**Implementation:** Use SKStoreReviewController.requestReview():\n  \u2022 3 prompts max per device per 365 days\n  \u2022 Trigger after: ${profile.features[0] || "completing a key action"}, 3rd session, positive outcome\n  \u2022 Never trigger after errors, purchases, or onboarding`
      : `**Implementation:** Use Google Play In-App Review API:\n  \u2022 Show a soft pre-prompt first ("Enjoying ${profile.brand}?")\n  \u2022 If "Yes" \u2192 trigger the system review dialog\n  \u2022 If "No" \u2192 route to in-app feedback form\n  \u2022 Quota managed by Google \u2014 cannot force-show`;

    actions.push({
      id: "ratings-volume",
      priority: "high",
      effort: "medium",
      category: "Ratings",
      title: "Increase ratings volume with strategic prompts",
      currentState: `${data.ratingsCount.toLocaleString()} ratings`,
      action: brief,
      brief,
      deliverables: [
        `Implement ${data.platform === "ios" ? "SKStoreReviewController" : "In-App Review API"} with smart trigger logic`,
        `Define 3 positive in-app moments to trigger prompt (e.g., after ${profile.features[0] || "core action"})`,
        ...(data.platform === "android" ? ["Build soft pre-prompt UI to filter sentiment before system dialog"] : []),
      ],
      impact: "Higher volume improves algorithm trust signals and social proof on store page",
      scoreBoost: "+10-25 on Ratings score",
    });
  }

  return actions;
}

function generateMaintenanceBrief(data: AppData, profile: AppProfile, categories: AuditCategory[]): ActionItem[] {
  const cat = categories.find(c => c.id === "maintenance");
  if (!cat) return [];
  const rule = cat.results[0];
  if (!rule || rule.score >= 70) return [];

  let brief = `**Last update:** ${rule.message}\n`;
  brief += `**Current version:** ${data.version || "unknown"}\n\n`;
  brief += `Both stores use update recency as a quality signal. Each update is also an opportunity to refresh ASO metadata.\n\n`;
  brief += `**Update checklist for ${profile.brand}:**\n`;
  brief += `  \u2022 Ship a new build (even minor bug fixes count)\n`;
  brief += `  \u2022 Write "What's New" highlighting improvements\n`;
  if (data.platform === "ios") {
    brief += `  \u2022 Refresh title, subtitle, and/or keyword field with latest keyword research\n`;
    brief += `  \u2022 Refresh screenshots if needed (new captions = new OCR-indexable keywords)\n`;
  } else {
    brief += `  \u2022 Refresh short description and full description with latest keywords\n`;
    brief += `  \u2022 Update feature graphic if seasonal opportunity exists\n`;
  }
  brief += `  \u2022 Target cadence: update every 4-6 weeks`;

  return [{
    id: "ship-update",
    priority: "high",
    effort: "medium",
    category: "Maintenance",
    title: "Ship an app update to refresh rankings signal",
    currentState: rule.message,
    action: brief,
    brief,
    deliverables: [
      "Prepare a new build with at least minor improvements",
      "Write compelling release notes / What's New",
      "Refresh ASO metadata alongside the update",
      `Submit to ${data.platform === "ios" ? "App Store Connect" : "Google Play Console"}`,
    ],
    impact: "Both stores favor actively maintained apps in rankings",
    scoreBoost: "+30-50 on Maintenance score",
  }];
}

function generateConversionBrief(data: AppData, profile: AppProfile, categories: AuditCategory[]): ActionItem[] {
  if (data.platform !== "ios") return [];
  const cat = categories.find(c => c.id === "conversion");
  if (!cat) return [];

  const promoRule = cat.results.find(r => r.ruleId === "promotional-text");
  if (!promoRule || promoRule.score >= 80) return [];

  const copyOptions: string[] = [];
  if (profile.features[0]) {
    copyOptions.push(
      `\u2B50 ${data.version ? `New in v${data.version}: ` : ""}${profile.features[0]}. ${data.ratingsCount > 100 ? `Join ${data.ratingsCount.toLocaleString()}+ ${profile.audience}.` : `Try ${profile.brand} today.`}`.substring(0, 170),
    );
  }
  if (profile.benefits[0]) {
    copyOptions.push(
      `${capitalize(profile.benefits[0])} with ${profile.brand}. ${data.rating > 4 ? `${data.rating.toFixed(1)}\u2605 rated by ${profile.audience}.` : `Designed for ${profile.audience}.`}`.substring(0, 170),
    );
  }

  let brief = `**Current promotional text:** ${data.promotionalText ? `"${data.promotionalText}"` : "(not set)"}\n`;
  brief += `**Limit:** 170 characters\n`;
  brief += `**Key advantage:** Can be changed anytime WITHOUT submitting an app update\n\n`;
  brief += `Use this field for:\n`;
  brief += `  \u2022 Feature announcements ("New: ${profile.features[0] || "[latest feature]"}")\n`;
  brief += `  \u2022 Social proof ("${data.rating > 0 ? data.rating.toFixed(1) + "\u2605 rated" : "Loved"} by ${data.ratingsCount > 100 ? data.ratingsCount.toLocaleString() + "+" : ""} ${profile.audience}")\n`;
  brief += `  \u2022 Seasonal campaigns or limited-time offers\n\n`;
  brief += `Rotate monthly to keep the store page fresh. This field appears above the description \u2014 it's the first text users read.`;

  return [{
    id: "promo-text",
    priority: "medium",
    effort: "quick",
    category: "Conversion",
    title: "Add promotional text (no app update required)",
    currentState: data.promotionalText ? `"${data.promotionalText}"` : "Not set",
    action: brief,
    brief,
    copyOptions: copyOptions.length > 0 ? copyOptions : undefined,
    deliverables: [
      "Write 2-3 promotional text variants (170 chars max)",
      "Update in App Store Connect \u203A App Information \u203A Promotional Text",
      "Set monthly calendar reminder to rotate messaging",
    ],
    impact: "Appears above the description \u2014 first text users read on your store page",
    scoreBoost: "+15-25 on Conversion score",
  }];
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generateActionPlan(
  appData: AppData,
  categories: AuditCategory[],
  _overallScore: number
): ActionItem[] {
  const profile = buildAppProfile(appData);

  const actions = [
    ...generateTitleBrief(appData, profile, categories),
    ...generateSubtitleBrief(appData, profile, categories),
    ...generateShortDescBrief(appData, profile, categories),
    ...generateDescriptionBrief(appData, profile, categories),
    ...generateVisualsBrief(appData, profile, categories),
    ...generateRatingsBrief(appData, profile, categories),
    ...generateMaintenanceBrief(appData, profile, categories),
    ...generateConversionBrief(appData, profile, categories),
  ];

  return actions.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const effortOrder = { quick: 0, medium: 1, heavy: 2 };
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return effortOrder[a.effort] - effortOrder[b.effort];
  });
}
