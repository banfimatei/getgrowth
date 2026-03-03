// ASO Scoring Rules Engine
// Sources: "Advanced App Store Optimization" (Phiture, 2022)
//          app-store-optimization skill (keyword research, metadata, scoring)
//          app-store-screenshots skill (OCR indexing, First 3 Rule, gallery strategy)
//          Current 2025-2026 store guidelines

export interface AuditRule {
  id: string;
  category: string;
  name: string;
  description: string;
  weight: number;
  platform: "both" | "ios" | "android";
  evaluate: (data: AppData) => RuleResult;
}

export interface RuleResult {
  score: number;
  status: "pass" | "warning" | "fail" | "info";
  message: string;
  recommendation?: string;
  details?: string;
}

export interface AppData {
  platform: "ios" | "android";
  title: string;
  subtitle?: string;
  shortDescription?: string;
  description: string;
  keywordField?: string;
  developerName: string;
  category: string;
  rating: number;
  ratingsCount: number;
  version: string;
  lastUpdated: string;
  screenshotCount: number;
  hasVideo: boolean;
  price: string;
  size?: string;
  contentRating?: string;
  installs?: string;
  url: string;
  iconUrl?: string;
  screenshots?: string[];
  whatsNew?: string;
  promotionalText?: string;
}

export interface AuditCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  score: number;
  maxScore: number;
  results: (RuleResult & { ruleName: string; ruleId: string; weight: number })[];
}

export const STORE_LIMITS = {
  ios: {
    title: 30,
    subtitle: 30,
    keywordField: 100,
    promotionalText: 170,
    totalIndexableChars: 160,
    maxScreenshots: 10,
    descriptionLength: 4000,
    whatsNew: 4000,
  },
  android: {
    title: 30,
    shortDescription: 80,
    fullDescription: 4000,
    maxScreenshots: 8,
    featureGraphic: { width: 1024, height: 500 },
    developerName: 64,
  },
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function hasKeywordStuffing(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/);
  const wordCounts = new Map<string, number>();
  words.forEach(w => wordCounts.set(w, (wordCounts.get(w) || 0) + 1));
  const maxRepeat = Math.max(...wordCounts.values());
  return maxRepeat > 3 && maxRepeat / words.length > 0.15;
}

