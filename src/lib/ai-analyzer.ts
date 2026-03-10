import type { AppData } from "./aso-rules";
import type { DeepDiveSection } from "./action-plan";

const GEMINI_MODEL = "gemini-3-flash-preview";
// gemini-3.1-flash-lite-preview was released 2026-03-03 and has been unstable on launch.
// Using the stable gemini-2.5-flash-lite as the reliable fallback.
const GEMINI_MODEL_LITE = "gemini-2.5-flash-lite";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_URL = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent`;
const GEMINI_URL_LITE = `${GEMINI_BASE}/${GEMINI_MODEL_LITE}:generateContent`;

const IMAGE_GEN_MODEL = "gemini-3.1-flash-image-preview";
const IMAGE_GEN_URL = `${GEMINI_BASE}/${IMAGE_GEN_MODEL}:generateContent`;

// ---------------------------------------------------------------------------
// AIAnalysis — covers every audit area, all optional for resilience
// ---------------------------------------------------------------------------

export interface AIAnalysis {
  title: {
    issues: string[];
    suggestions: string[];
    reasoning: string;
    priority?: string;
  };
  subtitle?: {
    issues: string[];
    suggestions: string[];
    reasoning: string;
    priority?: string;
  };
  titleSubtitlePairs?: {
    pairs: {
      title: string;
      subtitle: string;
      keywordsCovered: string[];
      reasoning: string;
    }[];
    keywordStrategy: string;
    priority?: string;
  };
  titleShortDescPairs?: {
    pairs: {
      title: string;
      shortDescription: string;
      keywordsCovered: string[];
      strategy: string;
      reasoning: string;
    }[];
    keywordStrategy: string;
    priority?: string;
  };
  shortDescription?: {
    issues: string[];
    suggestions: string[];
    reasoning: string;
    priority?: string;
  };
  keywordField?: {
    suggestedKeywords: string[];
    avoidKeywords: string[];
    reasoning: string;
  };
  description: {
    fullRewrite: string;
    openingHook: string;
    featureBullets: string[];
    cta: string;
    keywordGaps: string[];
    structureIssues: string[];
    priority?: string;
    keywordDensity?: {
      keyword: string;
      currentCount: number;
      recommendedCount: number;
    }[];
  };
  promotionalText?: {
    suggestions: string[];
    reasoning: string;
  };
  icon?: {
    assessment: string;
    issues: string[];
    suggestions: string[];
    priority?: string;
  };
  screenshots: {
    overallAssessment: string;
    galleryCoherence: number;
    firstThreeVerdict: string;
    priority?: string;
    perScreenshot: {
      slot: number;
      whatItShows: string;
      captionVisible: string;
      captionQuality: string;
      captionSuggestion: string;
      style: string;
      issues: string[];
    }[];
    missingSlots: {
      slot: number;
      whatToShow: string;
      captionSuggestion: string;
      recommendedStyle: string;
    }[];
    commonMistakesFound: string[];
    cppStrategy?: {
      shouldUseCPPs: boolean;
      keywordClusters: string[];
      reasoning: string;
    };
    customStoreListings?: {
      shouldUse: boolean;
      listingIdeas: string[];
      reasoning: string;
    };
  };
  featureGraphic?: {
    assessment: string;
    issues: string[];
    suggestions: string[];
  };
  video?: {
    assessment: string;
    storyboard: {
      segment: string;
      duration: string;
      content: string;
    }[];
  };
  ratings?: {
    assessment: string;
    promptStrategy: string;
    suggestions: string[];
  };
  whatsNew?: {
    assessment: string;
    suggestions: string[];
  };
  abTesting?: {
    priority: string;
    experiments: {
      name: string;
      hypothesis: string;
      variants: string[];
      metric: string;
    }[];
  };
  maintenance?: {
    assessment: string;
    seasonalOpportunities: string[];
    suggestions: string[];
  };
  localization?: {
    priority: string;
    tier1Markets: string[];
    tier2Markets: string[];
    reasoning: string;
  };
  topInsights: string[];
}

// ---------------------------------------------------------------------------
// System prompts — split into text-focused and visual-focused
// ---------------------------------------------------------------------------

const TEXT_SYSTEM_PROMPT = `You are a senior App Store Optimization (ASO) consultant with 10+ years of experience. You analyze app store listing METADATA and provide specific, actionable, expert-level recommendations grounded in current best practices. You always reference actual app content — never give generic advice.

## PLATFORM CHARACTER LIMITS

### Apple App Store
| Field | Limit | Notes |
|-------|-------|-------|
| Title | 30 chars | Most heavily weighted for search ranking |
| Subtitle | 30 chars | Second-most weighted on iOS |
| Promotional Text | 170 chars | Editable WITHOUT app update — appears above description |
| Description | 4,000 chars | NOT indexed for search on iOS, but impacts conversion + web SEO |
| Keywords | 100 chars | Comma-separated, invisible to users, no spaces after commas |
| What's New | 4,000 chars | Shown to existing users; opportunity for re-engagement |

### Google Play Store
| Field | Limit | Notes |
|-------|-------|-------|
| Title | 30 chars | Most heavily weighted for search ranking |
| Short Description | 80 chars | Second-most indexed field; appears in search results |
| Full Description | 4,000 chars | Fully indexed for search — keyword density matters |

Google has no separate keyword field — keywords extracted from title and description.

## METADATA OPTIMIZATION RULES

