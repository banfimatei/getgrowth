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

interface KeywordProfile {
  primary: string[];
  secondary: string[];
  longTail: string[];
  fromDescription: string[];
  fromCategory: string;
  brand: string;
}

// ---------------------------------------------------------------------------
// Keyword extraction — builds a profile from actual app data
// ---------------------------------------------------------------------------

function buildKeywordProfile(data: AppData): KeywordProfile {
  const stopWords = new Set([
    "the", "and", "for", "with", "your", "you", "from", "that", "this",
    "app", "our", "will", "can", "has", "have", "are", "was", "been",
    "not", "all", "but", "its", "also", "more", "most", "very", "just",
    "any", "each", "than", "them", "into", "over", "such", "about",
    "now", "new", "get", "use", "one", "two", "like", "way", "even",
  ]);

  const brandParts = data.developerName.toLowerCase().split(/[\s,.\-]+/).filter(w => w.length > 2);
  const titleParts = data.title.toLowerCase().split(/[\s\-:|\u2013\u2014]+/).filter(w => w.length > 2);
  const brand = titleParts.find(w => brandParts.some(b => w.includes(b))) || titleParts[0] || data.title.split(/\s/)[0];

  const descWords = data.description.toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  const freq = new Map<string, number>();
  for (const w of descWords) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  const descKeywords = [...freq.entries()]
    .filter(([w, count]) => count >= 2 && !brandParts.some(b => w.includes(b)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([w]) => w);

  const titleKeywords = titleParts.filter(w =>
    !brandParts.some(b => w.includes(b)) && !stopWords.has(w) && w.length > 2
  );

  const subtitleKeywords = (data.subtitle || "").toLowerCase()
    .split(/[\s\-:,|]+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  const primary = [...new Set([...titleKeywords, ...subtitleKeywords])];
  const secondary = descKeywords.filter(w => !primary.includes(w)).slice(0, 10);

  const longTail: string[] = [];
  const bigrams = extractBigrams(descWords, stopWords);
  longTail.push(...bigrams.slice(0, 5));

  return {
    primary,
    secondary,
    longTail,
    fromDescription: descKeywords,
    fromCategory: data.category || "",
    brand,
  };
}

function extractBigrams(words: string[], stopWords: Set<string>): string[] {
  const bigrams = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    if (stopWords.has(words[i]) || stopWords.has(words[i + 1])) continue;
    if (words[i].length < 3 || words[i + 1].length < 3) continue;
    const pair = `${words[i]} ${words[i + 1]}`;
    bigrams.set(pair, (bigrams.get(pair) || 0) + 1);
  }
  return [...bigrams.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([pair]) => pair);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function titleCase(s: string): string {
  return s.split(/\s+/).map(capitalize).join(" ");
}

// ---------------------------------------------------------------------------
// Brief generators — each section produces a fully tailored brief
// ---------------------------------------------------------------------------

function generateTitleBrief(data: AppData, kw: KeywordProfile, categories: AuditCategory[]): ActionItem[] {
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

  const availableKeywords = [...kw.secondary, ...kw.fromDescription]
    .filter(w => !data.title.toLowerCase().includes(w))
    .slice(0, 6);

  const copyOptions: string[] = [];
  const brandSegment = data.title.split(/[\-:|]/)[0]?.trim() || data.title;
  const existingKeywords = data.title.replace(brandSegment, "").replace(/[\-:|]+/g, "").trim();

  if (needsKeywords && availableKeywords.length >= 2) {
    copyOptions.push(
      `${brandSegment} - ${titleCase(availableKeywords[0])} & ${titleCase(availableKeywords[1])}`.substring(0, 30),
      `${brandSegment}: ${titleCase(availableKeywords[0])} ${titleCase(availableKeywords[1])}`.substring(0, 30),
    );
    if (availableKeywords[2]) {
      copyOptions.push(
        `${titleCase(availableKeywords[0])} ${titleCase(availableKeywords[1])} - ${brandSegment}`.substring(0, 30),
      );
    }
  } else if (needsLength && remaining > 3) {
    const filler = availableKeywords[0] ? ` & ${titleCase(availableKeywords[0])}` : "";
    if (existingKeywords) {
      copyOptions.push(`${brandSegment} - ${existingKeywords}${filler}`.substring(0, 30));
    }
    if (availableKeywords[0]) {
      copyOptions.push(`${data.title} ${titleCase(availableKeywords[0])}`.substring(0, 30));
    }
  } else if (needsFrontload && availableKeywords.length >= 1) {
    copyOptions.push(
      `${titleCase(availableKeywords[0])} - ${brandSegment}`.substring(0, 30),
      `${titleCase(availableKeywords[0])} ${titleCase(availableKeywords[1] || "")} | ${brandSegment}`.substring(0, 30),
    );
  }

  const validOptions = copyOptions.filter(o => o.length > 0 && o.length <= 30);

  const deliverables: string[] = [
    `Update title in ${data.platform === "ios" ? "App Store Connect" : "Google Play Console"}`,
    "A/B test the new title for 7 days before committing",
  ];
  if (data.platform === "ios") {
    deliverables.push("Coordinate with next app update submission (title changes require review)");
  }

  let brief = `**Current title:** "${data.title}" (${data.title.length}/30 chars)\n`;
  brief += `**Brand segment:** "${brandSegment}"\n`;
  brief += `**Keywords detected in title:** ${kw.primary.length > 0 ? kw.primary.map(w => `"${w}"`).join(", ") : "none"}\n`;
  brief += `**High-value keywords missing from title:** ${availableKeywords.slice(0, 4).map(w => `"${w}"`).join(", ")}\n\n`;
  brief += `The title is the single most weighted metadata field on both stores. `;
  if (needsKeywords) {
    brief += `Your title is currently brand-heavy with limited keyword coverage. Restructure to include descriptive terms that users actually search for.`;
  } else if (needsLength) {
    brief += `You have ${remaining} unused characters — that's wasted keyword space in your most valuable field.`;
  } else if (needsFrontload) {
    brief += `Your brand sits in the first 15 characters (the most visible/weighted zone). Unless "${brandSegment}" is a household name, swap to keyword-first.`;
  }

  const title = needsKeywords
    ? "Restructure title with high-value keywords"
    : needsFrontload
      ? "Front-load keywords in the first 15 characters"
      : `Fill ${remaining} unused title characters`;

  actions.push({
    id: "title-optimize",
    priority: needsKeywords ? "critical" : "high",
    effort: "quick",
    category: "Title",
    title,
    currentState: `"${data.title}" (${data.title.length}/30 chars)`,
    action: brief,
    brief,
    copyOptions: validOptions.length > 0 ? validOptions : undefined,
    deliverables,
    impact: "Title keywords directly determine which searches you rank for",
    scoreBoost: needsKeywords ? "+30-50 on Title score" : "+10-20 on Title score",
  });

  return actions;
}

function generateSubtitleBrief(data: AppData, kw: KeywordProfile, categories: AuditCategory[]): ActionItem[] {
  if (data.platform !== "ios") return [];
  const actions: ActionItem[] = [];
  const cat = categories.find(c => c.id === "subtitle");
  if (!cat) return actions;

  const lengthRule = cat.results.find(r => r.ruleId === "subtitle-length");
  const dupeRule = cat.results.find(r => r.ruleId === "subtitle-no-duplicate");
  const isEmpty = !data.subtitle || data.subtitle.length === 0;
  const hasDupes = dupeRule && dupeRule.score < 70;

  if (lengthRule && (isEmpty || lengthRule.score < 90 || hasDupes)) {
    const titleWords = new Set(data.title.toLowerCase().split(/[\s\-:,|\u2013\u2014]+/).filter(w => w.length > 2));
    const uniqueKeywords = [...kw.secondary, ...kw.fromDescription]
      .filter(w => !titleWords.has(w) && w.length > 2)
      .slice(0, 8);

    const copyOptions: string[] = [];
    if (uniqueKeywords.length >= 3) {
      copyOptions.push(
        `${titleCase(uniqueKeywords[0])} & ${titleCase(uniqueKeywords[1])} ${titleCase(uniqueKeywords[2])}`.substring(0, 30),
        `${titleCase(uniqueKeywords[0])}, ${titleCase(uniqueKeywords[1])} & More`.substring(0, 30),
        `${titleCase(uniqueKeywords[2])} ${titleCase(uniqueKeywords[0])} ${titleCase(uniqueKeywords[3] || "")}`.substring(0, 30).trim(),
      );
    } else if (uniqueKeywords.length >= 1) {
      copyOptions.push(
        `${titleCase(uniqueKeywords[0])} ${kw.fromCategory}`.substring(0, 30),
      );
    }

    const validOptions = copyOptions.filter(o => o.length > 0 && o.length <= 30);

    let brief = "";
    if (isEmpty) {
      brief += `**Current subtitle:** (empty — field not set)\n`;
      brief += `**Title keywords (to avoid duplicating):** ${[...titleWords].filter(w => w.length > 2).map(w => `"${w}"`).join(", ")}\n`;
      brief += `**Available unique keywords:** ${uniqueKeywords.slice(0, 5).map(w => `"${w}"`).join(", ")}\n\n`;
      brief += `The subtitle is iOS's second-most weighted metadata field. Apple combines title + subtitle + keyword field into 160 indexable characters — leaving the subtitle empty wastes ~30 of those. Use keywords that DON'T appear in your title.`;
    } else {
      const dupeWords = data.subtitle!.toLowerCase().split(/[\s\-:,|]+/)
        .filter(w => titleWords.has(w) && w.length > 2);
      brief += `**Current subtitle:** "${data.subtitle}" (${data.subtitle!.length}/30 chars)\n`;
      if (dupeWords.length > 0) {
        brief += `**Duplicated from title:** ${dupeWords.map(w => `"${w}"`).join(", ")} (wasting indexable space)\n`;
      }
      brief += `**Available unique keywords:** ${uniqueKeywords.slice(0, 5).map(w => `"${w}"`).join(", ")}\n\n`;
      if (hasDupes) {
        brief += `Replace duplicated words with fresh keywords. Apple doesn't give extra weight for repeating the same word across fields.`;
      } else {
        brief += `You have ${30 - data.subtitle!.length} unused characters. Fill them with your next-priority keywords.`;
      }
    }

    actions.push({
      id: "subtitle-optimize",
      priority: isEmpty ? "critical" : "high",
      effort: "quick",
      category: "Subtitle",
      title: isEmpty ? "Add a subtitle — your second most valuable field is empty" : "Optimize subtitle keywords",
      currentState: isEmpty ? "No subtitle set" : `"${data.subtitle}" (${data.subtitle!.length}/30 chars)`,
      action: brief,
      brief,
      copyOptions: validOptions.length > 0 ? validOptions : undefined,
      deliverables: [
        "Draft subtitle (30 chars max, no title-word overlap)",
        "Update in App Store Connect > App Information > Subtitle",
        "Requires app update submission for review",
      ],
      impact: "Unlocks keyword rankings for terms not reachable via title alone",
      scoreBoost: isEmpty ? "+60-90 on Subtitle score" : "+15-30 on Subtitle score",
    });
  }

  return actions;
}

function generateShortDescBrief(data: AppData, kw: KeywordProfile, categories: AuditCategory[]): ActionItem[] {
  if (data.platform !== "android") return [];
  const cat = categories.find(c => c.id === "short-description");
  if (!cat) return [];
  const rule = cat.results[0];
  if (!rule || rule.score >= 80) return [];

  const topKw = [...kw.primary, ...kw.secondary].slice(0, 5);
  const copyOptions: string[] = [];
  if (topKw.length >= 2) {
    copyOptions.push(
      `${titleCase(topKw[0])} & ${titleCase(topKw[1])} — ${titleCase(kw.fromCategory)} for everyone`.substring(0, 80),
      `The best ${kw.fromCategory.toLowerCase()} experience: ${topKw.slice(0, 3).map(titleCase).join(", ")} & more`.substring(0, 80),
    );
  }

  let brief = `**Current short description:** ${data.shortDescription ? `"${data.shortDescription}" (${data.shortDescription.length}/80 chars)` : "(empty)"}\n`;
  brief += `**Primary keywords to include:** ${topKw.map(w => `"${w}"`).join(", ")}\n\n`;
  brief += `The short description appears in Google Play search results and is the second-most indexed text field. Write a compelling 80-character pitch that front-loads your primary keyword and communicates your core value proposition. It must read naturally — this is the first text users see.`;

  return [{
    id: "short-desc-optimize",
    priority: data.shortDescription ? "high" : "critical",
    effort: "quick",
    category: "Short Description",
    title: data.shortDescription ? "Rewrite short description for better keyword coverage" : "Add a short description — your second most important field",
    currentState: data.shortDescription ? `"${data.shortDescription}" (${data.shortDescription.length}/80 chars)` : "Not set",
    action: brief,
    brief,
    copyOptions: copyOptions.length > 0 ? copyOptions : undefined,
    deliverables: [
      "Write 2-3 short description variants (80 chars max each)",
      "Update in Google Play Console > Store Listing > Short description",
      "Run a Store Listing Experiment to test variants",
    ],
    impact: "Directly affects Google Play search ranking and click-through rate",
    scoreBoost: "+30-60 on Short Description score",
  }];
}

function generateDescriptionBrief(data: AppData, kw: KeywordProfile, categories: AuditCategory[]): ActionItem[] {
  const actions: ActionItem[] = [];
  const cat = categories.find(c => c.id === "description");
  if (!cat) return actions;

  const structRule = cat.results.find(r => r.ruleId === "desc-structure");
  const densityRule = cat.results.find(r => r.ruleId === "desc-keyword-density");
  const lengthRule = cat.results.find(r => r.ruleId === "desc-length");

  const needsWork = (structRule && structRule.score < 70) ||
    (densityRule && densityRule.score < 70) ||
    (lengthRule && lengthRule.score < 70);

  if (!needsWork) return actions;

  const desc = data.description;
  const firstSentences = desc.split(/[.!?]\s/).slice(0, 3).join(". ").substring(0, 300);
  const wordCount = desc.split(/\s+/).length;
  const hasBullets = /[\u2022\-*]/.test(desc);
  const hasParagraphs = (desc.match(/\n\n/g) || []).length >= 2;

  const missingKeywords = kw.secondary
    .filter(w => !desc.toLowerCase().includes(w))
    .slice(0, 5);

  const underusedKeywords = kw.primary
    .map(w => ({ word: w, count: (desc.toLowerCase().split(w).length - 1) }))
    .filter(k => k.count < 3);

  let brief = `**Current description:** ${desc.length} chars, ${wordCount} words\n`;
  brief += `**Opening lines:** "${firstSentences}${firstSentences.length >= 300 ? "..." : ""}"\n`;
  brief += `**Structure:** ${hasParagraphs ? "Has paragraphs" : "No paragraph breaks"}, ${hasBullets ? "Has bullet points" : "No bullet points"}\n\n`;

  if (data.platform === "android") {
    brief += `**Keyword gaps (not in description):** ${missingKeywords.length > 0 ? missingKeywords.map(w => `"${w}"`).join(", ") : "None detected"}\n`;
    if (underusedKeywords.length > 0) {
      brief += `**Underused keywords (< 3 mentions):** ${underusedKeywords.map(k => `"${k.word}" (${k.count}x)`).join(", ")}\n`;
    }
    brief += "\n";
  }

  brief += "**Recommended structure:**\n";
  brief += `1. **Opening hook** (first 3 lines visible without "Read more"):\n`;
  brief += `   Lead with your core value proposition. Front-load primary keywords.\n`;
  brief += `   Draft: "${data.title.split(/[\-:|]/)[0].trim()} is the [primary keyword] ${kw.fromCategory.toLowerCase()} that [core benefit]. ${kw.primary.length > 0 ? titleCase(kw.primary[0]) : "[Feature]"} ${kw.secondary[0] ? `and ${kw.secondary[0]}` : ""} [specific outcome]."\n\n`;
  brief += `2. **Feature list** (bullet points):\n`;

  const featureKw = [...kw.fromDescription].slice(0, 6);
  for (let i = 0; i < Math.min(featureKw.length, 5); i++) {
    brief += `   \u2022 ${titleCase(featureKw[i])} — [describe the specific benefit]\n`;
  }

  brief += `\n3. **Social proof section:**\n`;
  if (data.ratingsCount > 100) {
    brief += `   "Loved by ${data.ratingsCount.toLocaleString()}+ users" / "${data.rating.toFixed(1)}\u2605 on the ${data.platform === "ios" ? "App Store" : "Play Store"}"\n`;
  } else {
    brief += `   Add press mentions, awards, or user milestones\n`;
  }
  brief += `\n4. **Call to action:**\n   "Download ${data.title.split(/[\-:|]/)[0].trim()} today and [desired outcome]."`;

  if (data.platform === "android") {
    brief += `\n\n**Keyword density targets:**\n`;
    for (const w of [...kw.primary, ...kw.secondary].slice(0, 4)) {
      const count = (desc.toLowerCase().split(w).length - 1);
      brief += `   "${w}": currently ${count}x → target 3-5x\n`;
    }
  }

  const deliverables = [
    "Rewrite full description following the 4-section structure above",
    `Target length: ${data.platform === "android" ? "2,500-4,000 chars" : "1,000-4,000 chars"}`,
  ];
  if (data.platform === "android") {
    deliverables.push("Ensure primary keywords appear 3-5x each, front-loaded in first paragraph");
    deliverables.push("Update in Google Play Console > Store Listing > Full description");
  } else {
    deliverables.push("Update in App Store Connect > Version Information > Description");
    deliverables.push("Note: iOS description is NOT indexed for search, but impacts conversion and web SEO");
  }

  actions.push({
    id: "desc-rewrite",
    priority: data.platform === "android" ? "high" : "medium",
    effort: "medium",
    category: "Description",
    title: "Rewrite description with optimized structure and keywords",
    currentState: `${desc.length} chars, ${wordCount} words — ${!hasBullets ? "no bullet points, " : ""}${!hasParagraphs ? "no paragraph breaks" : "has paragraphs"}`,
    action: brief,
    brief,
    deliverables,
    impact: data.platform === "android"
      ? "Google indexes the full description — structure and density directly affect rankings"
      : "Better conversion rate from store page visitors + web SEO impact",
    scoreBoost: "+15-30 on Description score",
  });

  return actions;
}

function generateVisualsBrief(data: AppData, kw: KeywordProfile, categories: AuditCategory[]): ActionItem[] {
  const actions: ActionItem[] = [];
  const cat = categories.find(c => c.id === "visuals");
  if (!cat) return actions;

  const maxScreenshots = data.platform === "ios" ? 10 : 8;
  const countRule = cat.results.find(r => r.ruleId === "screenshot-count");
  const videoRule = cat.results.find(r => r.ruleId === "video-presence");

  // Screenshot optimization
  if (countRule && data.screenshotCount < maxScreenshots) {
    const allKw = [...kw.primary, ...kw.secondary].slice(0, 10);
    const screenshotTopics = [
      { slot: 1, role: "Hero / Core Value", caption: `${titleCase(allKw[0] || kw.fromCategory)} — ${titleCase(allKw[1] || "your core benefit")}` },
      { slot: 2, role: "Key Differentiator", caption: `${titleCase(allKw[2] || "Unique Feature")} ${titleCase(allKw[3] || "")}`.trim() },
      { slot: 3, role: "Most Popular Feature", caption: `${titleCase(allKw[1] || "Popular")} ${titleCase(allKw[4] || "Experience")}` },
      { slot: 4, role: "Social Proof", caption: `"${data.rating > 0 ? data.rating.toFixed(1) + "\u2605" : "Loved by"} ${data.ratingsCount > 100 ? (data.ratingsCount / 1000).toFixed(0) + "K+" : ""} Users"` },
      { slot: 5, role: "Feature Deep-Dive", caption: `${titleCase(allKw[5] || allKw[0] || "Feature")} & ${titleCase(allKw[6] || "More")}` },
    ];

    for (let i = 5; i < maxScreenshots; i++) {
      screenshotTopics.push({
        slot: i + 1,
        role: "Secondary Feature",
        caption: `${titleCase(allKw[i] || allKw[i % allKw.length] || "Feature")} ${titleCase(allKw[(i + 1) % allKw.length] || "")}`.trim(),
      });
    }

    let brief = `**Current screenshots:** ${data.screenshotCount}/${maxScreenshots} slots used\n\n`;
    brief += `**Screenshot gallery plan:**\n`;
    for (const topic of screenshotTopics.slice(0, maxScreenshots)) {
      const exists = topic.slot <= data.screenshotCount;
      brief += `  ${exists ? "\u2705" : "\u274C"} **Slot ${topic.slot}** — ${topic.role}\n`;
      brief += `     Caption: "${topic.caption}"\n`;
    }

    if (data.platform === "ios") {
      brief += `\n**Apple OCR optimization (critical for 2025-2026 rankings):**\n`;
      brief += `Apple now extracts text from screenshot captions via OCR and uses it as a keyword ranking signal. Your screenshot captions are a secondary keyword field.\n\n`;
      brief += `**Caption specs for OCR:**\n`;
      brief += `  \u2022 Font: Bold sans-serif (SF Pro, Helvetica, Inter), 40pt+ minimum\n`;
      brief += `  \u2022 Contrast: Dark text on light bg or white text on dark bg (no mid-tones)\n`;
      brief += `  \u2022 Position: Top 1/3 of screenshot for maximum OCR reliability\n`;
      brief += `  \u2022 Keywords to map across captions: ${allKw.slice(0, 8).map(w => `"${w}"`).join(", ")}\n`;
      brief += `  \u2022 Avoid: Generic phrases ("Easy to Use", "Get Started"), emoji-only captions\n`;
    }

    brief += `\n**Design specs:**\n`;
    if (data.platform === "ios") {
      brief += `  \u2022 iPhone 6.7": 1290 x 2796 px\n`;
      brief += `  \u2022 iPhone 6.5": 1284 x 2778 px\n`;
      brief += `  \u2022 iPad 12.9": 2048 x 2732 px\n`;
    } else {
      brief += `  \u2022 Phone: 1080 x 1920 px (min 320px, max 3840px)\n`;
      brief += `  \u2022 Tablet 7": 1080 x 1920 px\n`;
      brief += `  \u2022 Tablet 10": 1200 x 1920 px\n`;
    }

    const deliverables: string[] = [];
    if (data.screenshotCount < maxScreenshots) {
      deliverables.push(`Design ${maxScreenshots - data.screenshotCount} new screenshots`);
    }
    deliverables.push(
      "Write keyword-rich captions for all screenshot slots (see plan above)",
      `Export at required resolutions for ${data.platform === "ios" ? "all required device sizes" : "phone + tablet"}`,
      `Upload to ${data.platform === "ios" ? "App Store Connect > Media Manager" : "Google Play Console > Store Listing"}`,
    );
    if (data.platform === "ios") {
      deliverables.push("Verify OCR readability: zoom to 25% — if you can still read the caption text, OCR can too");
    }

    actions.push({
      id: "screenshots-optimize",
      priority: data.screenshotCount < 3 ? "critical" : "high",
      effort: data.screenshotCount < 4 ? "heavy" : "medium",
      category: "Visual Assets",
      title: `Design ${maxScreenshots - data.screenshotCount > 0 ? `${maxScreenshots - data.screenshotCount} new screenshots + ` : ""}keyword-optimized captions`,
      currentState: `${data.screenshotCount}/${maxScreenshots} screenshots uploaded`,
      action: brief,
      brief,
      deliverables,
      impact: "Screenshots are the #1 conversion driver — captions are now also a keyword ranking signal on iOS",
      scoreBoost: "+15-30 on Visual Assets score",
    });
  }

  // Video
  if (videoRule && videoRule.score < 60) {
    const features = kw.fromDescription.slice(0, 4).map(titleCase);
    let brief = `**Current state:** No preview video detected\n\n`;

    if (data.platform === "ios") {
      brief += `**Video storyboard for ${data.title}:**\n`;
      brief += `  0-3s: **Hook** — Show the core "${kw.fromCategory}" experience in action\n`;
      brief += `  3-10s: **${features[0] || "Feature 1"}** — Demonstrate the primary use case\n`;
      brief += `  10-18s: **${features[1] || "Feature 2"}** — Show the key differentiator\n`;
      brief += `  18-25s: **${features[2] || "Feature 3"}** — Social proof or advanced feature\n`;
      brief += `  25-30s: **CTA** — App icon + "${data.title.split(/[\-:|]/)[0].trim()}" branding\n\n`;
      brief += `**Specs:** 15-30s, H.264 .mov or .mp4, no letterboxing\n`;
      brief += `**Sizes:** 886x1920 (5.5"), 1080x1920 (6.1"), 1284x2778 (6.5"), 1290x2796 (6.7")\n`;
      brief += `**Rules:** Real app footage only (no renders), no people outside the device, loops silently`;
    } else {
      brief += `**Video plan for ${data.title}:**\n`;
      brief += `  0-3s: **Hook** — The most compelling "${kw.fromCategory}" moment\n`;
      brief += `  3-15s: **Core loop** — ${features[0] || "Main feature"} in action\n`;
      brief += `  15-25s: **${features[1] || "Feature 2"}** + ${features[2] || "Feature 3"}\n`;
      brief += `  25-30s: **CTA** — Download prompt\n\n`;
      brief += `**Specs:** 30s-2min YouTube video, landscape preferred\n`;
      brief += `**Upload:** Add YouTube URL in Google Play Console > Store Listing > Promo video`;
    }

    actions.push({
      id: "video-create",
      priority: "medium",
      effort: "heavy",
      category: "Visual Assets",
      title: `Create ${data.platform === "ios" ? "App Preview" : "promo"} video for ${data.title.split(/[\-:|]/)[0].trim()}`,
      currentState: "No preview video detected",
      action: brief,
      brief,
      deliverables: [
        "Write video script/storyboard (see plan above)",
        "Record app screen captures for each scene",
        data.platform === "ios"
          ? "Edit to 15-30s, export H.264 .mov for all required sizes"
          : "Edit to 30-60s, upload to YouTube, add URL to Play Console",
        "Add background music (royalty-free) and caption overlays",
      ],
      impact: "Videos increase conversion rate and time-on-page",
      scoreBoost: "+10-15 on Visual Assets score",
    });
  }

  return actions;
}

function generateRatingsBrief(data: AppData, kw: KeywordProfile, categories: AuditCategory[]): ActionItem[] {
  const actions: ActionItem[] = [];
  const cat = categories.find(c => c.id === "ratings");
  if (!cat) return actions;

  const scoreRule = cat.results.find(r => r.ruleId === "rating-score");
  const countRule = cat.results.find(r => r.ruleId === "ratings-count");
  const lowRating = scoreRule && data.rating > 0 && data.rating < 4.0;
  const lowCount = countRule && countRule.score < 60;

  if (!lowRating && !lowCount) return actions;

  if (lowRating) {
    let brief = `**Current rating:** ${data.rating.toFixed(1)}\u2605 from ${data.ratingsCount.toLocaleString()} ratings\n`;
    brief += `**Target:** 4.0\u2605+ (conversion threshold) → 4.5\u2605+ (optimal)\n`;
    brief += `**Gap:** +${(4.0 - data.rating).toFixed(1)} stars needed to cross the 4.0 threshold\n\n`;
    brief += `**Recovery plan for ${data.title.split(/[\-:|]/)[0].trim()}:**\n\n`;
    brief += `1. **Analyze negative reviews** (this week):\n`;
    brief += `   \u2022 Export recent 1-2\u2605 reviews from ${data.platform === "ios" ? "App Store Connect > Ratings and Reviews" : "Google Play Console > Reviews"}\n`;
    brief += `   \u2022 Categorize top 3 complaint themes\n`;
    brief += `   \u2022 Prioritize fixes by frequency \u00D7 severity\n\n`;
    brief += `2. **Ship fixes + implement review prompts** (next sprint):\n`;
    brief += `   \u2022 Fix the #1 complaint and mention it in release notes\n`;
    brief += `   \u2022 ${data.platform === "ios"
      ? "Implement SKStoreReviewController.requestReview() — Apple limits 3 prompts per device per year, so time them after:"
      : "Implement Google Play In-App Review API — show a pre-prompt first to filter unhappy users to a feedback form:"}\n`;
    brief += `     - Completing a key action in the app\n`;
    brief += `     - 3rd+ session\n`;
    brief += `     - After a positive moment (achievement, content discovery)\n\n`;
    brief += `3. **Respond to negative reviews** (ongoing):\n`;
    brief += `   \u2022 Reply within 24-48h with empathy + fix timeline\n`;
    brief += `   \u2022 ${data.platform === "ios" ? "Users can update ratings after developer response" : "Users are prompted to re-rate after developer replies"}\n`;
    brief += `   \u2022 Template: "Thanks for the feedback. We've fixed [issue] in v[X.X]. Would love for you to try again."`;

    actions.push({
      id: "ratings-improve",
      priority: "critical",
      effort: "heavy",
      category: "Ratings",
      title: `Recover rating from ${data.rating.toFixed(1)}\u2605 to 4.0\u2605+`,
      currentState: `${data.rating.toFixed(1)}\u2605 with ${data.ratingsCount.toLocaleString()} ratings`,
      action: brief,
      brief,
      deliverables: [
        "Export and categorize recent negative reviews (top 3 themes)",
        "Ship bug fixes for #1 complaint",
        `Implement ${data.platform === "ios" ? "SKStoreReviewController" : "In-App Review API"} triggered after positive moments`,
        "Set up review monitoring and response workflow (24-48h SLA)",
      ],
      impact: "Ratings below 4.0 reduce conversion by 50%+ and hurt search rankings",
      scoreBoost: "+20-40 on Ratings score",
    });
  }

  if (lowCount && !lowRating) {
    let brief = `**Current volume:** ${data.ratingsCount.toLocaleString()} ratings\n`;
    brief += `**Benchmark:** 1,000+ for credible social proof, 10,000+ for strong algorithm signal\n\n`;
    brief += `**Implementation:**\n`;
    brief += data.platform === "ios"
      ? `Use SKStoreReviewController.requestReview():\n  \u2022 3 prompts max per device per 365 days\n  \u2022 Trigger after: task completion, 3rd session, positive outcome\n  \u2022 Never trigger after errors, purchases, or onboarding`
      : `Use Google Play In-App Review API:\n  \u2022 Show a soft pre-prompt first ("Enjoying ${data.title.split(/[\-:|]/)[0].trim()}?")\n  \u2022 If "Yes" → trigger the system review dialog\n  \u2022 If "No" → route to in-app feedback form\n  \u2022 Quota managed by Google — cannot force-show`;

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
        "Define 3 positive moments to trigger review prompts",
        data.platform === "android" ? "Build soft pre-prompt UI to filter sentiment" : "Test timing with TestFlight before submission",
      ],
      impact: "Higher volume improves algorithm trust signals and social proof",
      scoreBoost: "+10-25 on Ratings score",
    });
  }

  return actions;
}