function daysSinceDate(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function containsProhibitedTerms(text: string): string[] {
  const prohibited = [
    "#1", "best", "top", "number one", "leading", "most popular",
    "download now", "install now", "play now", "try now", "free"
  ];
  const lower = text.toLowerCase();
  return prohibited.filter(term => lower.includes(term));
}

// ============================================================
// TITLE RULES
// Per ASO skill: "Front-load keywords in title (first 15 chars most important)"
// Per book Ch.2: "the most heavily weighted metadata element"
// ============================================================

const titleLengthRule: AuditRule = {
  id: "title-length",
  category: "title",
  name: "Title Length Optimization",
  description: "Evaluates whether the title uses the available 30-character space effectively",
  weight: 9,
  platform: "both",
  evaluate: (data) => {
    const limit = 30;
    const len = data.title.length;
    const usage = (len / limit) * 100;

    if (len > limit) {
      return { score: 30, status: "fail", message: `Title exceeds ${limit} char limit (${len} chars)`, recommendation: `Shorten title to ${limit} characters or less.` };
    }
    if (usage >= 85) {
      return { score: 95, status: "pass", message: `Excellent title length (${len}/${limit} chars, ${Math.round(usage)}% used)`, details: "Maximizing the title character space is critical as it's the highest-weighted metadata element." };
    }
    if (usage >= 60) {
      return { score: 70, status: "warning", message: `Good but room for optimization (${len}/${limit} chars, ${Math.round(usage)}% used)`, recommendation: `You have ${limit - len} unused characters. Consider adding high-priority keywords to improve visibility.` };
    }
    return { score: 40, status: "fail", message: `Title underutilizes available space (${len}/${limit} chars, ${Math.round(usage)}% used)`, recommendation: `You're wasting ${limit - len} characters of your most valuable metadata. Per ASO best practices: use every available character.` };
  },
};

const titleFrontloadRule: AuditRule = {
  id: "title-frontload",
  category: "title",
  name: "Title Keyword Front-Loading",
  description: "First 15 characters are the most important for visibility and truncation",
  weight: 8,
  platform: "both",
  evaluate: (data) => {
    const first15 = data.title.substring(0, 15).toLowerCase();
    const brandWords = data.developerName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const first15Words = first15.split(/[\s\-:,|]+/).filter(w => w.length > 2);
    const hasKeywordInFirst15 = first15Words.some(w => !brandWords.some(bw => w.includes(bw)));

    if (hasKeywordInFirst15 && first15Words.length >= 2) {
      return { score: 95, status: "pass", message: "Strong keyword presence in first 15 characters", details: "The first 15 characters carry the most weight and are always visible even when truncated in search results." };
    }
    if (hasKeywordInFirst15) {
      return { score: 75, status: "pass", message: "Keyword detected in first 15 characters", recommendation: "Good start. The first 15 chars are most important for visibility\u2014consider if a keyword-first format could work better." };
    }
    return { score: 40, status: "warning", message: "No descriptive keywords in the first 15 characters", recommendation: "The first 15 characters are the most visible and heavily weighted. If your brand isn't extremely well-known, consider a keyword-first title format like 'Keyword \u2013 Brand' instead of 'Brand: Keyword'." };
  },
};

const titleKeywordPresenceRule: AuditRule = {
  id: "title-keywords",
  category: "title",
  name: "Title Keyword Presence",
  description: "Checks if the title contains descriptive keywords beyond just the brand name",
  weight: 10,
  platform: "both",
  evaluate: (data) => {
    const words = data.title.split(/[\s\-:|\u2013\u2014]+/).filter(w => w.length > 2);
    const brandWords = data.developerName.toLowerCase().split(/\s+/);
    const nonBrandWords = words.filter(w => !brandWords.some(bw => w.toLowerCase().includes(bw)));

    if (nonBrandWords.length >= 2) {
      return { score: 90, status: "pass", message: `Title contains ${nonBrandWords.length} descriptive keywords beyond brand name`, details: `Keywords found: \u201c${nonBrandWords.join('\u201d, \u201c')}\u201d` };
    }
    if (nonBrandWords.length === 1) {
      return { score: 60, status: "warning", message: "Title has only 1 descriptive keyword beyond brand name", recommendation: "Add more keywords to communicate your app\u2019s value proposition. Use format: \u2018Brand \u2013 Keyword Phrase\u2019." };
    }
    return { score: 25, status: "fail", message: "Title appears to be brand-only with no descriptive keywords", recommendation: "A brand-only title wastes your highest-weighted metadata space. Even established brands like \u2018Waze: Navigation & Live Traffic\u2019 include keywords." };
  },
};

const titleComplianceRule: AuditRule = {
  id: "title-compliance",
  category: "title",
  name: "Title Store Compliance",
  description: "Checks for prohibited terms per Apple/Google guidelines",
  weight: 8,
  platform: "both",
  evaluate: (data) => {
    const violations = containsProhibitedTerms(data.title);
    if (violations.length === 0) {
      return { score: 100, status: "pass", message: "Title complies with store guidelines" };
    }
    return { score: 20, status: "fail", message: `Title contains prohibited terms: ${violations.join(", ")}`, recommendation: `Remove \u201c${violations.join('\u201d, \u201c')}\u201d from your title. Both stores prohibit performance claims, superlatives, and promotional language. This can lead to rejection.` };
  },
};

const titleReadabilityRule: AuditRule = {
  id: "title-readability",
  category: "title",
  name: "Title Readability",
  description: "Ensures the title reads naturally and isn't keyword-stuffed",
  weight: 7,
  platform: "both",
  evaluate: (data) => {
    if (hasKeywordStuffing(data.title)) {
      return { score: 20, status: "fail", message: "Title appears keyword-stuffed", recommendation: "Keyword stuffing hurts conversion rates and can trigger store violations. Write for humans first, SEO second." };
    }
    const hasGoodSeparator = /[:\-|\u2013\u2014]/.test(data.title);
    if (hasGoodSeparator) {
      return { score: 95, status: "pass", message: "Title has good structure with clear separator between brand and keywords" };
    }
    return { score: 75, status: "pass", message: "Title reads naturally", details: "Consider using a separator (: or \u2013) to clearly distinguish brand name from descriptive keywords." };
  },
};

// ============================================================
// SUBTITLE RULES (iOS only)
// Per book Ch.2: "weighs more than iOS keyword field but less than title"
// Per ASO skill: "no duplicates" between title and subtitle
// ============================================================

const subtitleLengthRule: AuditRule = {
  id: "subtitle-length",
  category: "subtitle",
  name: "Subtitle Length (iOS)",
  description: "Evaluates subtitle character usage",
  weight: 8,
  platform: "ios",
  evaluate: (data) => {
    if (!data.subtitle) {
      return { score: 0, status: "fail", message: "No subtitle detected", recommendation: "The subtitle is the second-most weighted metadata field on iOS. Always use it with high-priority keywords." };
    }
    const len = data.subtitle.length;
    const usage = (len / 30) * 100;

    if (usage >= 85) {
      return { score: 95, status: "pass", message: `Excellent subtitle usage (${len}/30 chars, ${Math.round(usage)}%)` };
    }
    if (usage >= 60) {
      return { score: 70, status: "warning", message: `Subtitle could use more keywords (${len}/30 chars)`, recommendation: `${30 - len} characters unused. Add more keywords\u2014don\u2019t duplicate what\u2019s in your title.` };
    }
    return { score: 35, status: "fail", message: `Subtitle severely underutilized (${len}/30 chars)`, recommendation: "You\u2019re wasting valuable indexed space. Fill the subtitle with your next-priority keywords." };
  },
};

const subtitleNoDuplicateRule: AuditRule = {
  id: "subtitle-no-duplicate",
  category: "subtitle",
  name: "Subtitle Keyword Uniqueness",
  description: "Checks that subtitle doesn't repeat title keywords (wastes space)",
  weight: 7,
  platform: "ios",
  evaluate: (data) => {
    if (!data.subtitle) {
      return { score: 0, status: "info", message: "No subtitle to evaluate" };
    }
    const titleWords = new Set(data.title.toLowerCase().split(/[\s\-:,|]+/).filter(w => w.length > 2));
    const subtitleWords = data.subtitle.toLowerCase().split(/[\s\-:,|]+/).filter(w => w.length > 2);
    const duplicates = subtitleWords.filter(w => titleWords.has(w));

    if (duplicates.length === 0) {
      return { score: 100, status: "pass", message: "Subtitle uses unique keywords (no title duplicates)" };
    }
    if (duplicates.length <= 1) {
      return { score: 70, status: "warning", message: `1 keyword duplicated from title: \u201c${duplicates[0]}\u201d`, recommendation: `Per Apple\u2019s algorithm, repeating keywords between title and subtitle adds no extra weight. Replace \u201c${duplicates[0]}\u201d with a new keyword.` };
    }
    return { score: 30, status: "fail", message: `${duplicates.length} keywords duplicated from title: \u201c${duplicates.join('\u201d, \u201c')}\u201d`, recommendation: "Apple combines title + subtitle + keyword field automatically. Use unique keywords in each field to maximize your 160-character indexable space." };
  },
};

// ============================================================
// SHORT DESCRIPTION RULES (Android only)
// ============================================================

const shortDescLengthRule: AuditRule = {
  id: "short-desc-length",
  category: "short-description",
  name: "Short Description Length (Android)",
  description: "Evaluates the 80-character short description usage",
  weight: 8,
  platform: "android",
  evaluate: (data) => {
    if (!data.shortDescription) {
      return { score: 0, status: "fail", message: "No short description found", recommendation: "The short description is the second most important text field for ASO on Google Play. Always use it." };
    }
    const len = data.shortDescription.length;
    const usage = (len / 80) * 100;

    if (usage >= 85) {
      return { score: 95, status: "pass", message: `Strong short description usage (${len}/80 chars)` };
    }
    if (usage >= 60) {
      return { score: 70, status: "warning", message: `Room to optimize (${len}/80 chars, ${Math.round(usage)}% used)`, recommendation: "Add secondary keywords naturally. This field appears in search results\u2014make it count." };
    }
    return { score: 35, status: "fail", message: `Short description underused (${len}/80 chars)`, recommendation: "The short description is visible in search results and indexed by Google. Maximize it with a compelling keyword-rich pitch." };
  },
};

// ============================================================
// FULL DESCRIPTION RULES
// Per book Ch.2: "keywords mentioned frequently and earlier in
// the long description have been found to be considered more relevant"
// Per ASO skill: "keyword density matters more than raw count"
// ============================================================

const descriptionLengthRule: AuditRule = {
  id: "desc-length",
  category: "description",
  name: "Description Length",
  description: "Evaluates description length for keyword indexing (Google) and conversion (both)",
  weight: 6,
  platform: "both",
  evaluate: (data) => {
    const len = data.description.length;

    if (data.platform === "android") {
      if (len >= 2500) {
        return { score: 90, status: "pass", message: `Good description length (${len}/4,000 chars)`, details: "A well-structured description between 2,500\u20134,000 chars gives Google enough keyword signals without diluting density." };
      }
      if (len >= 1500) {
        return { score: 65, status: "warning", message: `Description could be longer (${len}/4,000 chars)`, recommendation: "Expand with structured feature sections. Include primary keywords 3\u20135 times naturally. Keyword density > raw repetition count." };
      }
      return { score: 30, status: "fail", message: `Description too short for Google Play ASO (${len}/4,000 chars)`, recommendation: "Short descriptions mean fewer keyword signals for Google\u2019s algorithm. Aim for 2,500+ characters with structured content." };
    }
    if (len >= 500) {
      return { score: 80, status: "pass", message: `Description provides enough conversion context (${len} chars)`, details: "While iOS doesn\u2019t index descriptions for search, a good description improves conversion and is indexed on the web." };
    }
    return { score: 50, status: "warning", message: `Description is short (${len} chars)`, recommendation: "Even though Apple doesn\u2019t index descriptions for search, a detailed description helps conversion and web SEO." };
  },
};

const descriptionStructureRule: AuditRule = {
  id: "desc-structure",
  category: "description",
  name: "Description Structure",
  description: "Checks for proper formatting (paragraphs, features, social proof)",
  weight: 5,
  platform: "both",
  evaluate: (data) => {
    const desc = data.description;
    const hasParagraphs = (desc.match(/\n\n/g) || []).length >= 2;
    const hasBullets = /[\u2022\-\u2605\u2713\u2714\u2B50\u25BA\u25B8]/.test(desc) || /\n[\u2022\-*]/.test(desc);
    const hasFeatureList = /feature|what you|why |how to/i.test(desc);
    const first250 = desc.substring(0, 250);
    const hasStrongOpening = first250.length >= 100;

    let score = 40;
    const issues: string[] = [];
    const wins: string[] = [];

    if (hasParagraphs) { score += 15; wins.push("good paragraph separation"); }
    else { issues.push("add paragraph breaks for readability"); }

    if (hasBullets) { score += 15; wins.push("uses bullet points/list formatting"); }
    else { issues.push("add bullet points to highlight features"); }

    if (hasFeatureList) { score += 15; wins.push("includes feature-focused content"); }
    else { issues.push("add a features section"); }

    if (hasStrongOpening) { score += 15; wins.push("solid opening paragraph"); }
    else { issues.push("strengthen first 2\u20133 sentences\u2014most users won\u2019t scroll past them"); }

    return {
      score: Math.min(score, 100),
      status: score >= 70 ? "pass" : score >= 50 ? "warning" : "fail",
      message: wins.length > 0 ? `Description structure: ${wins.join(", ")}` : "Description needs structural improvements",
      recommendation: issues.length > 0 ? `Improve: ${issues.join("; ")}` : undefined,
    };
  },
};

const descriptionOpeningHookRule: AuditRule = {
  id: "desc-opening-hook",
  category: "description",
  name: "Description Opening Hook",
  description: "The first 3 lines (visible before 'Read more') must lead with a value proposition, not boilerplate",
  weight: 7,
  platform: "both",
  evaluate: (data) => {
    const first250 = data.description.substring(0, 250).toLowerCase();
    const weakOpeners = [
      "welcome to", "thanks for", "thank you for",
      "this app is", "this is a", "this is the",
      "we are", "we're", "our app",
      "introducing", "presenting",
    ];
    const weakOpener = weakOpeners.find(w => first250.startsWith(w));

    const hasSpecificBenefit = /\d+|free|save|track|stream|discover|manage|create|build|learn|earn|play|listen|watch|connect|unlock/i.test(first250);
    const hasSocialProof = /million|thousand|\d+k|\d+m|award|rated|featured|loved by/i.test(first250);
    const hasActionVerb = /^(get|start|take|make|find|join|explore|discover|unlock|achieve|master|build|stream|listen|watch|track)/i.test(first250.trim());

    let score = 50;
    const notes: string[] = [];

    if (weakOpener) {
      score -= 20;
      notes.push(`opens with "${weakOpener}..." — weak hook`);
    }
    if (hasActionVerb) {
      score += 20;
      notes.push("leads with action verb");
    }
    if (hasSpecificBenefit) {
      score += 15;
      notes.push("mentions specific benefit or capability");
    }
    if (hasSocialProof) {
      score += 10;
      notes.push("includes social proof");
    }
    if (countWords(first250) < 15) {
      score -= 15;
      notes.push("opening is very thin — needs more substance");
    }

    score = Math.max(10, Math.min(score, 100));

    if (score >= 70) {
      return { score, status: "pass", message: `Strong opening: ${notes.join(", ")}`, details: "The first 3 lines are visible without tapping 'Read more' — they're your highest-leverage conversion copy." };
    }
    if (score >= 45) {
      return { score, status: "warning", message: `Opening could be stronger: ${notes.join(", ")}`, recommendation: "Rewrite the first 3 lines to lead with your core value proposition. Use an action verb, state a specific benefit, and make users want to read more. Avoid generic openers like 'Welcome to...' or 'This app is...'." };
    }
    return { score, status: "fail", message: `Weak opening hook: ${notes.join(", ")}`, recommendation: "Your first 3 lines are critical — most users never scroll past them. Lead with what the user gets, not what the app is. Example: '[Verb] [specific outcome] with [app name]. [Social proof or key differentiator].' Avoid starting with 'Welcome to' or 'This app is'." };
  },
};

const descriptionCTARule: AuditRule = {
  id: "desc-cta",
  category: "description",
  name: "Description Call-to-Action",
  description: "Checks if the description ends with a compelling call to action",
  weight: 4,
  platform: "both",
  evaluate: (data) => {
    const last300 = data.description.substring(data.description.length - 300).toLowerCase();
    const ctaPatterns = [
      "download", "try", "get started", "start", "join",
      "sign up", "subscribe", "install", "free", "today",
      "now", "don't wait", "what are you waiting",
    ];
    const hasCTA = ctaPatterns.some(p => last300.includes(p));

    if (hasCTA) {
      return { score: 90, status: "pass", message: "Description ends with a call to action", details: "A CTA at the end of your description guides users who've read through to take the final step." };
    }
    return { score: 40, status: "warning", message: "No call-to-action at the end of description", recommendation: "End your description with a clear CTA like 'Download [App] today and [desired outcome].' or 'Join [X]+ users — try it free.' This nudges engaged readers toward conversion." };
  },
};

const descriptionKeywordDensityRule: AuditRule = {
  id: "desc-keyword-density",
  category: "description",
  name: "Description Keyword Placement (Android)",
  description: "Checks if primary keywords from title appear in description with proper density",
  weight: 7,
  platform: "android",
  evaluate: (data) => {
    const stopWords = new Set(["with", "from", "your", "the", "and", "for", "that", "this", "app"]);
    const titleWords = data.title.toLowerCase()
      .split(/[\s\-:,|]+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    if (titleWords.length === 0) {
      return { score: 50, status: "info", message: "Could not extract meaningful keywords from title to check density" };
    }

    const desc = data.description.toLowerCase();
    const firstQuarter = desc.substring(0, Math.floor(desc.length / 4));
    let score = 0;
    const details: string[] = [];

    for (const word of titleWords) {
      const totalCount = (desc.split(word).length - 1);
      const earlyCount = (firstQuarter.split(word).length - 1);

      if (totalCount >= 3 && totalCount <= 8) {
        score += 30;
        details.push(`\u201c${word}\u201d: ${totalCount}x (good density)`);
      } else if (totalCount >= 1) {
        score += 15;
        details.push(`\u201c${word}\u201d: ${totalCount}x (could increase to 3\u20135x)`);
      } else {
        details.push(`\u201c${word}\u201d: missing from description`);
      }

      if (earlyCount >= 1) {
        score += 10;
      }
    }

    score = Math.min(Math.round(score / titleWords.length), 100);

    return {
      score,
      status: score >= 70 ? "pass" : score >= 40 ? "warning" : "fail",
      message: `Keyword density analysis for ${titleWords.length} title keywords`,
      details: details.join("\n"),
      recommendation: score < 70 ? "On Google Play, repeat primary keywords 3\u20135x naturally, with emphasis in the first few lines. Keyword density matters more than raw repetition count." : undefined,
    };
  },
};

// ============================================================
// VISUAL ASSETS RULES
// Per screenshots skill: "First 3 Rule", OCR indexing, gallery strategy
// Per book Ch.3: Conversion Rate Optimization
// ============================================================

const screenshotCountRule: AuditRule = {
  id: "screenshot-count",
  category: "visuals",
  name: "Screenshot Count",
  description: "Checks if sufficient screenshots are uploaded (6\u20138 minimum for complete story)",
  weight: 8,
  platform: "both",
  evaluate: (data) => {
    const max = data.platform === "ios" ? 10 : 8;
    const count = data.screenshotCount;
    const minRecommended = data.platform === "ios" ? 6 : 6;

    if (count >= max) {
      return { score: 100, status: "pass", message: `Maximum screenshots uploaded (${count}/${max})` };
    }
    if (count >= minRecommended) {
      return { score: 80, status: "pass", message: `Good screenshot count (${count}/${max})`, recommendation: `Consider filling all ${max} slots. Each screenshot is a conversion opportunity to showcase features. Upload all ${max} only if each adds distinct value.` };
    }
    if (count >= 3) {
      return { score: 45, status: "warning", message: `Only ${count}/${max} screenshots`, recommendation: `Upload 6\u20138 screenshots minimum to tell a complete value story. Front-load your strongest benefit in screenshot #1\u2014it gets the most views.` };
    }
    return { score: 15, status: "fail", message: `Critically few screenshots (${count}/${max})`, recommendation: "Screenshots are one of the strongest conversion drivers. Upload at minimum 6 screenshots following the gallery order strategy: Hero \u2192 Differentiator \u2192 Popular Feature \u2192 Social Proof \u2192 Additional Features." };
  },
};

const screenshotFirst3Rule: AuditRule = {
  id: "screenshot-first-3",
  category: "visuals",
  name: "First 3 Screenshots Rule",
  description: "80% of App Store impressions show only the first 3 screenshots before scrolling",
  weight: 9,
  platform: "both",
  evaluate: (data) => {
    const count = data.screenshotCount;
    if (count >= 3) {
      return {
        score: 80,
        status: "pass",
        message: `App has ${count} screenshots (first 3 visible without scrolling)`,
        details: "The First 3 Rule: 80% of impressions show only the first 3 screenshots. Users spend ~7 seconds on an app page before deciding. Your first 3 must function as a complete elevator pitch:\n\u2022 Screenshot 1: Core value proposition (What is it?)\n\u2022 Screenshot 2: Key differentiator (What makes you unique?)\n\u2022 Screenshot 3: Most popular feature (Why do I need it?)",
        recommendation: "Verify your first 3 screenshots answer: What is it? What does it do? Why do I need it? This is the most impactful conversion optimization you can make."
      };
    }
    return {
      score: 20,
      status: "fail",
      message: `Only ${count} screenshots\u2014cannot fulfill the First 3 Rule`,
      recommendation: "You need at least 3 screenshots to form a complete elevator pitch. 80% of users only see the first 3\u2014make them count."
    };
  },
};

const screenshotOCRRule: AuditRule = {
  id: "screenshot-ocr",
  category: "visuals",
  name: "Apple Screenshot OCR Indexing (2025\u20132026)",
  description: "Apple now uses OCR to extract and index text from screenshot captions as ranking signals",
  weight: 7,
  platform: "ios",
  evaluate: () => {
    return {
      score: 60,
      status: "info",
      message: "Apple OCR Screenshot Indexing: Major 2025\u20132026 algorithm shift",
      details: "Apple now extracts readable text from screenshot captions and uses it as a keyword ranking signal. This transforms screenshots from conversion-only tools into discovery assets\u2014a secondary keyword field beyond standard metadata.",
      recommendation: "Optimize screenshot captions for OCR:\n\u2022 Use bold sans-serif fonts at 40pt+ minimum\n\u2022 High-contrast text on clean backgrounds\n\u2022 Map 5\u201310 core ASO keywords across screenshot captions\n\u2022 First 3 screenshots carry heaviest indexing weight\n\u2022 Replace generic phrases (\u201cEasy to Use\u201d) with keyword-rich text (\u201cTrack Sleep Patterns\u201d)\n\u2022 Align screenshot text with metadata keywords to amplify ranking signals"
    };
  },
};

const videoPresenceRule: AuditRule = {
  id: "video-presence",
  category: "visuals",
  name: "Preview Video",
  description: "Checks for the presence of an app preview video",
  weight: 5,
  platform: "both",
  evaluate: (data) => {
    if (data.hasVideo) {
      return {
        score: 100,
        status: "pass",
        message: "App preview video is present",
        details: data.platform === "ios"
          ? "iOS preview videos: 15\u201330 seconds, H.264 .mov/.mp4. Structure: Hook (0\u20133s) \u2192 Feature 1 (3\u201310s) \u2192 Feature 2 (10\u201318s) \u2192 Feature 3 (18\u201325s) \u2192 CTA (25\u201330s)."
          : "Google Play videos: YouTube URL, 30s\u20132min recommended, landscape preferred. Hook in first 3 seconds is critical."
      };
    }
    return {
      score: 40,
      status: "warning",
      message: "No app preview video detected",
      recommendation: data.platform === "ios"
        ? "Add a 15\u201330s preview video. Structure: start with your wow moment in the first 3s, show 2\u20133 key features, end with app icon. Videos loop silently in the store."
        : "Add a YouTube preview video (30s\u20132min). Hook viewers in the first 3 seconds with your core outcome. Landscape orientation preferred."
    };
  },
};

// ============================================================
// RATINGS & REVIEWS
// Per book Ch.5: algorithm ranking signal
// Per ASO skill: "respond within 24\u201348 hours, always professional"
// ============================================================

const ratingScoreRule: AuditRule = {
  id: "rating-score",
  category: "ratings",
  name: "Average Rating",
  description: "Evaluates the app's star rating",
  weight: 9,
  platform: "both",
  evaluate: (data) => {
    const r = data.rating;
    if (r >= 4.5) {
      return { score: 100, status: "pass", message: `Excellent rating: ${r.toFixed(1)}\u2605`, details: "Ratings above 4.5 are in the top tier and strongly boost both conversion and rankings." };
    }
    if (r >= 4.0) {
      return { score: 80, status: "pass", message: `Good rating: ${r.toFixed(1)}\u2605`, recommendation: "Above 4.0 is healthy but aim for 4.3+ for optimal conversion impact. Use strategic in-app review prompts after positive experiences." };
    }
    if (r >= 3.5) {
      return { score: 50, status: "warning", message: `Below-average rating: ${r.toFixed(1)}\u2605`, recommendation: "Ratings below 4.0 significantly hurt conversion. Prioritize: 1) Fix top user complaints, 2) Implement smart review prompts after positive experiences, 3) Respond to negative reviews within 24\u201348h." };
    }
    if (r > 0) {
      return { score: 20, status: "fail", message: `Critical rating issue: ${r.toFixed(1)}\u2605`, recommendation: "This rating is severely hurting conversion and rankings. Address user complaints urgently and implement a review strategy before investing in other ASO work." };
    }
    return { score: 30, status: "info", message: "No rating data available" };
  },
};

const ratingsCountRule: AuditRule = {
  id: "ratings-count",
  category: "ratings",
  name: "Ratings Volume",
  description: "Evaluates whether the app has enough ratings for social proof",
  weight: 7,
  platform: "both",
  evaluate: (data) => {
    const count = data.ratingsCount;
    if (count >= 10000) {
      return { score: 100, status: "pass", message: `Strong social proof: ${count.toLocaleString()} ratings` };
    }
    if (count >= 1000) {
      return { score: 80, status: "pass", message: `Good ratings volume: ${count.toLocaleString()}`, recommendation: "Continue building rating volume with in-app prompts. Higher counts improve trust signals." };
    }
    if (count >= 100) {
      return { score: 55, status: "warning", message: `Moderate ratings volume: ${count.toLocaleString()}`, recommendation: "Implement strategic review prompts. Ask for ratings after positive in-app experiences (completing a task, achieving a goal, 3rd session)." };
    }
    if (count > 0) {
      return { score: 25, status: "fail", message: `Low ratings volume: ${count.toLocaleString()}`, recommendation: "Low rating volume weakens social proof and algorithm signals. Set up in-app review prompts immediately. Time them after positive user experiences." };
    }
    return { score: 20, status: "info", message: "No ratings data available" };
  },
};

// ============================================================
// UPDATE FREQUENCY
// Per book Ch.1: Algorithm considers app maintenance as quality signal
// Per ASO skill: "Monitor metrics daily for first 2 weeks"
// ============================================================

const updateFrequencyRule: AuditRule = {
  id: "update-frequency",
  category: "maintenance",
  name: "Update Recency",
  description: "Checks how recently the app was updated",
  weight: 6,
  platform: "both",
  evaluate: (data) => {
    const days = daysSinceDate(data.lastUpdated);
    if (days === 999) {
      return { score: 50, status: "info", message: "Could not determine last update date" };
    }
    if (days <= 30) {
      return { score: 100, status: "pass", message: `Recently updated (${days} days ago)`, details: "Regular updates signal active maintenance and refresh your metadata iteration opportunity." };
    }
    if (days <= 60) {
      return { score: 80, status: "pass", message: `Updated ${days} days ago`, recommendation: "Good cadence. On iOS, each update is an opportunity to refresh metadata (title, subtitle, keywords). Research and update quarterly." };
    }
    if (days <= 120) {
      return { score: 50, status: "warning", message: `Last update was ${days} days ago`, recommendation: "Both stores favor actively maintained apps. Plan regular updates every 4\u20136 weeks. Each update is a chance to iterate on your ASO metadata." };
    }
    return { score: 20, status: "fail", message: `App hasn\u2019t been updated in ${days} days`, recommendation: "Stale apps lose ranking strength over time. Google explicitly factors app stability/maintenance into rankings. Ship an update and refresh your metadata." };
  },
};

// ============================================================
// METADATA COMPLETENESS
// Per ASO skill: developer name indexed, category selection strategy
// ============================================================

const categoryOptimizationRule: AuditRule = {
  id: "category-optimization",
  category: "metadata",
  name: "Category Selection",
  description: "Evaluates whether the app category supports ASO goals",
  weight: 4,
  platform: "both",
  evaluate: (data) => {
    if (data.category && data.category.length > 0) {
      return { score: 75, status: "pass", message: `App is in category: ${data.category}`, details: "Ensure your primary category matches user search intent. The secondary category can be chosen strategically for additional keyword visibility (category names are \u2018free\u2019 indexed keywords on iOS)." };
    }
    return { score: 50, status: "info", message: "Category information not available for analysis" };
  },
};

const developerNameRule: AuditRule = {
  id: "developer-name",
  category: "metadata",
  name: "Developer Name Optimization",
  description: "The developer name is indexed on both platforms for keyword ranking",
  weight: 3,
  platform: "both",
  evaluate: (data) => {
    const name = data.developerName;
    if (!name) {
      return { score: 40, status: "info", message: "Developer name not available" };
    }
    const words = name.split(/\s+/).filter(w => w.length > 2);
    const corpSuffixes = ["inc", "llc", "ltd", "corp", "gmbh", "co"];
    const nonCorpWords = words.filter(w => !corpSuffixes.includes(w.toLowerCase()));

    if (nonCorpWords.length >= 2) {
      return { score: 80, status: "pass", message: `Developer name: \u201c${name}\u201d`, details: "Developer names are indexed on both platforms. Including a keyword alongside your brand name can provide extra ranking power." };
    }
    return { score: 60, status: "info", message: `Developer name: \u201c${name}\u201d`, recommendation: "Consider including a category keyword in your developer name (e.g., \u2018Brand \u2013 Category Keyword\u2019). This field is indexed for search on both stores." };
  },
};

// ============================================================
// CONVERSION SIGNALS
// ============================================================

const pricingRule: AuditRule = {
  id: "pricing",
  category: "conversion",
  name: "Pricing Strategy Signal",
  description: "Evaluates pricing visibility and conversion impact",
  weight: 3,
  platform: "both",
  evaluate: (data) => {
    const isFree = data.price === "Free" || data.price === "0" || data.price === "$0.00";
    if (isFree) {
      return { score: 85, status: "pass", message: "App is free to download", details: "Free apps have higher conversion rates. Both stores automatically index free apps for the keyword \u2018free\u2019." };
    }
    return { score: 65, status: "info", message: `App is paid: ${data.price}`, details: "Paid apps need stronger screenshot/video messaging to justify the price. Consider if a freemium model could improve download conversion." };
  },
};

const promotionalTextRule: AuditRule = {
  id: "promotional-text",
  category: "conversion",
  name: "Promotional Text (iOS)",
  description: "Apple's 170-char promotional text can be changed without an app update",
  weight: 4,
  platform: "ios",
  evaluate: (data) => {
    if (data.promotionalText && data.promotionalText.length > 0) {
      const len = data.promotionalText.length;
      return {
        score: 90,
        status: "pass",
        message: `Promotional text is set (${len}/170 chars)`,
        details: "Promotional text appears above the description and can be updated anytime without an app submission. Use it for seasonal campaigns, feature announcements, or time-sensitive messaging."
      };
    }
    return {
      score: 50,
      status: "warning",
      message: "No promotional text detected",
      recommendation: "Apple\u2019s promotional text (170 chars) can be changed without submitting an app update. Use it for seasonal campaigns, limited-time offers, or highlighting new features. It\u2019s your most flexible metadata field."
    };
  },
};

// ============================================================
// ALL RULES
// ============================================================

export const ALL_RULES: AuditRule[] = [
  titleLengthRule,
  titleFrontloadRule,
  titleKeywordPresenceRule,
  titleComplianceRule,
  titleReadabilityRule,
  subtitleLengthRule,
  subtitleNoDuplicateRule,
  shortDescLengthRule,
  descriptionLengthRule,
  descriptionStructureRule,
  descriptionOpeningHookRule,
  descriptionCTARule,
  descriptionKeywordDensityRule,
  screenshotCountRule,
  screenshotFirst3Rule,
  screenshotOCRRule,
  videoPresenceRule,
  ratingScoreRule,
  ratingsCountRule,
  updateFrequencyRule,
  categoryOptimizationRule,
  developerNameRule,
  pricingRule,
  promotionalTextRule,
];

export const CATEGORY_CONFIG: Record<string, { name: string; icon: string; description: string }> = {
  title: { name: "Title Optimization", icon: "Type", description: "App title keyword targeting, front-loading, and character usage" },
  subtitle: { name: "Subtitle (iOS)", icon: "AlignLeft", description: "Subtitle keyword uniqueness and character optimization" },
  "short-description": { name: "Short Description (Android)", icon: "AlignLeft", description: "Google Play short description (80 chars)" },
  description: { name: "Description", icon: "FileText", description: "Full description structure, opening hook, keyword density, and CTA" },
  visuals: { name: "Visual Assets", icon: "Image", description: "Screenshots (First 3 Rule, OCR), video, gallery strategy" },
  ratings: { name: "Ratings & Reviews", icon: "Star", description: "User ratings volume and sentiment" },
  maintenance: { name: "App Maintenance", icon: "RefreshCw", description: "Update frequency and lifecycle health" },
  metadata: { name: "Metadata Completeness", icon: "Settings", description: "Category, developer name, and supplementary fields" },
  conversion: { name: "Conversion Signals", icon: "TrendingUp", description: "Pricing, promotional text, and conversion factors" },
};

export function runAudit(appData: AppData): AuditCategory[] {
  const applicableRules = ALL_RULES.filter(
    r => r.platform === "both" || r.platform === appData.platform
  );

  const categoryResults = new Map<string, (RuleResult & { ruleName: string; ruleId: string; weight: number })[]>();

  for (const rule of applicableRules) {
    const result = rule.evaluate(appData);
    const cat = rule.category;
    if (!categoryResults.has(cat)) categoryResults.set(cat, []);
    categoryResults.get(cat)!.push({
      ...result,
      ruleName: rule.name,
      ruleId: rule.id,
      weight: rule.weight,
    });
  }

  const categories: AuditCategory[] = [];

  for (const [catId, results] of categoryResults) {
    const config = CATEGORY_CONFIG[catId] || { name: catId, icon: "Circle", description: "" };
    const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
    const weightedScore = totalWeight > 0
      ? Math.round(results.reduce((sum, r) => sum + r.score * r.weight, 0) / totalWeight)
      : 0;

    categories.push({
      id: catId,
      name: config.name,
      icon: config.icon,
      description: config.description,
      score: weightedScore,
      maxScore: 100,
      results,
    });
  }

  return categories.sort((a, b) => {
    const order = ["title", "subtitle", "short-description", "description", "visuals", "ratings", "maintenance", "metadata", "conversion"];
    return order.indexOf(a.id) - order.indexOf(b.id);
  });
}

export function calculateOverallScore(categories: AuditCategory[]): number {
  if (categories.length === 0) return 0;
  const categoryWeights: Record<string, number> = {
    title: 10, subtitle: 8, "short-description": 8, description: 6,
    visuals: 9, ratings: 9, maintenance: 5, metadata: 3, conversion: 4,
  };
  let totalWeight = 0;
  let weightedSum = 0;
  for (const cat of categories) {
    const w = categoryWeights[cat.id] || 5;
    weightedSum += cat.score * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}