**Title:**
- Most heavily weighted metadata element on both stores
- Front-load keywords in first 15 chars (most visible in search, highest algorithmic weight)
- Format: "Brand – Keyword Phrase" or "Keyword – Brand" (if brand isn't well-known)
- Write for humans first, SEO second — must read naturally
- No superlatives (#1, best, top) — stores reject these
- NEVER repeat the same word within a single title — each word should be a unique ranking term
- Use every available character — unused chars = wasted ranking potential
- Both platforms: 30 chars max

**Subtitle (iOS only, 30 chars):**
- Second-most weighted field on iOS
- Zero word overlap with title (Apple combines title + subtitle + keyword field automatically)
- Don't repeat category name (already indexed for free)
- Apple's indexable budget: title (30) + subtitle (30) + keyword field (100) = 160 chars total

**iOS Keyword Field (100 chars, invisible):**
- Comma-separated, NO spaces after commas (spaces waste characters)
- No plurals (Apple handles singular/plural automatically)
- No words already in title or subtitle (duplicates waste budget)
- Single words > phrases — Apple recombines: "music,streaming" covers "music streaming" + "streaming music"
- No competitor brand names (violates guidelines, app rejection risk)
- No category name (already indexed automatically)
- Research and update quarterly with each app submission

**Short Description (Android only, 80 chars):**
- Second-most indexed field on Google Play
- Front-load primary keyword in first 3 words
- Appears directly in search results — must be compelling pitch, not keyword list
- Directly affects click-through rate from search

**Full Description:**
- Google: Fully indexed. Keywords 3-5x naturally, front-loaded in first paragraph. Keyword density > raw count.
- iOS: NOT indexed for search, but impacts conversion rate and is indexed by web search engines
- Structure: Opening hook → Feature bullets → Social proof → CTA
- Opening must lead with value proposition, not "Welcome to..." or "This app is..." or "We are..."
- 2,500-4,000 chars recommended for both platforms

**Promotional Text (iOS only, 170 chars):**
- Appears above the description — first text users read on the product page
- Can be changed anytime WITHOUT an app update (unlike all other metadata)
- Use for: feature announcements, social proof, seasonal campaigns, limited offers
- Rotate monthly for freshness. Not indexed for search but directly impacts conversion.

**What's New:**
- Shown to existing users in the Updates tab — drives re-engagement
- Write user-facing changes, not internal changelog
- Highlight the most exciting improvement first

## RATINGS & REVIEWS STRATEGY
- Below 4.0★: conversion drops up to 50%. Below 3.5★: serious ranking penalty.
- 4.5★+: optimal for both conversion and algorithm trust.
- Review volume signals app quality: 1,000+ for social proof, 10,000+ for strong signal.
- Ask for ratings after positive in-app experiences. Never after: errors, crashes, purchases, onboarding.
- iOS: SKStoreReviewController — 3 prompts max per device per 365 days.
- Android: In-App Review API — use soft pre-prompt ("Enjoying the app?") to filter sentiment first.
- Respond to negative reviews within 24-48 hours, always professional.

## PREVIEW VIDEO
iOS: 15-30s, H.264, loops silently, real app footage only. No people outside device.
Android: YouTube URL, 30s-2min, landscape preferred.
Structure: Hook (0-3s, core outcome) → Feature 1 (3-10s) → Feature 2 (10-18s) → Feature 3 (18-25s) → CTA (25-30s).
The first 3 seconds determine whether users watch or scroll. Show the core outcome immediately.

## A/B TESTING
- Apple PPO: up to 3 treatments against original (screenshot order, caption copy, visual styles)
- Google Play Store Listing Experiments: 7+ days with 50%+ traffic for statistical significance

## LOCALIZATION
Tier 1 (full: new screenshots + translated captions + local keyword research): Japanese, Korean, Chinese (Simplified)
Tier 2 (translated captions, same screenshots, local keywords): German, French, Spanish, Portuguese (BR)
Tier 3: English defaults
- Translate ALL visible text. Research local ASO keywords per market — direct translations miss local search terms.

## OUTPUT REQUIREMENTS
You MUST return valid JSON. Every field must be:
- SPECIFIC to THIS app (reference actual features, brand, category)
- ACTIONABLE (provide actual copy a developer could implement, not vague advice)
- Within character limits (title ≤30 on BOTH platforms, subtitle ≤30, short desc ≤80, promo text ≤170)
- BENEFIT-FOCUSED (user outcomes, not technical capabilities)
- GROUNDED (reference what you actually observe in the listing data)

For description copy: write actual paragraphs a developer could paste — no templates with brackets.
For title/subtitle: every suggestion MUST respect the platform character limit.
For keyword field: suggest actual single keywords, comma-separated, that complement the title/subtitle.`;

const VISUAL_SYSTEM_PROMPT = `You are a senior App Store Optimization (ASO) visual analyst specializing in screenshot galleries, app icons, and feature graphics. You have deep expertise in conversion rate optimization for app store visuals.

Your job is to analyze the actual images provided and give specific feedback on what you SEE, not generic advice.

## SCREENSHOT STRATEGY

### The First 3 Rule
80% of App Store impressions show only the first 3 screenshots. Users spend ~7 seconds on an app page. ~65% of downloads happen immediately after search. The first 3 must be a complete elevator pitch:
1. What is it? — Core value proposition
2. What does it do? — Best feature/outcome
3. Why do I need it? — Differentiator from competitors

### Gallery Order Strategy (positions 1-10)
| Position | Content | Purpose |
|----------|---------|---------|
| 1 | Hero — Core Value Proposition | Stop the scroll, answer "what is this app?" |
| 2 | Key Differentiator | What makes you unique vs competitors |
| 3 | Most Popular Feature | The thing users love most |
| 4 | Social Proof / Outcome | Ratings, results, testimonials |
| 5-6 | Additional Features | Supporting features, integrations |
| 7-8 | Secondary Value | Settings, customization, advanced features |
| 9-10 | Edge Cases / CTA | Specialized features, download prompt |

Upload 6-8 screenshots minimum. All 10 (iOS) / 8 (Android) only if each adds distinct value.

### Caption Writing Rules
- 2-5 words per caption (readable at thumbnail size)
- BENEFIT-focused, not feature-focused
- 40pt+ bold sans-serif font (SF Pro, Helvetica, Inter)
- Keyword-aware — distribute ASO keywords across captions
- **CRITICAL: NEVER repeat the same primary keyword across multiple captions.** Each caption must target a DIFFERENT high-value keyword. If the app's USP is "curation", use "curated" in ONE caption only — then use different angles (e.g., "DJ-picked", "premium radio", "exclusive channels") for the rest. Repeating the same word wastes OCR keyword slots and signals lazy copy.
- Aim for 5-10 unique keywords spread across the full gallery

Bad → Good examples:
- "Push Notification System" → "Never Miss a Deadline"
- "Calendar View with Filters" → "See Your Week at a Glance"
- "Data Export Functionality" → "Share Reports in One Tap"
- "Audio Player Interface" → "Stream Music Anytime"
- "Settings and Preferences" → "Personalize Your Sound"
- "Easy to Use" (zero search volume) → "Track Daily Habits" (keyword-rich)
- BAD gallery: "Curated Playlists" / "Curated Channels" / "Curated Radio" (repeats "curated" 3x — wastes 2 keyword slots)
- GOOD gallery: "90+ Electronic Channels" / "Hand-Picked by Real DJs" / "Premium Radio, Zero Algorithms" (3 different keyword angles)

### Screenshot Styles (7 types — identify which each screenshot uses)
1. **Device Frame with Caption** — 96% of top apps. Device mockup + benefit caption. Default.
2. **Full-Bleed UI** — App fills screenshot. Best for immersive apps (games, media).
3. **Lifestyle Context** — Device in real-world context (person holding phone).
4. **Feature Highlight with Callouts** — UI with arrows/circles. Max 1-2 callouts.
5. **Before/After Comparison** — Split-screen transformation.
6. **Panoramic / Continuous Scroll** — Screenshots visually connect across gallery.
7. **Story Flow (Three-Act Structure)** — Hook → Flow → Trust narrative.

### Apple OCR (Major 2025-2026 Algorithm Shift)
Apple uses OCR to extract and index text from screenshot captions as ranking signals. Screenshots are now a secondary keyword field.

OCR Optimization:
- Bold sans-serif typography, high contrast (dark on light or white on dark)
- 40pt+ minimum for reliable extraction
- Map 5-10 ASO keywords to individual captions
- First 3 screenshots carry heaviest indexing weight
- Align caption keywords with title + subtitle
- Semantic clustering: ranking for a keyword gains visibility for related terms

### Conversion Psychology
- Processing fluency: high-contrast text on clean backgrounds → faster processing → higher download
- Emotional triggers: outcome-focused ("Sleep Better Tonight") outperforms technical ("Sleep Tracking")
- Specificity: "Save 2 Hours Every Week" outperforms "Calendar Integration"
- iOS users: respond to lifestyle imagery, emotional triggers, minimalist design
- Android users: more feature-oriented. Promotional text under 20% of image area.

### Apple Custom Product Pages (CPPs)
Up to 70 CPPs per app, each with unique screenshots per keyword cluster.
- Average 8.6% conversion lift, up to 60% CPA reduction
- Map high-intent keyword clusters to dedicated CPPs
- Align CPP captions with target keywords for OCR

### Google Play Custom Store Listings
Android equivalent to CPPs — multiple store listings per app:
- Country-specific listings with localized screenshots and descriptions
- Custom listings for paid campaign landing pages
- Each listing can have different screenshots, short description, and full description

### Google Play Feature Graphic (1024 x 500 px)
Required for Google Play featuring. Appears at top of store listing.
- Must clearly communicate what the app does
- No excessive text — focus on visual storytelling
- Don't duplicate screenshot content — use as hero banner
- Avoid small text (unreadable on mobile)
- Keep important content centered (edges may crop)

### Google Play Content Policy Compliance
- No fake badges/awards. No direct competitor comparisons by name.
- Promotional text under 20% of screenshot area. No misleading imagery.

### Common Screenshot Mistakes (flag any found)
1. Settings, onboarding, or login screens
2. Too much text (stick to 2-5 word captions)
3. Wrong dimensions
4. All screenshots look the same
5. Feature-focused captions instead of benefit-focused
6. Generic captions with zero search volume ("Easy to Use")
7. Decorative or script fonts instead of bold sans-serif
8. Outdated device frames (should be iPhone 16 Pro, Pixel 9)
9. Outdated UI
10. No strong hero screenshot in slot 1
11. Same screenshots for iOS and Android
12. Empty states or placeholder data

### Screenshot Analysis — CRITICAL INSTRUCTIONS
For EACH screenshot image I provide, you MUST:
1. Describe what the screenshot actually shows (UI content, features visible)
2. Read and transcribe the EXACT caption text visible on the screenshot (or say "none" if no caption)
3. Evaluate the caption: Is it benefit-focused? Keyword-rich? Readable at thumbnail?
4. Identify the screenshot style (device-frame, full-bleed, etc.)
5. List specific issues with this screenshot
6. Suggest a better caption (2-5 words, benefit-focused, keyword-aware)

DO NOT make up captions that aren't visible. Report exactly what you SEE on each image.

**SELF-CHECK BEFORE RESPONDING:** Review ALL your suggested captions together. If any two share the same primary keyword, revise one to use a different keyword angle. Each caption = unique keyword opportunity.

## ICON ANALYSIS
The icon is the single most important visual element — must be recognizable at 60x60px.
Evaluate: simplicity, recognizability at small sizes, color contrast against white/dark backgrounds, brand alignment, uniqueness within category, whether it communicates app purpose, visual weight and balance.

### Design Specs (2026)
iOS: iPhone 6.9" = 1320x2868, 6.7" = 1290x2796, 5.5" = 1242x2208, iPad 13" = 2064x2752. Up to 10 per localization.
Android: 1080x1920 (standard), 1440x2560 (high-res). Feature graphic 1024x500. Max 8. PNG/JPEG, 8MB max.

## OUTPUT REQUIREMENTS
You MUST return valid JSON. Every assessment must be:
- SPECIFIC to what you actually SEE in the images (reference visible UI, text, colors, layouts)
- ACTIONABLE (suggest specific improvements a designer could implement)
- GROUNDED (never describe something you can't see — say "not visible" or "cannot determine")
- For captions: write actual 2-5 word captions a designer could implement immediately`;

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

async function downloadImageAsBase64(
  url: string,
  timeoutMs = 8000,
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      },
    });
    if (!resp.ok) {
      console.log(`Image download: HTTP ${resp.status} for ${url.substring(0, 80)}...`);
      return null;
    }
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const buffer = await resp.arrayBuffer();
    const sizeMB = (buffer.byteLength / 1_000_000).toFixed(2);
    if (buffer.byteLength > 5_000_000) {
      console.log(`Image download: Skipped ${sizeMB}MB image (over 5MB cap): ${url.substring(0, 80)}...`);
      return null;
    }
    const base64 = Buffer.from(buffer).toString("base64");
    return { data: base64, mimeType: contentType.split(";")[0] };
  } catch (err) {
    console.log(`Image download: Failed for ${url.substring(0, 80)}... — ${err instanceof Error ? err.message : "unknown error"}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Text analysis prompt — metadata only, no images
// ---------------------------------------------------------------------------

function buildTextPrompt(data: AppData): string {
  const isIOS = data.platform === "ios";
  const titleMax = 30;

  let p = `Analyze this ${isIOS ? "iOS App Store" : "Google Play"} listing metadata comprehensively.\n\n`;
  p += `**IMPORTANT: This is a ${isIOS ? "iOS" : "Android"} app. The title character limit is 30 characters on BOTH platforms. All title suggestions MUST be ≤30 chars.**\n\n`;

  p += `## METADATA\n`;
  p += `**Title:** "${data.title}" (${data.title.length}/30 chars)\n`;
  if (isIOS && data.subtitle) p += `**Subtitle:** "${data.subtitle}" (${data.subtitle.length}/30 chars)\n`;
  else if (isIOS) p += `**Subtitle:** (not set — empty)\n`;
  if (!isIOS && data.shortDescription) p += `**Short description:** "${data.shortDescription}" (${data.shortDescription.length}/80 chars)\n`;
  else if (!isIOS) p += `**Short description:** (not set or empty)\n`;
  if (isIOS && data.promotionalText) p += `**Promotional text:** "${data.promotionalText}" (${data.promotionalText.length}/170 chars)\n`;
  else if (isIOS) p += `**Promotional text:** (not set)\n`;
  p += `**Developer:** ${data.developerName}\n`;
  p += `**Category:** ${data.category}\n`;
  p += `**Rating:** ${data.rating > 0 ? `${data.rating.toFixed(1)}★ (${data.ratingsCount.toLocaleString()} ratings)` : "No rating yet"}\n`;
  p += `**Price:** ${data.price}\n`;
  if (data.installs) p += `**Installs:** ${data.installs}\n`;
  if (data.version) p += `**Version:** ${data.version}\n`;
  if (data.lastUpdated) p += `**Last updated:** ${data.lastUpdated}\n`;
  if (data.size) p += `**Size:** ${data.size}\n`;
  if (data.contentRating) p += `**Content rating:** ${data.contentRating}\n`;
  p += `**Screenshots uploaded:** ${data.screenshotCount}\n`;
  p += `**Preview video:** ${data.hasVideo ? "Yes" : "No"}\n\n`;

  p += `## FULL DESCRIPTION\n${data.description.substring(0, 3500)}\n\n`;

  if (data.whatsNew) {
    p += `## WHAT'S NEW (latest release notes)\n${data.whatsNew.substring(0, 500)}\n\n`;
  }

  p += `## CRITICAL KEYWORD RULES FOR ALL SUGGESTIONS\n`;
  p += `- NEVER repeat the same word within a single title suggestion (e.g., "Rock Radio - Hard Rock" repeats "Rock" — this wastes 5 of your 30 characters on a word the algorithm already saw)\n`;
  p += `- Each unique word is only indexed ONCE — repeating it provides zero additional ranking benefit and wastes character budget\n`;
  p += `- Maximize unique keyword coverage: every word in every suggestion should be a DISTINCT ranking term\n`;
  if (isIOS) {
    p += `- On iOS, title + subtitle + keyword field are combined for indexing. A word in the title is AUTOMATICALLY indexed from the subtitle and keyword field too — never repeat across fields\n`;
    p += `- Think of title (30ch) + subtitle (30ch) as a SINGLE 60-character keyword strategy split across two fields. Design them AS A PAIR.\n`;
  } else {
    p += `- On Android, title (30ch) + short description (80ch) are the two most indexed and most visible fields — they appear TOGETHER in search results\n`;
    p += `- Think of them as a PAIR: title = highest-value keyword(s); short description = front-load a DIFFERENT primary keyword in the first 3 words, then expand to complementary keywords AND a compelling conversion pitch\n`;
    p += `- Repeating title keywords in the short description is wasteful — Google already has them from the title. Use the 80ch to cover new keyword territory\n`;
  }
  p += `\n`;

  p += `Return JSON matching this exact structure:\n{\n`;
  p += `  "title": {\n`;
  p += `    "issues": ["specific issue — title limit is 30 chars on BOTH iOS and Android"],\n`;
  p += `    "suggestions": ["Title Option 1 (MUST be ≤${titleMax} chars, ZERO repeated words)", "Title Option 2 (≤${titleMax}ch)", "Title Option 3 (≤${titleMax}ch)"],\n`;
  p += `    "reasoning": "Why these changes improve ranking and conversion",\n`;
  p += `    "priority": "high | medium | low — high if title is missing key ranking terms, wastes >20% of the 30-char budget, or brand-only; medium if functional but keyword selection can be improved; low if well-optimized and near full usage"\n`;
  p += `  },\n`;

  if (isIOS) {
    p += `  "subtitle": {\n`;
    p += `    "issues": ["specific issue"],\n`;
    p += `    "suggestions": ["Subtitle Option 1 (≤30ch)", "Subtitle Option 2"],\n`;
    p += `    "reasoning": "Why — zero overlap with title",\n`;
    p += `    "priority": "high | medium | low — high if empty, heavily duplicates title, or wastes >40% of 30 chars; medium if underusing or weak keywords; low if well-optimized"\n`;
    p += `  },\n`;

    p += `  "titleSubtitlePairs": {\n`;
    p += `    "pairs": [\n`;
    p += `      {\n`;
    p += `        "title": "Title option (≤30ch, NO repeated words within it)",\n`;
    p += `        "subtitle": "Matching subtitle (≤30ch, ZERO word overlap with the title above)",\n`;
    p += `        "keywordsCovered": ["list", "every", "unique", "keyword", "across", "both", "fields"],\n`;
    p += `        "reasoning": "Why this pair maximizes the 60-char keyword budget"\n`;
    p += `      },\n`;
    p += `      {\n`;
    p += `        "title": "Alternative title (≤30ch)",\n`;
    p += `        "subtitle": "Matching subtitle for this title (≤30ch, zero overlap)",\n`;
    p += `        "keywordsCovered": ["different", "keyword", "set"],\n`;
    p += `        "reasoning": "Why this pair works — different keyword strategy"\n`;
    p += `      },\n`;
    p += `      {\n`;
    p += `        "title": "Third option (≤30ch)",\n`;
    p += `        "subtitle": "Matching subtitle (≤30ch, zero overlap)",\n`;
    p += `        "keywordsCovered": ["keywords"],\n`;
    p += `        "reasoning": "Reasoning"\n`;
    p += `      }\n`;
    p += `    ],\n`;
    p += `    "keywordStrategy": "Explain the overall keyword distribution strategy across title+subtitle. How many unique ranking terms does each pair cover? Which high-volume terms are prioritized in the title (heavier weight) vs subtitle?",\n`;
    p += `    "priority": "high | medium | low — combined priority for the title+subtitle pair as a unit"\n`;
    p += `  },\n`;

    p += `  "keywordField": {\n`;
    p += `    "suggestedKeywords": ["keyword1", "keyword2", "...up to 20 single words that complement title+subtitle — NONE of which appear in your title or subtitle suggestions above"],\n`;
    p += `    "avoidKeywords": ["word already in title/subtitle", "plural form", "category name"],\n`;
    p += `    "reasoning": "Strategy: these keywords fill gaps left by the title+subtitle pair"\n`;
    p += `  },\n`;
    p += `  "promotionalText": {\n`;
    p += `    "suggestions": ["Promotional text option 1 (≤170ch)", "Option 2 (≤170ch)"],\n`;
    p += `    "reasoning": "Why these drive conversion"\n`;
    p += `  },\n`;
  } else {
    p += `  "shortDescription": {\n`;
    p += `    "issues": ["specific issue"],\n`;
    p += `    "suggestions": ["Short desc option 1 (≤80ch)", "Option 2 (≤80ch)"],\n`;
    p += `    "reasoning": "Why — front-load primary keyword",\n`;
    p += `    "priority": "high | medium | low — high if empty, <40 chars, or missing primary keyword in first 3 words; medium if functional but not using full 80 chars or keywords are weak; low if strong"\n`;
    p += `  },\n`;

    p += `  "titleShortDescPairs": {\n`;
    p += `    "pairs": [\n`;
    p += `      {\n`;
    p += `        "title": "Title option (≤30ch, NO repeated words within it)",\n`;
    p += `        "shortDescription": "Paired short description (≤80ch). Front-load a DIFFERENT primary keyword from the title in the FIRST 3 WORDS. Cover fresh keyword territory. End with a compelling conversion pitch. ZERO words repeated from the paired title.",\n`;
    p += `        "keywordsCovered": ["list", "every", "unique", "keyword", "across", "BOTH", "fields"],\n`;
    p += `        "strategy": "keyword-first | benefit-first | social-proof",\n`;
    p += `        "reasoning": "Why this pair maximizes indexed coverage — which terms go in title (most weight) vs short description, and how the short desc also converts browsers into installers"\n`;
    p += `      },\n`;
    p += `      {\n`;
    p += `        "title": "Alternative title (≤30ch, NO repeated words)",\n`;
    p += `        "shortDescription": "Paired short description (≤80ch, front-loads different keyword, zero title overlap)",\n`;
    p += `        "keywordsCovered": ["different", "keyword", "set"],\n`;
    p += `        "strategy": "keyword-first | benefit-first | social-proof",\n`;
    p += `        "reasoning": "Why this pair — different keyword strategy from pair 1"\n`;
    p += `      },\n`;
    p += `      {\n`;
    p += `        "title": "Third title option (≤30ch)",\n`;
    p += `        "shortDescription": "Third short description (≤80ch, zero title overlap)",\n`;
    p += `        "keywordsCovered": ["keywords"],\n`;
    p += `        "strategy": "keyword-first | benefit-first | social-proof",\n`;
    p += `        "reasoning": "Reasoning"\n`;
    p += `      }\n`;
    p += `    ],\n`;
    p += `    "keywordStrategy": "Explain the overall keyword distribution strategy. Which high-value terms anchor each title? How does each paired short description expand coverage with complementary terms AND maintain conversion appeal? How many total unique ranking terms does each pair cover?",\n`;
    p += `    "priority": "high | medium | low — combined priority for the title+short description pair as a unit"\n`;
    p += `  },\n`;
  }

  p += `  "description": {\n`;
  p += `    "fullRewrite": "A COMPLETE, READY-TO-PASTE rewritten description for THIS app (${isIOS ? "1,000-4,000" : "2,500-4,000"} chars). Include: compelling opening hook, feature bullets with benefits, social proof, and CTA. Use real app features from the description above. ${!isIOS ? "Front-load primary keywords and use them 3-5x naturally." : ""} No brackets, no placeholders, no [insert here] — write the actual final copy.",\n`;
  p += `    "openingHook": "Just the opening 2-3 sentences extracted from the fullRewrite above (for separate display).",\n`;
  p += `    "featureBullets": ["• Benefit-focused bullet 1", "• Bullet 2", "...5-8 bullets extracted from the fullRewrite"],\n`;
  p += `    "cta": "Just the closing CTA paragraph extracted from the fullRewrite",\n`;
  p += `    "keywordGaps": ["keyword not found in current description that should be added"],\n`;
  p += `    "structureIssues": ["specific structural problem observed in the CURRENT description"],\n`;
  p += `    "priority": "high | medium | low — high if structurally poor (no bullets, weak hook, no CTA)${!isIOS ? " or severely keyword-thin" : ""}; medium if restructuring and hook improvements would help; low if solid structure and good copy"\n`;

  if (!isIOS) {
    p += `    ,"keywordDensity": [\n`;
    p += `      { "keyword": "primary keyword", "currentCount": 2, "recommendedCount": 5 },\n`;
    p += `      { "keyword": "secondary keyword", "currentCount": 0, "recommendedCount": 3 }\n`;
    p += `    ]\n`;
  }

  p += `  },\n`;

  p += `  "ratings": {\n`;
  p += `    "assessment": "Rating health assessment in context of category and install count",\n`;
  p += `    "promptStrategy": "When to trigger review prompts for THIS app (reference specific features/moments)",\n`;
  p += `    "suggestions": ["specific suggestion 1", "suggestion 2"]\n`;
  p += `  },\n`;

  if (data.whatsNew) {
    p += `  "whatsNew": {\n`;
    p += `    "assessment": "Assessment of current What's New / release notes quality",\n`;
    p += `    "suggestions": ["Rewritten What's New copy option 1", "Option 2"]\n`;
    p += `  },\n`;
  }

  p += `  "abTesting": {\n`;
  p += `    "priority": "high | medium | low",\n`;
  p += `    "experiments": [\n`;
  p += `      {\n`;
  p += `        "name": "Name of the experiment",\n`;
  p += `        "hypothesis": "If we change X, then Y will improve because Z",\n`;
  p += `        "variants": ["Control: current state", "Variant A: specific change", "Variant B: specific change"],\n`;
  p += `        "metric": "Primary metric to track"\n`;
  p += `      }\n`;
  p += `    ]\n`;
  p += `  },\n`;

  p += `  "maintenance": {\n`;
  p += `    "assessment": "How fresh/stale the app looks based on last update, version, and what's new text",\n`;
  p += `    "seasonalOpportunities": ["Upcoming seasonal opportunity relevant to THIS app"],\n`;
  p += `    "suggestions": ["specific suggestion"]\n`;
  p += `  },\n`;

  p += `  "localization": {\n`;
  p += `    "priority": "high | medium | low",\n`;
  p += `    "tier1Markets": ["market1", "market2"],\n`;
  p += `    "tier2Markets": ["market1", "market2"],\n`;
  p += `    "reasoning": "Why these specific markets for THIS app's category"\n`;
  p += `  },\n`;

  p += `  "video": {\n`;
  p += `    "assessment": "${data.hasVideo ? "Assessment of having a video — is it effective?" : "No video detected — explain why this app should invest in one"}",\n`;
  p += `    "storyboard": [\n`;
  p += `      { "segment": "Hook", "duration": "0-3s", "content": "Specific content for THIS app" },\n`;
  p += `      { "segment": "Feature 1", "duration": "3-10s", "content": "Specific feature from the description" },\n`;
  p += `      { "segment": "Feature 2", "duration": "10-18s", "content": "Specific feature" },\n`;
  p += `      { "segment": "Feature 3", "duration": "18-25s", "content": "Specific feature or social proof" },\n`;
  p += `      { "segment": "CTA", "duration": "25-30s", "content": "End screen description" }\n`;
  p += `    ]\n`;
  p += `  },\n`;

  p += `  "topInsights": [\n`;
  p += `    "Most impactful insight 1",\n`;
  p += `    "Insight 2",\n`;
  p += `    "Insight 3 — up to 5 strategic priorities"\n`;
  p += `  ]\n`;
  p += `}`;

  return p;
}

// ---------------------------------------------------------------------------
// Visual analysis prompt — images + app context for grounding
// ---------------------------------------------------------------------------

function buildVisualPrompt(data: AppData): string {
  const isIOS = data.platform === "ios";
  const screenshotMax = isIOS ? 10 : 8;
  const imgCount = Math.min(data.screenshots?.length || 0, 8);

  let p = `Analyze the visual assets for this ${isIOS ? "iOS App Store" : "Google Play"} listing.\n\n`;

  p += `## APP CONTEXT (for grounding your visual analysis)\n`;
  p += `**App:** ${data.title}\n`;
  p += `**Developer:** ${data.developerName}\n`;
  p += `**Category:** ${data.category}\n`;
  p += `**Platform:** ${isIOS ? "iOS" : "Android"}\n`;
  p += `**Screenshots uploaded:** ${data.screenshotCount} / ${screenshotMax} slots\n\n`;

  const descSnippet = data.description.substring(0, 800).replace(/\n{2,}/g, "\n");
  p += `## APP FEATURES (from description — use to identify what screenshots show)\n${descSnippet}\n\n`;

  if (data.iconUrl) p += `I'm providing the app icon image for analysis.\n`;
  if (!isIOS && data.featureGraphicUrl) p += `I'm providing the Google Play feature graphic (1024x500) for analysis.\n`;
  if (imgCount > 0) {
    p += `I'm providing ${imgCount} screenshot images. For EACH one:\n`;
    p += `1. Describe what the screenshot actually shows\n`;
    p += `2. Read and transcribe the EXACT caption text visible on the image (or "none")\n`;
    p += `3. Evaluate caption quality: benefit-focused? keyword-rich? readable at thumbnail?\n`;
    p += `4. Identify the style (device-frame, full-bleed, lifestyle, etc.)\n`;
    p += `5. List specific issues\n`;
    p += `6. Suggest a better 2-5 word benefit-focused caption\n\n`;
    p += `**CAPTION DIVERSITY RULE:** Each captionSuggestion MUST use a DIFFERENT primary keyword. Never repeat the same primary word (e.g., "curated", "discover", "stream") across multiple captions. Spread 5-10 unique ASO keywords across the full gallery. If you catch yourself repeating a word, rephrase with a synonym or different angle.\n\n`;
  }

  p += `Return JSON matching this exact structure:\n{\n`;

  p += `  "icon": {\n`;
  p += `    "assessment": "What the icon shows, whether it communicates app purpose, readability at small size, color analysis",\n`;
  p += `    "issues": ["specific issue observed"],\n`;
  p += `    "suggestions": ["specific improvement"],\n`;
  p += `    "priority": "high | medium | low — high if icon fails to communicate app purpose, poor small-size readability, or generic design; medium if functional but not distinctive; low if strong and memorable"\n`;
  p += `  },\n`;

  if (!isIOS) {
    p += `  "featureGraphic": {\n`;
    p += `    "assessment": "${data.featureGraphicUrl ? "Describe what the feature graphic shows. Does it communicate what the app does? Is text readable on mobile?" : "No feature graphic detected — required for Google Play featuring"}",\n`;
    p += `    "issues": ["specific issue"],\n`;
    p += `    "suggestions": ["specific improvement for the 1024x500 graphic"]\n`;
    p += `  },\n`;
  }

  p += `  "screenshots": {\n`;
  p += `    "overallAssessment": "2-3 sentence assessment of gallery quality, story coherence, and conversion effectiveness",\n`;
  p += `    "galleryCoherence": 7,\n`;
  p += `    "firstThreeVerdict": "Do the first 3 screenshots form a complete elevator pitch? What/How/Why assessment.",\n`;
  p += `    "perScreenshot": [\n`;
  for (let i = 1; i <= imgCount; i++) {
    p += `      {\n`;
    p += `        "slot": ${i},\n`;
    p += `        "whatItShows": "Describe what screenshot ${i} actually displays",\n`;
    p += `        "captionVisible": "EXACT text you can read on the screenshot, or 'none'",\n`;
    p += `        "captionQuality": "Is it benefit-focused? Keyword-rich? Readable? Specific assessment.",\n`;
    p += `        "captionSuggestion": "Better 2-5 Word Caption",\n`;
    p += `        "style": "device-frame-with-caption | full-bleed | lifestyle | feature-highlight | before-after | panoramic | story-flow",\n`;
    p += `        "issues": ["specific issue with this screenshot"]\n`;
    p += `      }${i < imgCount ? "," : ""}\n`;
  }
  p += `    ],\n`;

  const startSlot = imgCount + 1;
  const endSlot = Math.min(imgCount + 4, screenshotMax);
  const missingCount = endSlot - startSlot + 1;
  p += `    "missingSlots": [\n`;
  if (missingCount > 0) {
    p += `      // You MUST provide exactly ${missingCount} missing slot entries (slots ${startSlot}-${endSlot}).\n`;
    p += `      // Only suggest features confirmed in the description. Add "(if available)" for uncertain features.\n`;
  }
  for (let i = startSlot; i <= endSlot; i++) {
    p += `      {\n`;
    p += `        "slot": ${i},\n`;
    p += `        "whatToShow": "What this new screenshot should display — add '(if available)' for features not confirmed in description",\n`;
    p += `        "captionSuggestion": "2-5 Word Caption",\n`;
    p += `        "recommendedStyle": "device-frame-with-caption"\n`;
    p += `      }${i < endSlot ? "," : ""}\n`;
  }
  p += `    ],\n`;

  p += `    "commonMistakesFound": ["List any of the 12 common screenshot mistakes you observe in these actual screenshots"],\n`;
  p += `    "priority": "high | medium | low — high if gallery has serious issues (poor first-3 story, generic/feature-only captions, outdated frames, or messaging misaligned with app); medium if functional gallery with clear optimization opportunities; low if strong gallery with good keyword-rich captions"`;

  if (isIOS) {
    p += `,\n    "cppStrategy": {\n`;
    p += `      "shouldUseCPPs": true,\n`;
    p += `      "keywordClusters": ["cluster 1 keywords", "cluster 2 keywords"],\n`;
    p += `      "reasoning": "Why CPPs would help THIS app"\n`;
    p += `    }\n`;
  } else {
    p += `,\n    "customStoreListings": {\n`;
    p += `      "shouldUse": true,\n`;
    p += `      "listingIdeas": ["Country/segment-specific listing idea 1", "Listing idea 2"],\n`;
    p += `      "reasoning": "Why custom store listings would help THIS app"\n`;
    p += `    }\n`;
  }

  p += `  }\n`;

  p += `}`;

  return p;
}

// ---------------------------------------------------------------------------
// Gemini API call helper
// ---------------------------------------------------------------------------

interface GeminiCallOptions {
  systemPrompt: string;
  parts: Record<string, unknown>[];
  maxOutputTokens: number;
  timeoutMs: number;
  label: string;
  modelUrl?: string;
}

async function callGemini(apiKey: string, opts: GeminiCallOptions & { throwOnError?: boolean }): Promise<Record<string, unknown> | null> {
  const t0 = Date.now();
  const url = opts.modelUrl || GEMINI_URL;

  const body = {
    system_instruction: { parts: [{ text: opts.systemPrompt }] },
    contents: [{ parts: opts.parts }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
      maxOutputTokens: opts.maxOutputTokens,
    },
  };

  const bodyJson = JSON.stringify(body);
  console.log(`AI [${opts.label}]: Request body ${(bodyJson.length / 1_000_000).toFixed(2)}MB, sending to ${url.includes("lite") ? "LITE" : "PRIMARY"}...`);

  const fail = (msg: string) => {
    if (opts.throwOnError) throw new Error(msg);
    return null;
  };

  try {
    const resp = await fetch(`${url}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyJson,
      signal: AbortSignal.timeout(opts.timeoutMs),
    });

    const elapsed = Date.now() - t0;

    if (!resp.ok) {
      const err = await resp.text();
      const short = err.substring(0, 300);
      console.error(`AI [${opts.label}]: Gemini ${resp.status} after ${elapsed}ms:`, short);
      return fail(`Gemini API returned ${resp.status} after ${elapsed}ms: ${short}`);
    }

    const result = await resp.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const finishReason = result?.candidates?.[0]?.finishReason;
      const safetyRatings = result?.candidates?.[0]?.safetyRatings;
      console.error(`AI [${opts.label}]: No text after ${elapsed}ms. finishReason=${finishReason}`, JSON.stringify(safetyRatings));
      return fail(`Gemini returned no text (finishReason=${finishReason})`);
    }

    const finishReason = result?.candidates?.[0]?.finishReason;
    console.log(`AI [${opts.label}]: ${text.length} chars in ${elapsed}ms, finishReason=${finishReason}`);

    if (finishReason === "MAX_TOKENS") {
      console.warn(`AI [${opts.label}]: Output was TRUNCATED — response likely incomplete`);
    }

    return JSON.parse(text);
  } catch (error) {
    const elapsed = Date.now() - t0;
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`AI [${opts.label}]: Failed after ${elapsed}ms:`, msg);
    if (opts.throwOnError) throw error;
    return null;
  }
}

async function callGeminiWithFallback(
  apiKey: string,
  opts: GeminiCallOptions & { throwOnError?: boolean },
): Promise<Record<string, unknown> | null> {
  const wallStart = Date.now();
  let primaryError = "returned null (empty response)";
  let liteError = "returned null (empty response)";

  // Attempt 1: primary model — cap at 65s to always preserve budget for lite fallback.
  // (Vercel maxDuration=120s; 65s primary + 45s lite = 110s worst case, leaving 10s headroom)
  const primaryTimeout = Math.min(opts.timeoutMs, 65_000);
  try {
    const result = await callGemini(apiKey, { ...opts, timeoutMs: primaryTimeout });
    if (result) return result;
  } catch (err) {
    primaryError = err instanceof Error ? err.message : String(err);
  }

  // Attempt 2: lite model — fixed 45s budget so primary+lite never exceeds ~110s total
  const elapsed = Date.now() - wallStart;
  console.log(`AI [${opts.label}]: Primary failed after ${elapsed}ms (${primaryError.substring(0, 120)}), retrying with LITE model...`);
  try {
    const result = await callGemini(apiKey, {
      ...opts,
      modelUrl: GEMINI_URL_LITE,
      label: `${opts.label}-LITE`,
      timeoutMs: 45_000,
      throwOnError: false,
    });
    if (result) {
      console.log(`AI [${opts.label}-LITE]: Fallback succeeded after ${Date.now() - wallStart}ms total`);
      return result;
    }
  } catch (err) {
    liteError = err instanceof Error ? err.message : String(err);
  }

  const fullMsg = `AI analysis failed on both models — Primary (${GEMINI_MODEL}): ${primaryError.substring(0, 200)} | Lite (${GEMINI_MODEL_LITE}): ${liteError.substring(0, 200)}`;
  console.error(`AI [${opts.label}]: ${fullMsg}`);
  if (opts.throwOnError) throw new Error(fullMsg);
  return null;
}

// ---------------------------------------------------------------------------
// Main entry point — two parallel calls, merged result
// ---------------------------------------------------------------------------

export async function analyzeWithAI(appData: AppData): Promise<AIAnalysis | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("AI analysis skipped: no GEMINI_API_KEY");
    return null;
  }

  const t0 = Date.now();

  // ── Text analysis call (no images, fast) ──────────────────────────
  const textCall = callGeminiWithFallback(apiKey, {
    systemPrompt: TEXT_SYSTEM_PROMPT,
    parts: [{ text: buildTextPrompt(appData) }],
    maxOutputTokens: 8192,
    timeoutMs: 40000,
    label: "TEXT",
  });

  // ── Visual analysis call (with images, slower) ────────────────────
  const visualParts: Record<string, unknown>[] = [
    { text: buildVisualPrompt(appData) },
  ];

  const imageUrls: { url: string; label: string }[] = [];
  if (appData.iconUrl) {
    imageUrls.push({ url: appData.iconUrl, label: "App icon:" });
  }
  if (appData.featureGraphicUrl) {
    imageUrls.push({ url: appData.featureGraphicUrl, label: "Google Play feature graphic (1024x500):" });
  }
  const screenshotUrls = (appData.screenshots || []).slice(0, 8);
  for (let i = 0; i < screenshotUrls.length; i++) {
    imageUrls.push({ url: screenshotUrls[i], label: `Screenshot ${i + 1} of ${screenshotUrls.length}:` });
  }

  let totalImageBytes = 0;
  const MAX_TOTAL_IMAGE_BYTES = 12_000_000;
  let attachedCount = 0;

  if (imageUrls.length > 0) {
    const downloads = await Promise.all(
      imageUrls.map(({ url }) => downloadImageAsBase64(url)),
    );

    const imgTime = Date.now() - t0;
    let skipped = 0;

    for (let i = 0; i < downloads.length; i++) {
      const img = downloads[i];
      if (img) {
        const imgBytes = img.data.length * 0.75;
        if (totalImageBytes + imgBytes > MAX_TOTAL_IMAGE_BYTES) {
          console.log(`AI [VISUAL]: Skipping ${imageUrls[i].label} — would exceed ${MAX_TOTAL_IMAGE_BYTES / 1_000_000}MB cap`);
          skipped++;
          continue;
        }
        totalImageBytes += imgBytes;
        visualParts.push({ text: imageUrls[i].label });
        visualParts.push({
          inlineData: { mimeType: img.mimeType, data: img.data },
        });
        attachedCount++;
      } else {
        console.log(`AI [VISUAL]: Failed to download ${imageUrls[i].label}`);
        skipped++;
      }
    }

    console.log(`AI [VISUAL]: ${attachedCount} images attached, ${skipped} skipped, ${(totalImageBytes / 1_000_000).toFixed(1)}MB total, download took ${imgTime}ms`);
  } else {
    console.log("AI [VISUAL]: No image URLs available — skipping visual call");
  }

  const visualCall = attachedCount > 0
    ? callGeminiWithFallback(apiKey, {
        systemPrompt: VISUAL_SYSTEM_PROMPT,
        parts: visualParts,
        maxOutputTokens: 12288,
        timeoutMs: 90000,
        label: "VISUAL",
      })
    : Promise.resolve(null);

  // ── Run both in parallel ──────────────────────────────────────────
  const [textResult, visualResult] = await Promise.all([textCall, visualCall]);

  const elapsed = Date.now() - t0;
  console.log(`AI: Both calls complete in ${elapsed}ms — text: ${textResult ? "OK" : "FAILED"}, visual: ${visualResult ? "OK" : "FAILED"}`);

  if (visualResult) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vr = visualResult as any;
    const ssCount = vr.screenshots?.perScreenshot?.length ?? "missing";
    const iconPresent = !!vr.icon;
    console.log(`AI [VISUAL]: screenshots.perScreenshot: ${ssCount}, icon: ${iconPresent}, keys: ${Object.keys(visualResult).join(", ")}`);
  }

  if (!textResult && !visualResult) {
    console.error("AI: Both calls failed — returning null");
    return null;
  }

  // ── Merge results into unified AIAnalysis ─────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = (textResult || {}) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = (visualResult || {}) as any;

  const analysis: AIAnalysis = {
    title: t.title || { issues: [], suggestions: [], reasoning: "" },
    subtitle: t.subtitle,
    titleSubtitlePairs: t.titleSubtitlePairs,
    titleShortDescPairs: t.titleShortDescPairs,
    shortDescription: t.shortDescription,
    keywordField: t.keywordField,
    description: t.description || {
      fullRewrite: "",
      openingHook: "",
      featureBullets: [],
      cta: "",
      keywordGaps: [],
      structureIssues: [],
    },
    promotionalText: t.promotionalText,
    icon: v.icon,
    screenshots: v.screenshots || {
      overallAssessment: "",
      galleryCoherence: 0,
      firstThreeVerdict: "",
      perScreenshot: [],
      missingSlots: [],
      commonMistakesFound: [],
    },
    featureGraphic: v.featureGraphic,
    video: t.video,
    ratings: t.ratings,
    whatsNew: t.whatsNew,
    abTesting: t.abTesting,
    maintenance: t.maintenance,
    localization: t.localization,
    topInsights: t.topInsights || [],
  };

  const screenshotCount = analysis.screenshots?.perScreenshot?.length ?? 0;
  console.log(`AI: Merged — ${screenshotCount} screenshots analyzed, ${analysis.topInsights.length} insights, text=${!!textResult}, visual=${!!visualResult}`);

  return analysis;
}

// ---------------------------------------------------------------------------
// Deep-dive: section-specific focused AI calls with higher token budgets
// ---------------------------------------------------------------------------

export type { DeepDiveSection };

function buildDescriptionDeepDivePrompt(data: AppData): string {
  const isIOS = data.platform === "ios";
  let p = `You are a senior ASO copywriter. Provide a comprehensive description rewrite for this ${isIOS ? "iOS" : "Android"} app.\n\n`;

  p += `## APP CONTEXT\n`;
  p += `**Title:** "${data.title}"\n`;
  p += `**Category:** ${data.category}\n`;
  p += `**Platform:** ${isIOS ? "iOS" : "Android"}\n`;
  p += `**Rating:** ${data.rating > 0 ? `${data.rating.toFixed(1)}★ (${data.ratingsCount.toLocaleString()})` : "No rating"}\n\n`;

  p += `## CURRENT DESCRIPTION\n${data.description.substring(0, 4000)}\n\n`;

  p += `## REQUIREMENTS\n`;
  p += `- Write ${isIOS ? "1 complete rewrite (1,000-4,000 chars)" : "1 complete rewrite (2,500-4,000 chars)"}\n`;
  p += `- Also write 2 alternative versions with different angles/tones\n`;
  p += `- Each version must include: compelling opening hook (2-3 sentences), feature bullets with user benefits, social proof, and CTA\n`;
  p += `- ${!isIOS ? "Front-load primary keywords, use them 3-5x naturally. Google indexes the full description." : "Description is NOT indexed for search on iOS but affects conversion + web SEO."}\n`;
  p += `- NO brackets, NO placeholders, NO [insert here] — write actual final copy using real app features\n`;
  p += `- Each bullet should be benefit-focused: "✦ Feature → Benefit" format\n`;
  p += `- Include character count for each version\n\n`;

  p += `Return JSON:\n{\n`;
  p += `  "primaryRewrite": "Complete description ready to paste (${isIOS ? "1,000-4,000" : "2,500-4,000"} chars)",\n`;
  p += `  "alternativeA": "Alternative version with different angle",\n`;
  p += `  "alternativeB": "Another alternative version",\n`;
  p += `  "charCounts": { "primary": 2500, "altA": 2800, "altB": 2200 },\n`;
  p += `  "openingHook": "Just the opening hook extracted from primaryRewrite",\n`;
  p += `  "featureBullets": ["• Benefit bullet 1", "• Bullet 2", "...5-8 bullets"],\n`;
  p += `  "cta": "Closing CTA from primaryRewrite",\n`;
  p += `  "keywordStrategy": "Explanation of keyword placement strategy",\n`;
  p += `  "keywordGaps": ["keyword missing from current description"],\n`;
  p += `  "structuralChanges": ["Specific structural improvement made and why"]\n`;
  p += `}`;
  return p;
}

function buildScreenshotsDeepDivePrompt(data: AppData): string {
  const isIOS = data.platform === "ios";
  const screenshotMax = isIOS ? 10 : 8;
  const imgCount = Math.min(data.screenshots?.length || 0, 8);

  let p = `You are a senior ASO consultant specializing in app store visual assets. Provide a deep analysis of screenshots.\n\n`;

  p += `## APP CONTEXT\n`;
  p += `**App:** ${data.title}\n`;
  p += `**Category:** ${data.category}\n`;
  p += `**Platform:** ${isIOS ? "iOS" : "Android"}\n`;
  p += `**Screenshots uploaded:** ${data.screenshotCount} / ${screenshotMax} slots\n\n`;

  const descSnippet = data.description.substring(0, 1200).replace(/\n{2,}/g, "\n");
  p += `## APP FEATURES\n${descSnippet}\n\n`;

  if (imgCount > 0) {
    p += `I'm providing ${imgCount} screenshot images. For EACH one, give an extremely detailed analysis:\n`;
    p += `1. Describe what the screenshot shows in detail (UI elements, content, layout)\n`;
    p += `2. Read and transcribe the EXACT caption text visible (or "none")\n`;
    p += `3. Deep caption evaluation: benefit-focused? keyword-rich? readable at thumbnail? emotional trigger? OCR-friendly?\n`;
    p += `4. Identify style and assess if it's the right choice\n`;
    p += `5. List ALL issues (device frame age, UI freshness, placeholder data, contrast, readability)\n`;
    p += `6. Provide a specific design brief for how to remake this screenshot\n`;
    p += `7. Suggest 3 caption alternatives (benefit-focused, keyword-rich, 2-5 words each)\n\n`;
    p += `**CAPTION DIVERSITY RULE:** Each slot's primary captionSuggestion MUST use a DIFFERENT primary keyword from every other slot. Never repeat the same word (e.g., "curated", "discover", "stream") as the lead keyword across multiple captions. Spread 5-10 unique ASO keywords across the full gallery. If you notice repetition in your own output, revise before responding.\n\n`;
  }

  p += `Return JSON matching this structure:\n{\n`;
  p += `  "overallAssessment": "Detailed 3-5 sentence assessment of gallery quality",\n`;
  p += `  "galleryCoherence": 7,\n`;
  p += `  "firstThreeVerdict": "Detailed First 3 Rule analysis",\n`;
  p += `  "visualIdentity": "Assessment of consistent design language, color palette, typography",\n`;
  p += `  "perScreenshot": [\n`;
  for (let i = 1; i <= imgCount; i++) {
    p += `    {\n`;
    p += `      "slot": ${i},\n`;
    p += `      "whatItShows": "Detailed description of screenshot ${i}",\n`;
    p += `      "captionVisible": "EXACT text on the screenshot, or 'none'",\n`;
    p += `      "captionQuality": "Deep assessment of caption effectiveness",\n`;
    p += `      "captionSuggestions": ["Caption Alt 1", "Caption Alt 2", "Caption Alt 3"],\n`;
    p += `      "style": "device-frame-with-caption | full-bleed | lifestyle | feature-highlight",\n`;
    p += `      "issues": ["every issue observed"],\n`;
    p += `      "designBrief": "Specific instructions for a designer to remake this screenshot — what to change, keep, and improve"\n`;
    p += `    }${i < imgCount ? "," : ""}\n`;
  }
  p += `  ],\n`;

  p += `  "missingSlots": [\n`;
  p += `    // Only suggest features confirmed in the description. Add "(if available)" for uncertain features.\n`;
  const startSlot = imgCount + 1;
  const endSlot = Math.min(imgCount + (screenshotMax - imgCount), screenshotMax);
  for (let i = startSlot; i <= endSlot; i++) {
    p += `    {\n`;
    p += `      "slot": ${i},\n`;
    p += `      "whatToShow": "What this new screenshot should display — add '(if available)' for unconfirmed features",\n`;
    p += `      "captionSuggestion": "2-5 Word Caption",\n`;
    p += `      "recommendedStyle": "device-frame-with-caption",\n`;
    p += `      "designBrief": "Full design brief for a designer to create this screenshot"\n`;
    p += `    }${i < endSlot ? "," : ""}\n`;
  }
  p += `  ],\n`;

  p += `  "commonMistakesFound": ["list all common screenshot mistakes observed"],\n`;
  p += `  "galleryReorderSuggestion": "If the current order is suboptimal, suggest a better order with reasoning. Consider: panoramic/continuous-scroll layout (screenshots visually connect across gallery), story-flow three-act structure (Hook→Flow→Trust), or standard strategic positioning (Hero→Differentiator→Popular→Proof→Features→CTA)",\n`;
  p += `  "ocrOptimization": "Assessment of caption text for Apple OCR indexing — font size (40pt+ required), contrast, positioning, font type (bold sans-serif required for reliable extraction). Also assess semantic clustering: do captions cover thematically related terms that activate Apple's 2026 semantic indexing? (e.g., an app with 'meditation' should also use 'mindfulness', 'stress relief', 'calm' across captions)"\n`;
  p += `}`;
  return p;
}

function buildTitleDeepDivePrompt(data: AppData): string {
  const isIOS = data.platform === "ios";
  let p = isIOS
    ? `You are a senior ASO consultant. Provide an exhaustive TITLE + SUBTITLE paired optimization analysis for iOS.\n\n`
    : `You are a senior ASO consultant. Provide an exhaustive TITLE + SHORT DESCRIPTION paired optimization analysis for Android Google Play.\n\n`;

  p += `## FIELD BEING ANALYZED: ${isIOS ? "APP TITLE + SUBTITLE (as a coordinated pair)" : "APP TITLE + SHORT DESCRIPTION (as a coordinated keyword pair)"}\n`;
  p += `**Title HARD CHARACTER LIMIT: 30 characters** (both platforms use 30 chars)\n`;
  p += `**EVERY title variant you suggest MUST be ≤30 characters. No exceptions.**\n`;
  p += `**NEVER repeat the same word within a single title** (e.g., "Rock Radio - Hard Rock" repeats "Rock" — this wastes characters on a word already indexed)\n\n`;

  p += `## CURRENT APP METADATA\n`;
  p += `**Current title:** "${data.title}" (${data.title.length}/30 chars)\n`;
  if (isIOS) {
    p += data.subtitle
      ? `**Current subtitle:** "${data.subtitle}" (${data.subtitle.length}/30 chars)\n`
      : `**Current subtitle:** (not set — empty, 30 chars available)\n`;
  } else {
    p += data.shortDescription
      ? `**Current short description:** "${data.shortDescription}" (${data.shortDescription.length}/80 chars)\n`
      : `**Current short description:** (not set — empty, 80 chars available)\n`;
  }
  p += `**Category:** ${data.category}\n`;
  p += `**Platform:** ${isIOS ? "iOS" : "Android"}\n`;
  p += `**Rating:** ${data.rating > 0 ? `${data.rating.toFixed(1)}★ (${data.ratingsCount.toLocaleString()})` : "No rating"}\n\n`;

  p += `## DESCRIPTION (for feature/keyword context)\n`;
  p += `${data.description.substring(0, 1200)}\n\n`;

  if (isIOS) {
    p += `## iOS TITLE + SUBTITLE OPTIMIZATION RULES\n`;
    p += `- Title is the most heavily weighted field; subtitle is second-most weighted\n`;
    p += `- Together they are a SINGLE 60-character keyword strategy — design them as a PAIR\n`;
    p += `- Apple combines title + subtitle + keyword field = 160 indexable chars. A word only needs to appear ONCE across all three fields.\n`;
    p += `- ZERO word overlap between title and subtitle — repeating a word across fields wastes budget with zero additional ranking benefit\n`;
    p += `- ZERO repeated words within a single title (each word must be a unique ranking term)\n`;
    p += `- Front-load keywords in the first 15 characters of the TITLE (highest weight + most visible in search results)\n`;
    p += `- Format options: "Brand – Keyword" or "Keyword – Brand" (if brand isn't well-known)\n`;
    p += `- Write for humans first, SEO second — both fields must read naturally\n`;
    p += `- No superlatives (#1, best, top) — Apple rejects these\n`;
    p += `- Don't repeat the category name (already indexed for free)\n`;
    p += `- Use every available character in both fields\n\n`;

    p += `Return JSON:\n{\n`;
    p += `  "currentAnalysis": "Detailed analysis of the CURRENT title+subtitle pair — what's good, what's missing, keyword coverage, overlap issues, character efficiency",\n`;
    p += `  "pairedSets": [\n`;
    for (let i = 1; i <= 5; i++) {
      p += `    {\n`;
      p += `      "title": "Title variant ${i} (≤30 chars, NO repeated words within it)",\n`;
      p += `      "titleCharCount": 0,\n`;
      p += `      "subtitle": "Matching subtitle for title ${i} (≤30 chars, ZERO word overlap with its title)",\n`;
      p += `      "subtitleCharCount": 0,\n`;
      p += `      "keywordsCovered": ["list", "every", "unique", "keyword", "across", "BOTH", "fields"],\n`;
      p += `      "strategy": "keyword-first | brand-first | hybrid",\n`;
      p += `      "reasoning": "Why this PAIR maximizes the 60-char keyword budget — which high-volume terms go in title vs subtitle and why"\n`;
      p += `    }${i < 5 ? "," : ""}\n`;
    }
    p += `  ],\n`;
    p += `  "keywordCoverage": [\n`;
    p += `    { "keyword": "target keyword", "presentIn": ["pair 1 title", "pair 3 subtitle"], "searchVolume": "high | medium | low" }\n`;
    p += `  ],\n`;
    p += `  "recommendation": "Which pair is the top recommendation and why — how many unique ranking terms does it cover across title+subtitle?"\n`;
    p += `}\n\n`;
    p += `CRITICAL RULES:\n`;
    p += `1. "titleCharCount" and "subtitleCharCount" must be ACTUAL character counts, NOT 30\n`;
    p += `2. EVERY title AND subtitle MUST be ≤30 characters — count BEFORE writing each one\n`;
    p += `3. ZERO repeated words within a single title — each word must be unique\n`;
    p += `4. ZERO word overlap between a title and its paired subtitle — check BEFORE writing\n`;
    p += `5. Maximize unique keyword count per pair — if a pair covers 8 unique terms, that's better than one covering 5`;
  } else {
    p += `## ANDROID TITLE + SHORT DESCRIPTION OPTIMIZATION RULES\n`;
    p += `- Title is the most heavily weighted field on Google Play; short description is second-most indexed\n`;
    p += `- They appear TOGETHER in search results — users see both before tapping; design them as a PAIR\n`;
    p += `- Google indexes both fields. A word in the title is already captured — the short description should expand to DIFFERENT keyword territory\n`;
    p += `- Short description dual role: (1) RANKING — front-load a primary keyword in the first 3 words; (2) CONVERSION — it's the first copy users see in search, must compel a tap\n`;
    p += `- Short description: 80 characters MAX\n`;
    p += `- ZERO repeated words within a single title (each word = unique ranking term)\n`;
    p += `- Minimize keyword overlap between title and short description — wasted characters on terms already indexed from the title\n`;
    p += `- Front-load keywords in the first 15 characters of the TITLE (highest algorithmic weight + most visible in search results)\n`;
    p += `- Format options: "Brand – Keyword" or "Keyword – Brand" (if brand isn't well-known)\n`;
    p += `- No superlatives (#1, best, top) — stores reject these\n`;
    p += `- Use every available character in both fields\n\n`;

    p += `Return JSON:\n{\n`;
    p += `  "currentAnalysis": "Detailed analysis of the CURRENT title+short description pair — keyword coverage, overlap between fields, character efficiency, conversion quality of the short description, what's missing",\n`;
    p += `  "pairedSets": [\n`;
    for (let i = 1; i <= 5; i++) {
      p += `    {\n`;
      p += `      "title": "Title variant ${i} (≤30 chars, NO repeated words within it)",\n`;
      p += `      "titleCharCount": 0,\n`;
      p += `      "shortDescription": "Paired short description (≤80 chars). Front-load a DIFFERENT keyword from the title in the FIRST 3 WORDS. Cover fresh keyword territory. Write as a compelling, human-readable conversion pitch — not a keyword list. ZERO words repeated from the paired title.",\n`;
      p += `      "shortDescCharCount": 0,\n`;
      p += `      "keywordsCovered": ["list", "every", "unique", "keyword", "across", "BOTH", "fields"],\n`;
      p += `      "strategy": "keyword-first | benefit-first | social-proof",\n`;
      p += `      "reasoning": "Why this PAIR maximizes indexed keyword coverage AND conversion — which high-value terms anchor the title vs short description, and how the short description expands coverage while staying compelling"\n`;
      p += `    }${i < 5 ? "," : ""}\n`;
    }
    p += `  ],\n`;
    p += `  "keywordCoverage": [\n`;
    p += `    { "keyword": "target keyword", "presentIn": ["pair 1 title", "pair 3 shortDescription"], "searchVolume": "high | medium | low" }\n`;
    p += `  ],\n`;
    p += `  "recommendation": "Which pair is the top recommendation and why — how many unique ranking terms does it cover across title+short description, and why does the short description work as a conversion pitch?"\n`;
    p += `}\n\n`;
    p += `CRITICAL RULES:\n`;
    p += `1. "titleCharCount" and "shortDescCharCount" must be ACTUAL character counts you computed\n`;
    p += `2. EVERY title MUST be ≤30 characters — count BEFORE writing each one\n`;
    p += `3. EVERY short description MUST be ≤80 characters — count BEFORE writing each one\n`;
    p += `4. NEVER repeat the same word within a single title\n`;
    p += `5. Minimize title word repetition in the paired short description — use different keywords\n`;
    p += `6. Short description must read as a compelling human sentence, NOT a keyword list`;
  }
  return p;
}

function buildSubtitleDeepDivePrompt(data: AppData): string {
  let p = `You are a senior ASO consultant specializing in Apple App Store optimization. Provide a comprehensive SUBTITLE analysis.\n\n`;

  p += `## FIELD BEING ANALYZED: iOS SUBTITLE\n`;
  p += `**HARD CHARACTER LIMIT: 30 characters**\n`;
  p += `**EVERY variant you suggest MUST be ≤30 characters. No exceptions.**\n\n`;

  p += `## CURRENT APP METADATA\n`;
  p += `**Current title:** "${data.title}" (${data.title.length}/30 chars)\n`;
  p += data.subtitle
    ? `**Current subtitle:** "${data.subtitle}" (${data.subtitle.length}/30 chars)\n`
    : `**Current subtitle:** (not set — 30 chars available)\n`;
  if ((data as unknown as Record<string, unknown>).keywordField) {
    p += `**Current keyword field:** "${(data as unknown as Record<string, unknown>).keywordField}"\n`;
  }
  p += `**Category:** ${data.category}\n`;
  p += `**Platform:** iOS (Apple App Store)\n`;
  p += `**Rating:** ${data.rating > 0 ? `${data.rating.toFixed(1)}★ (${data.ratingsCount.toLocaleString()})` : "No rating"}\n\n`;

  p += `## DESCRIPTION (for feature/keyword context)\n`;
  p += `${data.description.substring(0, 1200)}\n\n`;

  p += `## SUBTITLE OPTIMIZATION RULES\n`;
  p += `- Second-most weighted field on iOS for search ranking\n`;
  p += `- ZERO word overlap with title — Apple combines title + subtitle + keyword field automatically\n`;
  p += `- Words in the title "${data.title}" are ALREADY indexed, so never repeat them in the subtitle\n`;
  p += `- Don't repeat the category name (already indexed for free)\n`;
  p += `- Apple's total indexable text budget: title (30) + subtitle (30) + keyword field (100) = 160 chars\n`;
  p += `- The subtitle appears directly below the title in search results — it should complement, not repeat\n`;
  p += `- Focus on the #1 benefit or differentiator that the title doesn't cover\n`;
  p += `- Use the subtitle to capture different keyword intent than the title\n\n`;

  p += `Return JSON:\n{\n`;
  p += `  "currentAnalysis": "Assessment of current subtitle — keyword coverage, overlap with title, character efficiency, missed opportunities",\n`;
  p += `  "titleOverlapCheck": "List any words that appear in BOTH the current title and subtitle (these are wasted)",\n`;
  p += `  "variants": [\n`;
  for (let i = 1; i <= 6; i++) {
    p += `    {\n`;
    p += `      "subtitle": "Subtitle variant ${i} — MUST BE ≤30 CHARS",\n`;
    p += `      "charCount": 0,\n`;
    p += `      "keywordsAdded": ["new keyword not in title"],\n`;
    p += `      "reasoning": "Why this subtitle complements the title and targets different search intent"\n`;
    p += `    }${i < 6 ? "," : ""}\n`;
  }
  p += `  ],\n`;
  p += `  "recommendation": "Which variant is the top recommendation and why"\n`;
  p += `}\n\n`;
  p += `CRITICAL RULES:\n`;
  p += `1. Every variant MUST be ≤30 characters — count before writing\n`;
  p += `2. ZERO overlap with title words — check "${data.title}" before suggesting\n`;
  p += `3. "charCount" must be the ACTUAL count, not 30`;
  return p;
}

function buildKeywordsDeepDivePrompt(data: AppData): string {
  let p = `You are a senior ASO consultant specializing in Apple App Store keyword optimization. Provide a comprehensive keyword field analysis.\n\n`;

  p += `## FIELD BEING ANALYZED: iOS KEYWORD FIELD\n`;
  p += `**HARD CHARACTER LIMIT: 100 characters**\n`;
  p += `**Format: comma-separated, NO spaces after commas**\n`;
  p += `**This field is INVISIBLE to users — purely for search indexing**\n\n`;

  p += `## CURRENT APP METADATA\n`;
  p += `**Current title:** "${data.title}"\n`;
  p += data.subtitle
    ? `**Current subtitle:** "${data.subtitle}"\n`
    : `**Current subtitle:** (not set)\n`;
  const kw = (data as unknown as Record<string, unknown>).keywordField;
  if (kw) {
    p += `**Current keyword field:** "${kw}" (${String(kw).length}/100 chars)\n`;
  } else {
    p += `**Current keyword field:** (not available — provide optimized field from scratch)\n`;
  }
  p += `**Category:** ${data.category}\n`;
  p += `**Platform:** iOS (Apple App Store)\n`;
  p += `**Rating:** ${data.rating > 0 ? `${data.rating.toFixed(1)}★ (${data.ratingsCount.toLocaleString()})` : "No rating"}\n\n`;

  p += `## DESCRIPTION (for keyword context)\n`;
  p += `${data.description.substring(0, 1500)}\n\n`;

  p += `## KEYWORD FIELD OPTIMIZATION RULES (from ASO best practices)\n`;
  p += `- 100 characters MAX, comma-separated, NO spaces after commas (spaces waste characters)\n`;
  p += `- NO words already in the title or subtitle — Apple auto-indexes those, duplicates waste budget\n`;
  p += `  Title words to exclude: ${data.title.toLowerCase().split(/\\s+/).join(", ")}\n`;
  if (data.subtitle) {
    p += `  Subtitle words to exclude: ${data.subtitle.toLowerCase().split(/\\s+/).join(", ")}\n`;
  }
  p += `- Use SINGULAR forms only — Apple handles plural/singular automatically\n`;
  p += `- Single words > multi-word phrases — Apple recombines words automatically\n`;
  p += `  Example: "music,stream" covers "music streaming" + "stream music" + "streaming"\n`;
  p += `- NO competitor brand names (violates guidelines, causes app rejection)\n`;
  p += `- NO category name (already indexed automatically)\n`;
  p += `- Apple combines: title (30) + subtitle (30) + keyword field (100) = 160 indexable chars\n`;
  p += `- Research and update quarterly with each app submission\n`;
  p += `- Target a mix of high-volume and long-tail keywords\n\n`;

  p += `Return JSON:\n{\n`;
  p += `  "currentAnalysis": "Assessment of current keyword field — wasted characters, duplicate words, missing opportunities, plural issues",\n`;
  p += `  "wastedWords": ["word that's already in title/subtitle and shouldn't be repeated"],\n`;
  p += `  "optimizedField": "the,complete,optimized,100,char,keyword,field,no,spaces,after,commas",\n`;
  p += `  "charCount": 0,\n`;
  p += `  "keywordsIncluded": [\n`;
  p += `    { "keyword": "word", "reasoning": "Why this keyword — search intent, volume estimate, relevance" }\n`;
  p += `  ],\n`;
  p += `  "keywordsExcluded": ["keyword considered but left out and why"],\n`;
  p += `  "combinationExamples": ["Example searches this field enables: 'music streaming', 'relaxing radio', etc."],\n`;
  p += `  "recommendation": "Summary of the optimization strategy and expected impact"\n`;
  p += `}\n\n`;
  p += `CRITICAL RULES:\n`;
  p += `1. The "optimizedField" MUST be ≤100 characters total\n`;
  p += `2. NO spaces after commas — "word1,word2,word3" not "word1, word2, word3"\n`;
  p += `3. NO words from the title or subtitle\n`;
  p += `4. "charCount" must be the ACTUAL length of "optimizedField"`;
  return p;
}

function buildIconDeepDivePrompt(data: AppData): string {
  const isIOS = data.platform === "ios";
  let p = `You are a senior ASO and app design consultant specializing in app store icon optimization. Provide a comprehensive icon analysis.\n\n`;

  p += `## APP CONTEXT\n`;
  p += `**App:** ${data.title}\n`;
  p += `**Category:** ${data.category}\n`;
  p += `**Platform:** ${isIOS ? "iOS (Apple App Store)" : "Android (Google Play Store)"}\n`;
  if (data.subtitle) p += `**Subtitle:** ${data.subtitle}\n`;
  p += `**Rating:** ${data.rating > 0 ? `${data.rating.toFixed(1)}★ (${data.ratingsCount.toLocaleString()})` : "No rating"}\n\n`;

  p += `## DESCRIPTION (for understanding what the app does)\n`;
  p += `${data.description.substring(0, 1500)}\n\n`;

  p += `## ICON OPTIMIZATION RULES (from ASO best practices)\n`;
  p += `- The icon is the single most important visual element — it appears in search results, browse, and the home screen\n`;
  p += `- Must be instantly recognizable at 60x60px (the smallest display size)\n`;
  p += `- Simple, bold shapes with high contrast work best — avoid fine details that disappear at small sizes\n`;
  p += `- Should communicate the app's purpose or brand at a glance\n`;
  p += `- Must work on BOTH light and dark backgrounds (iOS has both modes, Android has themed icons)\n`;
  p += `- Unique within the category — avoid looking like competitors in ${data.category}\n`;
  p += `- No text in the icon (unreadable at small sizes, except single letters/initials)\n`;
  p += `- No screenshots or photos — too much detail\n`;
  p += `- Consistent with the app's UI color palette and brand identity\n`;
  if (isIOS) {
    p += `- iOS automatically applies rounded corners (superellipse mask) — don't add your own rounded corners\n`;
    p += `- Required size: 1024x1024px (Apple scales down automatically)\n`;
    p += `- No alpha channel or transparency allowed\n`;
  } else {
    p += `- Android adaptive icons: provide foreground + background layers for themed icon support\n`;
    p += `- Required size: 512x512px (Google scales down)\n`;
    p += `- Consider how the icon looks with Material You dynamic theming\n`;
  }
  p += `- A/B test icon variants — even small changes can significantly impact conversion\n\n`;

  p += `## ANALYSIS INSTRUCTIONS\n`;
  p += `Analyze the provided icon image in detail. Evaluate it against every rule above. Be specific about what you see.\n\n`;

  p += `Return JSON:\n{\n`;
  p += `  "assessment": "Detailed assessment of the current icon — what it shows, what it communicates, overall effectiveness",\n`;
  p += `  "issues": ["specific issue 1 with the current icon", "issue 2", "etc — list EVERY problem you identify"],\n`;
  p += `  "strengths": ["what the icon does well — be specific"],\n`;
  p += `  "colorAnalysis": "Detailed color palette assessment — primary colors, contrast ratio, visibility on light/dark backgrounds, brand consistency",\n`;
  p += `  "readabilityAt60px": "Can you identify the app's purpose at 60x60px? What gets lost?",\n`;
  p += `  "competitorComparison": "How this icon compares to typical icons in the ${data.category} category — does it stand out or blend in?",\n`;
  p += `  "redesignBrief": "Detailed creative brief for a designer to improve the icon — specific directions, not vague suggestions. Include: color direction, shape/symbol, style (flat/gradient/3D), what to keep vs change",\n`;
  p += `  "suggestions": ["specific actionable improvement 1", "improvement 2", "improvement 3", "improvement 4"]\n`;
  p += `}`;
  return p;
}

function buildShortDescriptionDeepDivePrompt(data: AppData): string {
  let p = `You are a senior ASO consultant specializing in Google Play optimization. Provide a comprehensive short description analysis and rewrite.\n\n`;

  p += `## APP CONTEXT\n`;
  p += `**App:** ${data.title}\n`;
  p += `**Category:** ${data.category}\n`;
  p += `**Platform:** Android (Google Play)\n`;
  p += `**Rating:** ${data.rating > 0 ? `${data.rating.toFixed(1)}★ (${data.ratingsCount.toLocaleString()})` : "No rating"}\n\n`;

  p += `**Current short description:** "${data.shortDescription || "(not set)"}"\n`;
  p += `**Character count:** ${data.shortDescription?.length || 0}/80 chars\n\n`;

  p += `**Full description excerpt:** ${data.description.substring(0, 1500)}\n\n`;

  p += `## RULES\n`;
  p += `- Google Play short description: 80 characters MAX\n`;
  p += `- Front-load the PRIMARY keyword in the FIRST 3 WORDS — Google gives highest weight to the beginning\n`;
  p += `- This is the FIRST text users see below the screenshots — it must hook and convert\n`;
  p += `- Each variant MUST be 80 characters or fewer — count carefully\n`;
  p += `- Include a clear value proposition, not just a feature list\n`;
  p += `- Avoid generic phrases like "the best app" or "download now"\n`;
  p += `- Use natural language — no keyword stuffing\n`;
  p += `- Directly affects click-through rate from search results — treat this as a mini-ad\n\n`;

  p += `Return JSON:\n{\n`;
  p += `  "currentAnalysis": "Detailed analysis of current short description — keyword coverage, hook quality, character usage efficiency, what's missing",\n`;
  p += `  "variants": [\n`;
  for (let i = 1; i <= 6; i++) {
    p += `    {\n`;
    p += `      "text": "Short description variant ${i} (MUST be ≤80 chars)",\n`;
    p += `      "charCount": 0,\n`;
    p += `      "strategy": "keyword-first | benefit-first | social-proof",\n`;
    p += `      "reasoning": "Why this variant works — what keywords it targets and what conversion angle it uses"\n`;
    p += `    }${i < 6 ? "," : ""}\n`;
  }
  p += `  ],\n`;
  p += `  "keywordsTargeted": ["keyword 1", "keyword 2"],\n`;
  p += `  "recommendation": "Which variant is the top recommendation and why"\n`;
  p += `}\n\n`;
  p += `CRITICAL: Every variant MUST be ≤80 characters. "charCount" must be the ACTUAL character count. Double-check before responding.`;
  return p;
}

function buildVideoDeepDivePrompt(data: AppData): string {
  const isIOS = data.platform === "ios";
  let p = `You are a senior ASO and app marketing consultant specializing in app store video assets. Provide a comprehensive App Preview / Promo Video strategy.\n\n`;

  p += `## APP CONTEXT\n`;
  p += `**App:** ${data.title}\n`;
  p += `**Category:** ${data.category}\n`;
  p += `**Platform:** ${isIOS ? "iOS" : "Android"}\n`;
  if (data.subtitle) p += `**Subtitle:** ${data.subtitle}\n`;
  p += `**Rating:** ${data.rating > 0 ? `${data.rating.toFixed(1)}★ (${data.ratingsCount.toLocaleString()})` : "No rating"}\n`;
  p += `**Has video:** ${data.hasVideo ? "Yes" : "No"}\n\n`;

  p += `## CURRENT DESCRIPTION (for feature context)\n`;
  p += `${data.description.substring(0, 3000)}\n\n`;

  p += `## REQUIREMENTS\n`;
  if (isIOS) {
    p += `- This is an iOS App Preview video (15-30 seconds)\n`;
    p += `- Must use REAL in-app footage only (no renders, no live-action outside device)\n`;
    p += `- Auto-plays silently on the App Store — first 3 seconds are critical\n`;
    p += `- Poster frame (first frame) replaces the first screenshot slot if no screenshots precede it\n`;
    p += `- Specs: H.264 .mov or .mp4, no letterboxing\n`;
    p += `- Sizes: 886x1920 (5.5"), 1080x1920 (6.1"), 1284x2778 (6.5"), 1290x2796 (6.7"), 1320x2868 (6.9")\n`;
  } else {
    p += `- This is a Google Play Promo Video (30s-2min, hosted on YouTube)\n`;
    p += `- Can mix in-app footage with motion graphics and text overlays\n`;
    p += `- Appears as hero video at top of listing — thumbnail is the first impression\n`;
    p += `- Landscape preferred but vertical supported\n`;
  }
  p += `- The hook (first 3 seconds) determines if users watch or scroll — show the core outcome immediately\n`;
  p += `- Each segment must reference REAL features from this specific app\n`;
  p += `- Include text overlays / captions for silent autoplay\n\n`;

  p += `Return JSON:\n{\n`;
  p += `  "assessment": "Why this app needs a video and what the strategic goal should be",\n`;
  p += `  "hookStrategy": "Specific description of what the first 3 seconds should show and why",\n`;
  p += `  "storyboard": [\n`;
  p += `    { "segment": "Hook", "duration": "0-3s", "content": "Exact scene description using real app features", "caption": "Text overlay for silent viewing", "whyItWorks": "Conversion psychology" },\n`;
  p += `    { "segment": "Feature 1", "duration": "3-10s", "content": "...", "caption": "...", "whyItWorks": "..." },\n`;
  p += `    { "segment": "Feature 2", "duration": "10-18s", "content": "...", "caption": "...", "whyItWorks": "..." },\n`;
  p += `    { "segment": "Feature 3", "duration": "18-25s", "content": "...", "caption": "...", "whyItWorks": "..." },\n`;
  p += `    { "segment": "CTA", "duration": "25-30s", "content": "...", "caption": "...", "whyItWorks": "..." }\n`;
  p += `  ],\n`;
  p += `  "posterFrame": "Description of ideal poster frame / thumbnail — this is the user's first impression",\n`;
  p += `  "musicDirection": "Recommended music style/mood and why (royalty-free)",\n`;
  p += `  "transitionStyle": "Recommended transition style between segments",\n`;
  p += `  "keyMessages": ["Key message 1 to convey", "Message 2", "Message 3"],\n`;
  p += `  "commonMistakes": ["Mistake to avoid for THIS specific app type"]\n`;
  p += `}`;
  return p;
}

function buildRatingsDeepDivePrompt(data: AppData): string {
  const isIOS = data.platform === "ios";
  let p = `You are a senior mobile growth consultant specializing in ratings and review management. Provide a deep analysis and strategy.\n\n`;

  p += `## APP CONTEXT\n`;
  p += `**App:** ${data.title}\n`;
  p += `**Category:** ${data.category}\n`;
  p += `**Platform:** ${isIOS ? "iOS" : "Android"}\n`;
  p += `**Rating:** ${data.rating > 0 ? `${data.rating.toFixed(1)}★` : "No rating"}\n`;
  p += `**Ratings count:** ${data.ratingsCount.toLocaleString()}\n`;
  p += `**Installs:** ${(data as unknown as Record<string, unknown>).installs || "Unknown"}\n\n`;

  p += `## CURRENT DESCRIPTION (for feature context)\n`;
  p += `${data.description.substring(0, 2000)}\n\n`;

  p += `## REQUIREMENTS\n`;
  p += `- Analyze the current rating and volume in context of the app's category and competition\n`;
  p += `- Provide specific, actionable strategies to improve rating and volume\n`;
  p += `- Include platform-specific implementation details\n`;
  p += `- Focus on sustainable strategies, not manipulation\n\n`;

  p += `Return JSON:\n{\n`;
  p += `  "assessment": "Detailed analysis of current ratings situation in context of category benchmarks",\n`;
  p += `  "ratingAnalysis": "What the current rating signals to potential users and to the algorithm",\n`;
  p += `  "volumeAnalysis": "Whether the volume is sufficient for social proof and algorithmic trust",\n`;
  p += `  "promptStrategy": {\n`;
  p += `    "bestMoments": ["Specific in-app moment 1 to trigger review prompt", "Moment 2", "Moment 3"],\n`;
  p += `    "worstMoments": ["When NOT to prompt — specific to this app"],\n`;
  p += `    "implementation": "Platform-specific implementation guide (${isIOS ? "SKStoreReviewController" : "In-App Review API"})"\n`;
  p += `  },\n`;
  p += `  "negativeReviewStrategy": "How to analyze and respond to negative reviews for this app type",\n`;
  p += `  "competitorBenchmark": "How this app's rating compares to typical ${data.category} apps",\n`;
  p += `  "suggestions": ["Specific actionable suggestion 1", "Suggestion 2", "Suggestion 3"]\n`;
  p += `}`;
  return p;
}

function buildMaintenanceDeepDivePrompt(data: AppData): string {
  const isIOS = data.platform === "ios";
  let p = `You are a senior ASO consultant. Provide a deep analysis of the app's update and maintenance strategy.\n\n`;

  p += `## APP CONTEXT\n`;
  p += `**App:** ${data.title}\n`;
  p += `**Category:** ${data.category}\n`;
  p += `**Platform:** ${isIOS ? "iOS" : "Android"}\n`;
  p += `**Version:** ${data.version || "Unknown"}\n`;
  p += `**Rating:** ${data.rating > 0 ? `${data.rating.toFixed(1)}★ (${data.ratingsCount.toLocaleString()})` : "No rating"}\n\n`;

  if (data.whatsNew) {
    p += `## CURRENT RELEASE NOTES\n${data.whatsNew.substring(0, 1500)}\n\n`;
  }

  p += `## CURRENT DESCRIPTION (for feature context)\n`;
  p += `${data.description.substring(0, 2000)}\n\n`;

  p += `## REQUIREMENTS\n`;
  p += `- Assess how the update frequency and release notes quality affect rankings\n`;
  p += `- Provide specific seasonal and category-relevant update opportunities\n`;
  p += `- Suggest a concrete release cadence and metadata refresh plan\n\n`;

  p += `Return JSON:\n{\n`;
  p += `  "assessment": "Overall maintenance health assessment — how recency affects this app's rankings",\n`;
  p += `  "releaseNotesQuality": "Assessment of current What's New text quality and effectiveness",\n`;
  p += `  "updateCadence": "Recommended update frequency and why, based on category norms",\n`;
  p += `  "seasonalOpportunities": ["Specific seasonal event or trend relevant to this app and when to target it"],\n`;
  p += `  "metadataRefreshPlan": "What metadata to refresh with each update cycle",\n`;
  p += `  "releaseNotesSuggestions": ["Example release notes copy option 1 for next update", "Option 2"],\n`;
  p += `  "suggestions": ["Specific maintenance strategy suggestion 1", "Suggestion 2"]\n`;
  p += `}`;
  return p;
}

function buildLocalizationDeepDivePrompt(data: AppData): string {
  let p = `You are a senior ASO consultant specializing in international app growth and localization. Provide a deep localization strategy.\n\n`;

  p += `## APP CONTEXT\n`;
  p += `**App:** ${data.title}\n`;
  p += `**Category:** ${data.category}\n`;
  p += `**Platform:** ${data.platform === "ios" ? "iOS" : "Android"}\n`;
  p += `**Rating:** ${data.rating > 0 ? `${data.rating.toFixed(1)}★ (${data.ratingsCount.toLocaleString()})` : "No rating"}\n\n`;

  p += `## CURRENT DESCRIPTION (for understanding the app)\n`;
  p += `${data.description.substring(0, 2000)}\n\n`;

  p += `## REQUIREMENTS\n`;
  p += `- Identify the highest-ROI markets for this specific app category\n`;
  p += `- Provide a tiered localization roadmap (full vs. partial vs. metadata-only)\n`;
  p += `- Include specific cultural considerations per market\n`;
  p += `- Estimate effort and expected impact\n\n`;

  p += `Return JSON:\n{\n`;
  p += `  "assessment": "Overall localization opportunity assessment for this specific app and category",\n`;
  p += `  "priority": "high | medium | low — how important is localization for THIS app's growth",\n`;
  p += `  "reasoning": "Why this priority level, with category-specific data",\n`;
  p += `  "tier1Markets": [\n`;
  p += `    { "market": "Country/Language", "reasoning": "Why this market for this app", "effort": "estimated effort", "expectedLift": "expected download increase" }\n`;
  p += `  ],\n`;
  p += `  "tier2Markets": [\n`;
  p += `    { "market": "Country/Language", "reasoning": "Why", "effort": "estimated effort" }\n`;
  p += `  ],\n`;
  p += `  "localizationChecklist": ["What to localize first", "Second priority", "Third"],\n`;
  p += `  "culturalConsiderations": ["Cultural adaptation note 1 for a specific market", "Note 2"],\n`;
  p += `  "keywordStrategy": "How to approach keyword research in non-English markets. CRITICAL: direct translations miss local search terms — research actual local search behavior, colloquialisms, and market-specific keyword volumes. Each market needs native keyword research, not translation.",\n`;
  p += `  "screenshotLocalization": "Strategy for localizing screenshots: which markets need full new screenshots, which need caption translation only, and which can use English defaults",\n`;
  p += `  "suggestions": ["Specific localization action 1", "Action 2"]\n`;
  p += `}`;
  return p;
}

function buildCppDeepDivePrompt(data: AppData): string {
  const isIos = data.platform === "ios";
  const platformLabel = isIos ? "iOS" : "Android";
  const featureName = isIos ? "Custom Product Pages (CPPs)" : "Custom Store Listings";

  let p = `You are a senior ASO and paid acquisition strategist specializing in ${platformLabel} ${featureName}. `;
  p += `Provide a comprehensive, actionable strategy for creating ${featureName} for this specific app.\n\n`;

  p += `## APP CONTEXT\n`;
  p += `**App:** ${data.title}\n`;
  p += `**Category:** ${data.category}\n`;
  p += `**Platform:** ${platformLabel}\n`;
  p += `**Rating:** ${data.rating > 0 ? `${data.rating.toFixed(1)}★ (${data.ratingsCount.toLocaleString()} ratings)` : "No rating"}\n`;
  if (data.subtitle) p += `**Subtitle:** ${data.subtitle}\n`;
  p += `\n`;

  p += `## DESCRIPTION (for understanding the app and its features)\n`;
  p += `${data.description.substring(0, 2500)}\n\n`;

  if (isIos) {
    p += `## iOS CUSTOM PRODUCT PAGES — RULES & BEST PRACTICES\n`;
    p += `- Apple supports up to 70 CPPs per app\n`;
    p += `- Each CPP has its own URL and can have unique: screenshots, app preview video, and promotional text\n`;
    p += `- CPPs do NOT support custom titles, subtitles, or icons — only visual assets and promo text\n`;
    p += `- CPPs can be linked to Apple Search Ads campaigns for keyword-specific landing pages\n`;
    p += `- Average result: 8.6% conversion lift, up to 60% CPA reduction, 2.5pp average conversion increase vs default page\n`;
    p += `- Apple OCR indexes screenshot captions — align CPP captions with the target keyword cluster\n`;
    p += `- Each CPP should target a distinct user intent or keyword cluster (not just cosmetic variations)\n`;
    p += `- Seasonal CPPs (holiday, back-to-school, new year) can be scheduled and rotated\n`;
    p += `- CPPs are created in App Store Connect › Custom Product Pages\n`;
    p += `- Deep-link format: apps.apple.com/app/[id]?ppid=[CPP-ID]\n\n`;

    p += `## STRATEGY REQUIREMENTS\n`;
    p += `- Identify 3-5 distinct keyword clusters or user personas that justify dedicated CPPs\n`;
    p += `- For EACH CPP: specify the target keyword/intent, the hero screenshot concept, supporting screenshots, and promotional text angle\n`;
    p += `- Explain how each CPP's screenshot captions should differ from the default page for OCR optimization\n`;
    p += `- Include an Apple Search Ads integration plan (which ad groups link to which CPPs)\n`;
    p += `- Suggest seasonal/event CPP opportunities if relevant\n`;
    p += `- Provide measurement framework (what KPIs to track per CPP)\n\n`;
  } else {
    p += `## ANDROID CUSTOM STORE LISTINGS — RULES & BEST PRACTICES\n`;
    p += `- Google Play supports multiple custom store listings per app\n`;
    p += `- Each listing can customize: title, short description, full description, icon, screenshots, feature graphic, and video\n`;
    p += `- Custom listings can be targeted by: country/region, pre-registration status, or Google Ads campaigns\n`;
    p += `- Country-specific listings should use locally researched keywords (not just translated)\n`;
    p += `- Custom listings for paid campaigns serve as keyword-specific landing pages\n`;
    p += `- Create in Google Play Console › Store presence › Custom store listings\n\n`;

    p += `## STRATEGY REQUIREMENTS\n`;
    p += `- Identify 3-5 target segments that justify dedicated custom listings (countries, user types, campaign audiences)\n`;
    p += `- For EACH listing: specify the target segment, tailored title, short description, screenshot strategy, and description angle\n`;
    p += `- Include country-specific keyword research recommendations (not just translations)\n`;
    p += `- Provide a Google Ads integration plan (linking campaigns to specific listings)\n`;
    p += `- Suggest measurement framework\n\n`;
  }

  p += `Return JSON:\n{\n`;
  p += `  "assessment": "Overall ${featureName} opportunity assessment for this specific app",\n`;
  p += `  "currentState": "What the app currently has (or lacks) in terms of ${featureName}",\n`;
  p += `  "priority": "high | medium | low",\n`;
  p += `  "reasoning": "Why this priority level — with category-specific and app-specific reasoning",\n`;
  p += `  "pages": [\n`;
  p += `    {\n`;
  p += `      "name": "Descriptive name for this ${isIos ? "CPP" : "listing"} (e.g. 'Workout Focused' or 'Germany Market')",\n`;
  p += `      "targetIntent": "The keyword cluster, user persona, or segment this targets",\n`;
  p += `      "heroScreenshot": "What the first screenshot should show and its caption",\n`;
  p += `      "supportingScreenshots": ["Brief description of screenshot 2", "Screenshot 3", "Screenshot 4"],\n`;
  if (isIos) {
    p += `      "promotionalText": "The promotional text angle for this CPP (up to 170 chars)",\n`;
    p += `      "captionKeywords": ["keyword1", "keyword2", "keyword3"],\n`;
  } else {
    p += `      "title": "Tailored title for this listing",\n`;
    p += `      "shortDescription": "Tailored short description (80 chars max)",\n`;
  }
  p += `      "adIntegration": "How to link this to ${isIos ? "Apple Search Ads" : "Google Ads"} campaigns",\n`;
  p += `      "expectedImpact": "Expected conversion impact"\n`;
  p += `    }\n`;
  p += `  ],\n`;
  p += `  "seasonalOpportunities": ["Seasonal or event-based ${isIos ? "CPP" : "listing"} opportunities"],\n`;
  p += `  "measurementPlan": "What KPIs to track and how to measure success per ${isIos ? "CPP" : "listing"}",\n`;
  p += `  "implementationSteps": ["Step 1", "Step 2", "Step 3"],\n`;
  p += `  "suggestions": ["Specific actionable recommendation 1", "Recommendation 2"]\n`;
  p += `}`;
  return p;
}

function getDeepDivePromptAndConfig(section: DeepDiveSection, data: AppData): {
  systemPrompt: string;
  prompt: string;
  maxOutputTokens: number;
  needsImages: boolean;
} {
  switch (section) {
    case "description":
      return {
        systemPrompt: TEXT_SYSTEM_PROMPT,
        prompt: buildDescriptionDeepDivePrompt(data),
        maxOutputTokens: 16384,
        needsImages: false,
      };
    case "screenshots":
      return {
        systemPrompt: VISUAL_SYSTEM_PROMPT,
        prompt: buildScreenshotsDeepDivePrompt(data),
        maxOutputTokens: 16384,
        needsImages: true,
      };
    case "title":
      return {
        systemPrompt: TEXT_SYSTEM_PROMPT,
        prompt: buildTitleDeepDivePrompt(data),
        maxOutputTokens: 8192,
        needsImages: false,
      };
    case "subtitle":
      return {
        systemPrompt: TEXT_SYSTEM_PROMPT,
        prompt: buildSubtitleDeepDivePrompt(data),
        maxOutputTokens: 4096,
        needsImages: false,
      };
    case "keywords":
      return {
        systemPrompt: TEXT_SYSTEM_PROMPT,
        prompt: buildKeywordsDeepDivePrompt(data),
        maxOutputTokens: 4096,
        needsImages: false,
      };
    case "shortDescription":
      return {
        systemPrompt: TEXT_SYSTEM_PROMPT,
        prompt: buildShortDescriptionDeepDivePrompt(data),
        maxOutputTokens: 4096,
        needsImages: false,
      };
    case "icon":
      return {
        systemPrompt: VISUAL_SYSTEM_PROMPT,
        prompt: buildIconDeepDivePrompt(data),
        maxOutputTokens: 4096,
        needsImages: true,
      };
    case "video":
      return {
        systemPrompt: TEXT_SYSTEM_PROMPT,
        prompt: buildVideoDeepDivePrompt(data),
        maxOutputTokens: 8192,
        needsImages: false,
      };
    case "ratings":
      return {
        systemPrompt: TEXT_SYSTEM_PROMPT,
        prompt: buildRatingsDeepDivePrompt(data),
        maxOutputTokens: 8192,
        needsImages: false,
      };
    case "maintenance":
      return {
        systemPrompt: TEXT_SYSTEM_PROMPT,
        prompt: buildMaintenanceDeepDivePrompt(data),
        maxOutputTokens: 8192,
        needsImages: false,
      };
    case "localization":
      return {
        systemPrompt: TEXT_SYSTEM_PROMPT,
        prompt: buildLocalizationDeepDivePrompt(data),
        maxOutputTokens: 8192,
        needsImages: false,
      };
    case "cpp":
      return {
        systemPrompt: TEXT_SYSTEM_PROMPT,
        prompt: buildCppDeepDivePrompt(data),
        maxOutputTokens: 12288,
        needsImages: false,
      };
    default:
      return {
        systemPrompt: TEXT_SYSTEM_PROMPT,
        prompt: buildTextPrompt(data),
        maxOutputTokens: 8192,
        needsImages: false,
      };
  }
}

export async function runDeepDive(
  appData: AppData,
  section: DeepDiveSection,
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("Deep-dive skipped: no GEMINI_API_KEY");
    return null;
  }

  console.log(`Deep-dive [${section}]: Starting — iconUrl=${!!appData.iconUrl}, screenshots=${appData.screenshots?.length ?? 0}`);

  const config = getDeepDivePromptAndConfig(section, appData);
  const parts: Record<string, unknown>[] = [{ text: config.prompt }];
  let attachedImages = 0;

  if (config.needsImages) {
    const imageUrls: { url: string; label: string }[] = [];

    if (section === "icon" && appData.iconUrl) {
      imageUrls.push({ url: appData.iconUrl, label: "App icon:" });
    }
    if (section === "icon" && appData.featureGraphicUrl) {
      imageUrls.push({ url: appData.featureGraphicUrl, label: "Feature graphic:" });
    }
    if (section === "screenshots") {
      if (appData.iconUrl) imageUrls.push({ url: appData.iconUrl, label: "App icon (for context):" });
      const screenshotUrls = (appData.screenshots || []).slice(0, 8);
      for (let i = 0; i < screenshotUrls.length; i++) {
        imageUrls.push({ url: screenshotUrls[i], label: `Screenshot ${i + 1} of ${screenshotUrls.length}:` });
      }
    }

    console.log(`Deep-dive [${section}]: ${imageUrls.length} image URLs to download`);

    if (imageUrls.length > 0) {
      const downloads = await Promise.all(imageUrls.map(({ url }) => downloadImageAsBase64(url)));
      let totalBytes = 0;
      for (let i = 0; i < downloads.length; i++) {
        const img = downloads[i];
        if (img) {
          const imgBytes = img.data.length * 0.75;
          if (totalBytes + imgBytes > 12_000_000) {
            console.log(`Deep-dive [${section}]: Skipping ${imageUrls[i].label} — would exceed 12MB cap`);
            break;
          }
          totalBytes += imgBytes;
          parts.push({ text: imageUrls[i].label });
          parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
          attachedImages++;
        } else {
          console.log(`Deep-dive [${section}]: Failed to download ${imageUrls[i].label} — ${imageUrls[i].url.substring(0, 80)}`);
        }
      }
      console.log(`Deep-dive [${section}]: ${attachedImages}/${downloads.length} images attached, ${(totalBytes / 1_000_000).toFixed(1)}MB`);
    }

    if (attachedImages === 0 && config.needsImages) {
      console.error(`Deep-dive [${section}]: No images attached but visual analysis required — this will likely produce poor results`);
    }
  }

  const result = await callGeminiWithFallback(apiKey, {
    systemPrompt: config.systemPrompt,
    parts,
    maxOutputTokens: config.maxOutputTokens,
    timeoutMs: 90000,
    label: `DEEP-DIVE-${section.toUpperCase()}`,
    throwOnError: true,
  });

  console.log(`Deep-dive [${section}]: ${result ? "SUCCESS" : "FAILED"}`);
  return result;
}

// ---------------------------------------------------------------------------
// Visual concept generation — gemini-3.1-flash-image-preview
// ---------------------------------------------------------------------------

export interface VisualConcept {
  data: string;
  mimeType: string;
  label: string;
  commentary: string;
}

async function callGeminiImageGen(
  apiKey: string,
  prompt: string,
  images: { data: string; mimeType: string; label: string }[],
  timeoutMs = 30000,
  label = "IMG-GEN",
): Promise<{ imageData: string; imageMime: string; text: string } | null> {
  const t0 = Date.now();
  const parts: Record<string, unknown>[] = [];

  for (const img of images) {
    parts.push({ text: img.label });
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  }
  parts.push({ text: prompt });

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      temperature: 0.8,
    },
  };

  const bodyJson = JSON.stringify(body);
  console.log(`ImageGen [${label}]: ${(bodyJson.length / 1_000_000).toFixed(2)}MB payload, sending...`);

  try {
    const resp = await fetch(`${IMAGE_GEN_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyJson,
      signal: AbortSignal.timeout(timeoutMs),
    });

    const elapsed = Date.now() - t0;

    if (!resp.ok) {
      const err = await resp.text();
      console.error(`ImageGen [${label}]: ${resp.status} after ${elapsed}ms:`, err.substring(0, 300));
      throw new Error(`Image generation API returned ${resp.status}: ${err.substring(0, 200)}`);
    }

    const result = await resp.json();
    const candidateParts = result?.candidates?.[0]?.content?.parts;
    if (!candidateParts?.length) {
      console.error(`ImageGen [${label}]: No parts returned after ${elapsed}ms`);
      throw new Error("Image generation returned no content");
    }

    let imageData = "";
    let imageMime = "image/png";
    let text = "";

    for (const part of candidateParts) {
      if (part.inlineData) {
        imageData = part.inlineData.data;
        imageMime = part.inlineData.mimeType || "image/png";
      }
      if (part.text) {
        text += part.text;
      }
    }

    if (!imageData) {
      console.error(`ImageGen [${label}]: Response had parts but no image data after ${elapsed}ms`);
      throw new Error("Image generation returned text but no image");
    }

    const rawBytes = imageData.length * 0.75;
    console.log(`ImageGen [${label}]: Success in ${elapsed}ms, image ${(rawBytes / 1_000).toFixed(0)}KB, text ${text.length} chars`);

    return { imageData, imageMime, text };
  } catch (error) {
    const elapsed = Date.now() - t0;
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`ImageGen [${label}]: Failed after ${elapsed}ms:`, msg);
    throw error;
  }
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[✅❌▢•]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Structured design context extracted from deep-dive briefs */
interface ExtractedDesignContext {
  type: "icon-deepdive" | "screenshot-deepdive" | "fallback";
  text: string;
  // screenshot deep-dive specifics
  perSlot?: { slot: number; caption: string; whatToShow: string; designBrief?: string }[];
  missingSlots?: { slot: number; caption: string; whatToShow: string; designBrief?: string }[];
  overallAssessment?: string;
  visualIdentity?: string;
  firstThreeVerdict?: string;
  galleryReorderSuggestion?: string;
  commonMistakes?: string[];
}

function extractDesignDirection(brief: string): string {
  const ctx = extractDesignContext(brief);
  return ctx.text;
}

function extractDesignContext(brief: string): ExtractedDesignContext {
  // ── ICON DEEP-DIVE ─────────────────────────────────────────────────────────
  const redesignMatch = brief.match(/Redesign brief for designer[:\s*\n]+([\s\S]+?)(?:\n---|\n\*\*Actionable|\n\*\*Icon specs|$)/i);
  if (redesignMatch) {
    const colorMatch = brief.match(/Color analysis[:\s*\n]+([\s\S]+?)(?:\n\n\*\*|\n---|\n✅|$)/i);
    const competitorMatch = brief.match(/Category comparison[:\s*\n]+([\s\S]+?)(?:\n\n\*\*|\n---|\n✅|$)/i);
    const issuesMatch = brief.match(/Issues found[:\s*\n]+([\s\S]+?)(?:\n\n\*\*|\n---|\n✅|$)/i);
    const strengthsMatch = brief.match(/Strengths[:\s*\n]+([\s\S]+?)(?:\n\n\*\*|\n---|\n❌|$)/i);

    const parts: string[] = [];
    if (redesignMatch[1]?.trim()) parts.push(`REDESIGN BRIEF:\n${redesignMatch[1].trim()}`);
    if (colorMatch?.[1]?.trim()) parts.push(`COLOR ANALYSIS:\n${colorMatch[1].trim()}`);
    if (competitorMatch?.[1]?.trim()) parts.push(`CATEGORY CONTEXT:\n${competitorMatch[1].trim()}`);
    if (issuesMatch?.[1]?.trim()) parts.push(`CURRENT ICON ISSUES TO FIX:\n${issuesMatch[1].trim()}`);
    if (strengthsMatch?.[1]?.trim()) parts.push(`ELEMENTS TO PRESERVE:\n${strengthsMatch[1].trim()}`);
    return { type: "icon-deepdive", text: parts.join("\n\n").substring(0, 3000) };
  }

  // ── SCREENSHOT DEEP-DIVE ───────────────────────────────────────────────────
  if (brief.includes("AI Screenshot Analysis") && brief.includes("deep-dive")) {
    const perSlot: ExtractedDesignContext["perSlot"] = [];
    const missingSlots: ExtractedDesignContext["missingSlots"] = [];

    // Extract per-slot data
    const slotBlocks = brief.matchAll(/✅ \*\*Slot (\d+):\*\*\n([\s\S]+?)(?=\n  ✅ \*\*Slot |\n\*\*Missing|\n\*\*Common|$)/g);
    for (const block of slotBlocks) {
      const slotNum = parseInt(block[1]);
      const content = block[2];
      const captionMatch = content.match(/Suggested captions?: "([^"]+)"/);
      const captionMultiMatch = content.match(/Suggested captions: (.+)/);
      const whatMatch = content.match(/Shows: (.+)/);
      const briefMatch = content.match(/Design brief: (.+)/);
      const caption = captionMatch?.[1]
        || captionMultiMatch?.[1]?.match(/"([^"]+)"/)?.[1]
        || "";
      if (caption || whatMatch?.[1]) {
        perSlot.push({
          slot: slotNum,
          caption: caption.substring(0, 40),
          whatToShow: whatMatch?.[1]?.substring(0, 120) || "",
          designBrief: briefMatch?.[1]?.substring(0, 200),
        });
      }
    }

    // Extract missing slots
    const missingBlocks = brief.matchAll(/❌ \*\*Slot (\d+):\*\*\n([\s\S]+?)(?=\n  ❌ \*\*Slot |\n\*\*Common|$)/g);
    for (const block of missingBlocks) {
      const slotNum = parseInt(block[1]);
      const content = block[2];
      const captionMatch = content.match(/Suggested caption: "([^"]+)"/);
      const whatMatch = content.match(/What to show: (.+)/);
      if (captionMatch?.[1] || whatMatch?.[1]) {
        missingSlots.push({
          slot: slotNum,
          caption: captionMatch?.[1]?.substring(0, 40) || "",
          whatToShow: whatMatch?.[1]?.substring(0, 120) || "",
        });
      }
    }

    // Extract top-level fields
    const overallMatch = brief.match(/AI Screenshot Analysis[^:]*:\*?\n([^\n*]+(?:\n[^\n*]+)*?)(?=\n\*\*Gallery coherence|\n\*\*Visual)/i);
    const visualIdentityMatch = brief.match(/Visual identity[:\s*\n]+([^\n]+)/i);
    const firstThreeMatch = brief.match(/First 3 Rule verdict[:\s*\n]+([^\n]+)/i);
    const reorderMatch = brief.match(/Reorder suggestion[:\s*\n]+([^\n]+(?:\n(?!\n)[^\n]+)*)/i);
    const mistakesSection = brief.match(/Common mistakes detected[:\s*\n]+([\s\S]+?)(?=\n\n\*\*|$)/i);
    const commonMistakes = mistakesSection?.[1]
      ?.split("\n")
      .filter(l => l.includes("❌"))
      .map(l => l.replace(/^\s*❌\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 5) || [];

    // Build text summary for the prompt
    const parts: string[] = [];

    if (overallMatch?.[1]?.trim()) {
      parts.push(`OVERALL GALLERY ASSESSMENT:\n${overallMatch[1].trim()}`);
    }
    if (firstThreeMatch?.[1]?.trim()) {
      parts.push(`FIRST 3 SCREENSHOTS VERDICT:\n${firstThreeMatch[1].trim()}`);
    }
    if (visualIdentityMatch?.[1]?.trim()) {
      parts.push(`CURRENT VISUAL IDENTITY:\n${visualIdentityMatch[1].trim()}`);
    }
    if (commonMistakes.length > 0) {
      parts.push(`MISTAKES TO FIX IN NEW DESIGN:\n${commonMistakes.map(m => `• ${m}`).join("\n")}`);
    }
    if (reorderMatch?.[1]?.trim()) {
      parts.push(`GALLERY ORDER DIRECTION:\n${reorderMatch[1].trim()}`);
    }
    if (perSlot.length > 0) {
      const slotLines = perSlot.map(s =>
        `  Slot ${s.slot}: Caption → "${s.caption}" | Shows: ${s.whatToShow}${s.designBrief ? ` | Design brief: ${s.designBrief}` : ""}`
      );
      parts.push(`CAPTION & CONTENT DIRECTION PER SLOT (from AI analysis):\n${slotLines.join("\n")}`);
    }
    if (missingSlots.length > 0) {
      const missingLines = missingSlots.map(s =>
        `  Slot ${s.slot}: Caption → "${s.caption}" | Shows: ${s.whatToShow}`
      );
      parts.push(`NEW SCREENSHOTS TO ADD:\n${missingLines.join("\n")}`);
    }

    return {
      type: "screenshot-deepdive",
      text: parts.join("\n\n").substring(0, 4000),
      perSlot,
      missingSlots,
      overallAssessment: overallMatch?.[1]?.trim(),
      visualIdentity: visualIdentityMatch?.[1]?.trim(),
      firstThreeVerdict: firstThreeMatch?.[1]?.trim(),
      galleryReorderSuggestion: reorderMatch?.[1]?.trim(),
      commonMistakes,
    };
  }

  // ── FALLBACK: keyword-filtered lines ──────────────────────────────────────
  const cleaned = stripMarkdown(brief);
  const lines = cleaned.split("\n").filter(l => l.trim().length > 0);
  const designLines = lines.filter(l => {
    const lower = l.toLowerCase();
    return lower.includes("color") || lower.includes("design") || lower.includes("style")
      || lower.includes("suggest") || lower.includes("issue") || lower.includes("improve")
      || lower.includes("redesign") || lower.includes("contrast") || lower.includes("shape")
      || lower.includes("visual") || lower.includes("compet") || lower.includes("assess")
      || lower.includes("brand") || lower.includes("recogni") || lower.includes("palette")
      || lower.includes("icon") || lower.includes("screenshot") || lower.includes("font")
      || lower.includes("caption") || lower.includes("feature") || lower.includes("dark")
      || lower.includes("light") || lower.includes("gradient") || lower.includes("flat");
  });
  return {
    type: "fallback",
    text: designLines.slice(0, 20).join("\n") || cleaned.substring(0, 2000),
  };
}

function buildIconConceptPrompt(appData: AppData, brief: string): string {
  const desc = (appData.description || "").substring(0, 600);
  const designDirection = extractDesignContext(brief).text;

  return `You are a senior brand designer at a top-tier mobile design studio (think Ueno, Fantasy, Work & Co). You are designing a real production app icon for submission to the App Store / Google Play today.

APP: ${appData.title}
CATEGORY: ${appData.category || "Apps"}
WHAT IT DOES: ${desc}
${appData.subtitle ? `TAGLINE: ${appData.subtitle}` : ""}

AUDIT FINDINGS — use everything below as your primary design brief. If a "REDESIGN BRIEF" section is present, it was written by an expert ASO analyst specifically for this icon and is your single most important input. Follow it precisely.

${designDirection}

ICON DESIGN BRIEF:
Design a single-element icon with absolute clarity. The icon should communicate what the app does in one symbol — like a pictogram, not an illustration. Think of the icon as a road sign: maximum information, minimum detail.

COMPOSITION RULES:
- One dominant foreground element fills ~55-65% of the canvas, centered
- Solid, flat or subtly textured background — NO gradients-as-background, NO glows, NO bloom, NO lens flares
- The subject is a clean, solid shape — vector-like, flat or with one level of dimensionality
- Generous padding: the subject doesn't touch the edges
- Square canvas — no rounded corners in your image (OS applies them)
- No text, no letters, no numbers, no words anywhere on the icon

WHAT NOT TO DO (these are the AI clichés to avoid):
- No floating 3D spheres, orbs, or glowing balls
- No "glass morphism" blobs or frosted panels
- No neon glows, outer glows, or drop shadows with colored halos
- No generic gradient mesh backgrounds
- No lens flares, light streaks, bokeh, or depth-of-field effects
- No isometric 3D screenshots inside the icon
- No collage of multiple small elements — pick ONE symbol
- No stock-photography-style composite imagery

REFERENCE QUALITY LEVEL: Headspace (orange dot), Duolingo (green owl), Notion (N on white), Calm (blue gradient done simply), Spotify (black + green audio bars), Robinhood (green feather on black) — each is ONE clear element on a strong background.

Generate exactly ONE sharp, flat-design app icon ready for real submission.`;
}

function buildScreenshotMoodboardPrompt(appData: AppData, brief: string): string {
  const isIOS = appData.platform === "ios";
  const desc = (appData.description || "").substring(0, 800);
  const ctx = extractDesignContext(brief);
  const frameCount = isIOS ? 5 : 4;
  const deviceLabel = isIOS
    ? "iPhone 16 Pro (thin bezels, Dynamic Island notch at top center, no home button)"
    : "Pixel 9 (thin bezels, pill-shaped punch-hole camera top center)";

  // Build frame-level direction — use deep-dive per-slot data if available, else generic
  const frameDirections: string[] = [];
  const allSlots = [
    ...(ctx.perSlot || []),
    ...(ctx.missingSlots || []),
  ].sort((a, b) => a.slot - b.slot).slice(0, frameCount);

  if (ctx.type === "screenshot-deepdive" && allSlots.length > 0) {
    // Populate as many frames as we have slot data for, fill rest with generic
    const roleLabels = ["HERO — core value proposition", "DIFFERENTIATOR — what makes it unique", "PROOF / FEATURE — outcome or social proof", "SECONDARY FEATURE", "CTA / CLOSING MESSAGE"];
    for (let i = 0; i < frameCount; i++) {
      const slot = allSlots[i];
      const role = roleLabels[i] || `FRAME ${i + 1}`;
      if (slot) {
        const captionText = slot.caption ? `"${slot.caption}"` : "(benefit-focused caption)";
        const uiNote = slot.designBrief || slot.whatToShow || "app UI";
        frameDirections.push(`Frame ${i + 1} — ${role}:\n  Caption: ${captionText}\n  UI to show: ${uiNote}`);
      } else {
        frameDirections.push(`Frame ${i + 1} — ${role}: derive from app description`);
      }
    }
  } else {
    frameDirections.push(`Frame 1 — HERO: Core value proposition caption + main app UI`);
    frameDirections.push(`Frame 2 — DIFFERENTIATOR: What makes it unique + standout feature screen`);
    frameDirections.push(`Frame 3 — PROOF / FEATURE: Outcome or social proof caption + most-used screen`);
    frameDirections.push(`Frame 4 — SECONDARY FEATURE: Second key feature caption + UI`);
    if (isIOS) frameDirections.push(`Frame 5 — CTA: Compelling closing message + clean UI`);
  }

  const deepDiveContext = ctx.type === "screenshot-deepdive"
    ? `DEEP-DIVE ANALYSIS FINDINGS — follow these precisely, they come from an expert visual audit of this specific app:
${ctx.text}

The captions and UI direction per frame above are directly derived from this analysis. Use them as the primary creative brief.`
    : `AUDIT FINDINGS — use to inform visual and copy direction:
${ctx.text}`;

  return `You are a senior app marketing designer at a growth agency. You are creating a screenshot gallery creative brief for a developer to hand off to their design team. This must look like a real professional design deliverable — the kind you'd see from Mobbin, SplitMetrics, or a top ASO agency.

APP: ${appData.title}
PLATFORM: ${isIOS ? "iOS App Store" : "Google Play Store"}
WHAT IT DOES: ${desc}
${appData.subtitle ? `TAGLINE: ${appData.subtitle}` : ""}

${deepDiveContext}

CREATE A SCREENSHOT GALLERY CONCEPT showing ${frameCount} sequential screenshots laid out horizontally, like a preview strip. This is a VISUAL BRIEF, not a finished product — but it must show concrete, specific creative direction.

LAYOUT:
- ${frameCount} portrait device frames side-by-side on a dark (#111 or #0d0d0d) background, slight gap between each
- Device frame style: ${deviceLabel}
- Each frame: tall portrait ratio (~9:19.5), clean dark gray device outline, no excessive drop shadow
- Small number label below each frame: "1", "2", "3"...

EXACT FRAME CONTENT (follow this precisely):
${frameDirections.join("\n")}

CAPTION RENDERING RULES (non-negotiable):
- Render the captions above as ACTUAL READABLE TEXT on each frame — large, bold, white, in the top 25% of the frame
- Font: bold sans-serif (Helvetica Neue Bold / SF Pro Bold style), 28-36pt equivalent
- 2-4 words maximum — readable at thumbnail size
- Benefit-focused, not feature-focused:
  RIGHT: "Sleep Better Tonight", "Never Miss a Deadline", "Track Any Habit", "Save 2 Hours Weekly"
  WRONG: "Push Notifications", "Calendar Integration", "Settings Panel", "User Interface"

UI AREA (below the caption):
- Show simplified but recognizable UI elements — real shapes like cards, lists, charts, audio waveforms, progress bars, maps — whatever matches this app's category
- NOT a flat solid color block — actual UI anatomy
- Background color consistent with app brand identity

BOTTOM PANEL:
- 4-5 color palette swatches with hex codes derived from the app's brand
- Typography specimen: "Caption Style" in bold sans-serif, "Body Style" in regular weight — both labeled

WHAT NOT TO DO:
- Do NOT fill the UI area with a flat color — show recognizable UI shapes
- Do NOT use gradient rainbow or generic AI-looking backgrounds
- Do NOT use "Caption Here", "Lorem ipsum", or any placeholder text — use the actual captions specified above
- Do NOT add excessive annotations or arrows — clean layout only
- Captions must be legible rendered text, not decorative marks

REFERENCE QUALITY: Top ASO agency screenshot brief — clean, dark, professional, frame content directly informed by real analysis of this specific app.

Generate ONE comprehensive screenshot gallery concept image.`;
}

export async function generateVisualConcepts(
  appData: AppData,
  section: "icon" | "screenshots",
  brief: string,
): Promise<VisualConcept[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const concepts: VisualConcept[] = [];

  if (section === "icon") {
    const images: { data: string; mimeType: string; label: string }[] = [];

    if (appData.iconUrl) {
      const icon = await downloadImageAsBase64(appData.iconUrl);
      if (icon) {
        images.push({ data: icon.data, mimeType: icon.mimeType, label: "Current app icon (for reference — the redesign should be distinctly different):" });
      }
    }

    const prompts = [
      {
        label: "Bold & Saturated",
        suffix: "\n\nSTYLE DIRECTION A — Bold & Saturated:\nSolid, high-saturation background color (one dominant hue, no gradients). Foreground symbol in white or contrasting solid color. Think Duolingo, YouTube, or Robinhood — one strong color, one clear shape. No shading, no drop shadows on the symbol. Flat and punchy.",
      },
      {
        label: "Dark & Premium",
        suffix: "\n\nSTYLE DIRECTION B — Dark & Premium:\nDeep dark background (#0d0d0d, deep navy, or rich dark teal). Single foreground symbol in a crisp accent color (gold, electric blue, soft white, or brand color). Think Spotify, Things 3, or Craft. Refined and premium. Symbol has clean vector edges — no glow, no blur, no inner shadows.",
      },
      {
        label: "Light & Minimal",
        suffix: "\n\nSTYLE DIRECTION C — Light & Minimal:\nOff-white or very light background. One simple symbol in a single medium-dark color. Lots of breathing room — symbol is well-centered with generous padding. Think Notion, Bear, or Linear. No decoration beyond the essential symbol. Elegant restraint.",
      },
      {
        label: "Geometric & Distinctive",
        suffix: "\n\nSTYLE DIRECTION D — Geometric & Distinctive:\nBold, abstract geometric composition that doesn't literally depict the app function, but creates a strong, ownable visual identity. Think Figma (overlapping shapes), Stripe (diagonal gradient stripe), Dropbox (open box wireframe). Use 2-3 geometric shapes maximum. Background is a single solid or very subtle two-tone color. Distinctive within the category — deliberately avoids the 'obvious' icon choice.",
      },
    ];

    const results = await Promise.allSettled(
      prompts.map((p, i) =>
        callGeminiImageGen(
          apiKey,
          buildIconConceptPrompt(appData, brief) + p.suffix,
          images,
          30000,
          `ICON-${i + 1}`,
        ),
      ),
    );

    const MAX_TOTAL_B64 = 3_500_000;
    let totalB64 = 0;

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled" && r.value) {
        const imgSize = r.value.imageData.length;
        if (totalB64 + imgSize > MAX_TOTAL_B64) {
          console.log(`Icon concept ${i + 1}: Skipped (${(imgSize * 0.75 / 1_000_000).toFixed(1)}MB) — would exceed ${(MAX_TOTAL_B64 * 0.75 / 1_000_000).toFixed(1)}MB response cap`);
          continue;
        }
        totalB64 += imgSize;
        concepts.push({
          data: r.value.imageData,
          mimeType: r.value.imageMime,
          label: prompts[i].label,
          commentary: r.value.text || "",
        });
      } else {
        const reason = r.status === "rejected" ? (r.reason instanceof Error ? r.reason.message : String(r.reason)) : "No image returned";
        console.error(`Icon concept ${i + 1} (${prompts[i].label}) failed: ${reason}`);
      }
    }
  } else if (section === "screenshots") {
    const images: { data: string; mimeType: string; label: string }[] = [];

    if (appData.iconUrl) {
      const icon = await downloadImageAsBase64(appData.iconUrl);
      if (icon) {
        images.push({ data: icon.data, mimeType: icon.mimeType, label: "App icon (for brand color reference):" });
      }
    }

    const firstScreenshot = appData.screenshots?.[0];
    if (firstScreenshot) {
      const ss = await downloadImageAsBase64(firstScreenshot);
      if (ss) {
        images.push({ data: ss.data, mimeType: ss.mimeType, label: "Current screenshot #1 (for reference on what exists today):" });
      }
    }

    const result = await callGeminiImageGen(
      apiKey,
      buildScreenshotMoodboardPrompt(appData, brief),
      images,
      30000,
      "MOODBOARD",
    );

    if (result) {
      concepts.push({
        data: result.imageData,
        mimeType: result.imageMime,
        label: "Gallery Moodboard",
        commentary: result.text || "",
      });
    }
  }

  if (concepts.length === 0) {
    throw new Error(`No visual concepts could be generated for ${section}`);
  }

  return concepts;
}
