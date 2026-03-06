import type { AppData } from "./aso-rules";
import type { DeepDiveSection } from "./action-plan";

const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_MODEL_LITE = "gemini-3.1-flash-lite-preview";
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
  };
  subtitle?: {
    issues: string[];
    suggestions: string[];
    reasoning: string;
  };
  shortDescription?: {
    issues: string[];
    suggestions: string[];
    reasoning: string;
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
  };
  screenshots: {
    overallAssessment: string;
    galleryCoherence: number;
    firstThreeVerdict: string;
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
| Title | 50 chars | Most heavily weighted for search ranking |
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
- Use every available character — unused chars = wasted ranking potential
- iOS: 30 chars max | Android: 50 chars max

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
- Within character limits (iOS title ≤30, Android title ≤50, subtitle ≤30, short desc ≤80, promo text ≤170)
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
  const titleMax = isIOS ? 30 : 50;

  let p = `Analyze this ${isIOS ? "iOS App Store" : "Google Play"} listing metadata comprehensively.\n\n`;

  p += `## METADATA\n`;
  p += `**Title:** "${data.title}" (${data.title.length}/${titleMax} chars)\n`;
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

  p += `Return JSON matching this exact structure:\n{\n`;
  p += `  "title": {\n`;
  p += `    "issues": ["specific issue observed in the current title"],\n`;
  p += `    "suggestions": ["Title Option 1 (≤${titleMax}ch)", "Title Option 2", "Title Option 3"],\n`;
  p += `    "reasoning": "Why these changes improve ranking and conversion"\n`;
  p += `  },\n`;

  if (isIOS) {
    p += `  "subtitle": {\n`;
    p += `    "issues": ["specific issue"],\n`;
    p += `    "suggestions": ["Subtitle Option 1 (≤30ch)", "Subtitle Option 2"],\n`;
    p += `    "reasoning": "Why — zero overlap with title"\n`;
    p += `  },\n`;
    p += `  "keywordField": {\n`;
    p += `    "suggestedKeywords": ["keyword1", "keyword2", "...up to 20 single words that complement title+subtitle"],\n`;
    p += `    "avoidKeywords": ["word already in title", "plural form", "category name"],\n`;
    p += `    "reasoning": "Strategy explanation"\n`;
    p += `  },\n`;
    p += `  "promotionalText": {\n`;
    p += `    "suggestions": ["Promotional text option 1 (≤170ch)", "Option 2 (≤170ch)"],\n`;
    p += `    "reasoning": "Why these drive conversion"\n`;
    p += `  },\n`;
  } else {
    p += `  "shortDescription": {\n`;
    p += `    "issues": ["specific issue"],\n`;
    p += `    "suggestions": ["Short desc option 1 (≤80ch)", "Option 2 (≤80ch)"],\n`;
    p += `    "reasoning": "Why — front-load primary keyword"\n`;
    p += `  },\n`;
  }

  p += `  "description": {\n`;
  p += `    "fullRewrite": "A COMPLETE, READY-TO-PASTE rewritten description for THIS app (${isIOS ? "1,000-4,000" : "2,500-4,000"} chars). Include: compelling opening hook, feature bullets with benefits, social proof, and CTA. Use real app features from the description above. ${!isIOS ? "Front-load primary keywords and use them 3-5x naturally." : ""} No brackets, no placeholders, no [insert here] — write the actual final copy.",\n`;
  p += `    "openingHook": "Just the opening 2-3 sentences extracted from the fullRewrite above (for separate display).",\n`;
  p += `    "featureBullets": ["• Benefit-focused bullet 1", "• Bullet 2", "...5-8 bullets extracted from the fullRewrite"],\n`;
  p += `    "cta": "Just the closing CTA paragraph extracted from the fullRewrite",\n`;
  p += `    "keywordGaps": ["keyword not found in current description that should be added"],\n`;
  p += `    "structureIssues": ["specific structural problem observed in the CURRENT description"]`;

  if (!isIOS) {
    p += `,\n    "keywordDensity": [\n`;
    p += `      { "keyword": "primary keyword", "currentCount": 2, "recommendedCount": 5 },\n`;
    p += `      { "keyword": "secondary keyword", "currentCount": 0, "recommendedCount": 3 }\n`;
    p += `    ]\n`;
  } else {
    p += `\n`;
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
  p += `    "suggestions": ["specific improvement"]\n`;
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

  p += `    "commonMistakesFound": ["List any of the 12 common screenshot mistakes you observe in these actual screenshots"]`;

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
  // Attempt 1: primary model
  try {
    const result = await callGemini(apiKey, opts);
    if (result) return result;
  } catch {
    // primary failed — fall through to lite
  }

  // Attempt 2: lite model with same timeout
  console.log(`AI [${opts.label}]: Primary failed, retrying with LITE model...`);
  try {
    const result = await callGemini(apiKey, {
      ...opts,
      modelUrl: GEMINI_URL_LITE,
      label: `${opts.label}-LITE`,
      throwOnError: false,
    });
    if (result) {
      console.log(`AI [${opts.label}-LITE]: Fallback succeeded`);
      return result;
    }
  } catch {
    // lite also failed
  }

  console.error(`AI [${opts.label}]: Both primary and lite models failed`);
  if (opts.throwOnError) throw new Error(`AI analysis failed on both primary and lite models`);
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
  p += `  "galleryReorderSuggestion": "If the current order is suboptimal, suggest a better order with reasoning",\n`;
  p += `  "ocrOptimization": "Assessment of caption text for Apple OCR indexing (font size, contrast, positioning)"\n`;
  p += `}`;
  return p;
}

function buildTitleDeepDivePrompt(data: AppData): string {
  const isIOS = data.platform === "ios";
  const titleMax = isIOS ? 30 : 50;
  let p = `You are a senior ASO consultant. Provide an exhaustive TITLE optimization analysis.\n\n`;

  p += `## FIELD BEING ANALYZED: APP TITLE\n`;
  p += `**HARD CHARACTER LIMIT: ${titleMax} characters** (${isIOS ? "iOS App Store" : "Google Play Store"})\n`;
  p += `**EVERY variant you suggest MUST be ≤${titleMax} characters. No exceptions.**\n\n`;

  p += `## CURRENT APP METADATA\n`;
  p += `**Current title:** "${data.title}" (${data.title.length}/${titleMax} chars)\n`;
  if (isIOS) {
    p += data.subtitle
      ? `**Current subtitle:** "${data.subtitle}" (${data.subtitle.length}/30 chars)\n`
      : `**Current subtitle:** (not set — empty, 30 chars available)\n`;
  }
  if (!isIOS && data.shortDescription) {
    p += `**Short description:** "${data.shortDescription}" (${data.shortDescription.length}/80 chars)\n`;
  }
  p += `**Category:** ${data.category}\n`;
  p += `**Platform:** ${isIOS ? "iOS" : "Android"}\n`;
  p += `**Rating:** ${data.rating > 0 ? `${data.rating.toFixed(1)}★ (${data.ratingsCount.toLocaleString()})` : "No rating"}\n\n`;

  p += `## DESCRIPTION (for feature/keyword context)\n`;
  p += `${data.description.substring(0, 1200)}\n\n`;

  p += `## TITLE OPTIMIZATION RULES\n`;
  p += `- Most heavily weighted metadata field on both stores\n`;
  p += `- Front-load keywords in the first 15 characters (highest algorithmic weight + most visible in search results)\n`;
  p += `- Format options: "Brand – Keyword" or "Keyword – Brand" (if brand isn't well-known)\n`;
  p += `- Write for humans first, SEO second — must read naturally\n`;
  p += `- No superlatives (#1, best, top) — stores reject these\n`;
  p += `- Use every available character — unused chars = wasted ranking potential\n`;
  if (isIOS) {
    p += `- iOS indexable budget: title (30) + subtitle (30) + keyword field (100) = 160 chars — avoid duplicating words across these fields\n`;
    p += `- Don't include words already in the subtitle "${data.subtitle || ""}" — Apple combines them automatically\n`;
  } else {
    p += `- Google indexes the title + short description + full description — the title should target the highest-value keywords\n`;
  }
  p += `\n`;

  p += `Return JSON:\n{\n`;
  p += `  "currentAnalysis": "Detailed analysis — what's good, what's missing, character efficiency, keyword coverage vs competitors",\n`;
  p += `  "variants": [\n`;
  for (let i = 1; i <= 8; i++) {
    p += `    {\n`;
    p += `      "title": "Title variant ${i} — MUST BE ≤${titleMax} CHARS, count carefully before writing",\n`;
    p += `      "charCount": 0,\n`;
    p += `      "strategy": "keyword-first | brand-first | hybrid",\n`;
    p += `      "reasoning": "Why this variant improves on the current title"\n`;
    p += `    }${i < 8 ? "," : ""}\n`;
  }
  p += `  ],\n`;
  p += `  "keywordCoverage": [\n`;
  p += `    { "keyword": "target keyword", "presentIn": ["variant 1", "variant 3"], "searchVolume": "high | medium | low" }\n`;
  p += `  ],\n`;
  p += `  "recommendation": "Which variant is the top recommendation and why"\n`;
  p += `}\n\n`;
  p += `CRITICAL RULES:\n`;
  p += `1. "charCount" must be the ACTUAL character count you computed, NOT ${titleMax}\n`;
  p += `2. EVERY title variant MUST be ≤${titleMax} characters — count BEFORE writing each one\n`;
  p += `3. If a title exceeds ${titleMax} chars, it is INVALID and will be rejected by the store`;
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
  p += `- Front-load the most important keywords — Google indexes this field\n`;
  p += `- This is the FIRST text users see below the screenshots — it must hook and convert\n`;
  p += `- Each variant MUST be 80 characters or fewer — count carefully\n`;
  p += `- Include a clear value proposition, not just a feature list\n`;
  p += `- Avoid generic phrases like "the best app" or "download now"\n`;
  p += `- Use natural language — no keyword stuffing\n\n`;

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
  p += `  "keywordStrategy": "How to approach keyword research in non-English markets (not just translation)",\n`;
  p += `  "suggestions": ["Specific localization action 1", "Action 2"]\n`;
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
        prompt: `Provide a deep-dive icon analysis for "${data.title}" (${data.category}, ${data.platform}).\n\nReturn JSON:\n{\n  "assessment": "Detailed assessment of the icon",\n  "issues": ["list every issue"],\n  "colorAnalysis": "Color palette assessment — contrast, visibility on light/dark backgrounds",\n  "competitorComparison": "How this icon compares to typical icons in ${data.category} category",\n  "redesignBrief": "Detailed brief for a designer to improve the icon",\n  "suggestions": ["specific improvement 1", "improvement 2", "improvement 3"]\n}`,
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

function extractDesignDirection(brief: string): string {
  const cleaned = stripMarkdown(brief);
  const lines = cleaned.split("\n").filter(l => l.trim().length > 0);
  const designLines = lines.filter(l => {
    const lower = l.toLowerCase();
    return lower.includes("color") || lower.includes("design") || lower.includes("style")
      || lower.includes("suggest") || lower.includes("issue") || lower.includes("improve")
      || lower.includes("redesign") || lower.includes("contrast") || lower.includes("shape")
      || lower.includes("visual") || lower.includes("compet") || lower.includes("assess")
      || lower.includes("brand") || lower.includes("recogni") || lower.includes("palette");
  });
  return designLines.slice(0, 15).join("\n") || cleaned.substring(0, 1500);
}

function buildIconConceptPrompt(appData: AppData, brief: string): string {
  const desc = (appData.description || "").substring(0, 300);
  const designDirection = extractDesignDirection(brief);

  return `You are a world-class app icon designer working at a top design studio. Generate a professional, production-quality app icon.

APP NAME: ${appData.title}
CATEGORY: ${appData.category || "Apps"}
WHAT THE APP DOES: ${desc}
${appData.subtitle ? `TAGLINE: ${appData.subtitle}` : ""}

DESIGN ANALYSIS FROM OUR ASO AUDIT:
${designDirection}

ICON REQUIREMENTS:
- Square 1024x1024px app icon
- Must be instantly recognizable at 60x60px (thumbnail size in search results)
- NO text, NO letters, NO words on the icon — text goes in the app name, not the icon
- Strong visual metaphor that communicates what the app does at a glance
- High contrast between the main element and the background
- Professional quality indistinguishable from a real top-grossing app
- No rounded corners (the operating system applies those)
- Rich, intentional color palette — not generic gradients
- Should feel distinctly different from the current icon while staying on-brand for the category

Generate exactly ONE polished app icon concept.`;
}

function buildScreenshotMoodboardPrompt(appData: AppData, brief: string): string {
  const isIOS = appData.platform === "ios";
  const desc = (appData.description || "").substring(0, 300);
  const designDirection = extractDesignDirection(brief);

  return `You are an expert app store screenshot designer. Create a visual moodboard / layout guide for a complete screenshot gallery redesign.

APP NAME: ${appData.title}
PLATFORM: ${isIOS ? "iOS App Store" : "Google Play Store"}
WHAT THE APP DOES: ${desc}
${appData.subtitle ? `TAGLINE: ${appData.subtitle}` : ""}

DESIGN ANALYSIS FROM OUR ASO AUDIT:
${designDirection}

CREATE A MOODBOARD IMAGE that shows:
1. A horizontal strip of ${isIOS ? "5" : "4"} thumbnail screenshot frames side by side (like a gallery preview row)
2. Each frame contains: a modern device frame outline, a caption zone in the top 1/3, and a colored block representing the app's UI
3. A color palette strip at the bottom with 4-5 recommended brand colors
4. A typography sample showing the recommended caption font style
5. Visual annotations (arrows, labels) indicating: caption placement, background treatment, device frame style

DESIGN REQUIREMENTS:
- Professional design document aesthetic — clean, organized, easy to scan
- Dark background for the moodboard itself
- Device frames: ${isIOS ? "iPhone 16 Pro (Dynamic Island, no home button)" : "Pixel 9 style"}
- Show captions in the top 1/3 of each frame — bold, benefit-focused, 2-5 words
- Use colors that match the app's brand identity
- This is creative direction for designers, not finished screenshots

Generate ONE comprehensive moodboard image.`;
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
      { label: "Modern & Bold", suffix: "\n\nSTYLE DIRECTION: Modern, bold, and vibrant. Use strong geometric shapes and a contemporary color palette. Make it feel premium and current." },
      { label: "Minimal & Clean", suffix: "\n\nSTYLE DIRECTION: Minimalist and clean. Focus on a single iconic element with lots of negative space. Subtle, refined color usage. Think Apple-level restraint." },
      { label: "Distinctive & Expressive", suffix: "\n\nSTYLE DIRECTION: Distinctive and expressive. Push creative boundaries — use an unexpected metaphor, texture, or visual treatment that stands out in a crowded category grid. Bold and memorable." },
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