function generateMaintenanceBrief(data: AppData, categories: AuditCategory[]): ActionItem[] {
  const cat = categories.find(c => c.id === "maintenance");
  if (!cat) return [];
  const rule = cat.results[0];
  if (!rule || rule.score >= 70) return [];

  let brief = `**Last update:** ${rule.message}\n`;
  brief += `**Current version:** ${data.version || "unknown"}\n\n`;
  brief += `Both stores use update recency as a quality signal. Each update is also an opportunity to refresh ASO metadata.\n\n`;
  brief += `**Update checklist for ${data.title.split(/[\-:|]/)[0].trim()}:**\n`;
  brief += `  \u2022 Ship a new build (even minor bug fixes count)\n`;
  brief += `  \u2022 Refresh "What's New" text with feature highlights\n`;
  if (data.platform === "ios") {
    brief += `  \u2022 Update title, subtitle, and/or keyword field with latest keyword research\n`;
    brief += `  \u2022 Refresh screenshots if needed (new screenshots = new OCR-indexable keywords)\n`;
  } else {
    brief += `  \u2022 Refresh short description and full description with latest keywords\n`;
    brief += `  \u2022 Update feature graphic if seasonal opportunity exists\n`;
  }
  brief += `  \u2022 Target: update every 4-6 weeks for optimal ranking signal`;

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

function generateConversionBrief(data: AppData, kw: KeywordProfile, categories: AuditCategory[]): ActionItem[] {
  if (data.platform !== "ios") return [];
  const cat = categories.find(c => c.id === "conversion");
  if (!cat) return [];

  const promoRule = cat.results.find(r => r.ruleId === "promotional-text");
  if (!promoRule || promoRule.score >= 80) return [];

  const copyOptions = [
    `\u2B50 ${data.version ? `New in v${data.version}: ` : ""}${kw.primary[0] ? titleCase(kw.primary[0]) : "[Latest Feature]"}. Join ${data.ratingsCount > 1000 ? Math.floor(data.ratingsCount / 1000) + "K+" : data.ratingsCount.toLocaleString()} ${kw.fromCategory.toLowerCase()} lovers worldwide.`.substring(0, 170),
    `Discover the ${kw.fromCategory.toLowerCase()} ${data.platform === "ios" ? "app" : "experience"} that ${data.ratingsCount > 100 ? `${data.ratingsCount.toLocaleString()} users` : "thousands"} love. ${kw.primary.slice(0, 2).map(titleCase).join(", ")} & more.`.substring(0, 170),
  ];

  let brief = `**Current promotional text:** ${data.promotionalText ? `"${data.promotionalText}"` : "(not set)"}\n`;
  brief += `**Limit:** 170 characters\n`;
  brief += `**Key advantage:** Can be changed anytime WITHOUT submitting an app update\n\n`;
  brief += `This is your most flexible metadata field. Use it for:\n`;
  brief += `  \u2022 Seasonal campaigns ("Summer sale: 50% off Premium")\n`;
  brief += `  \u2022 Feature announcements ("New: ${kw.primary[0] ? titleCase(kw.primary[0]) : "[Feature]"} support")\n`;
  brief += `  \u2022 Social proof ("${data.rating > 0 ? data.rating.toFixed(1) + "\u2605" : ""} rated by ${data.ratingsCount.toLocaleString()}+ users")\n`;
  brief += `  \u2022 Time-limited hooks ("Limited time: Free ${kw.fromCategory.toLowerCase()} trial")\n\n`;
  brief += `Rotate the promotional text monthly to keep the store page fresh.`;

  return [{
    id: "promo-text",
    priority: "medium",
    effort: "quick",
    category: "Conversion",
    title: "Add promotional text (no app update required)",
    currentState: data.promotionalText ? `"${data.promotionalText}"` : "Not set",
    action: brief,
    brief,
    copyOptions,
    deliverables: [
      "Write 2-3 promotional text variants (170 chars max)",
      "Update in App Store Connect > App Information > Promotional Text",
      "Set monthly calendar reminder to rotate messaging",
    ],
    impact: "Appears above the description — first text users read on your store page",
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
  const kw = buildKeywordProfile(appData);

  const actions = [
    ...generateTitleBrief(appData, kw, categories),
    ...generateSubtitleBrief(appData, kw, categories),
    ...generateShortDescBrief(appData, kw, categories),
    ...generateDescriptionBrief(appData, kw, categories),
    ...generateVisualsBrief(appData, kw, categories),
    ...generateRatingsBrief(appData, kw, categories),
    ...generateMaintenanceBrief(appData, categories),
    ...generateConversionBrief(appData, kw, categories),
  ];

  return actions.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const effortOrder = { quick: 0, medium: 1, heavy: 2 };
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return effortOrder[a.effort] - effortOrder[b.effort];
  });
}
