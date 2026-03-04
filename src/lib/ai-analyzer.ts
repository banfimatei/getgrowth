import type { AppData } from "./aso-rules";

const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

Bad → Good examples:
- "Push Notification System" → "Never Miss a Deadline"
- "Calendar View with Filters" → "See Your Week at a Glance"
- "Data Export Functionality" → "Share Reports in One Tap"
- "Audio Player Interface" → "Stream Music Anytime"
- "Settings and Preferences" → "Personalize Your Sound"
- "Easy to Use" (zero search volume) → "Track Daily Habits" (keyword-rich)

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
  timeoutMs = 5000,
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!resp.ok) return null;
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const buffer = await resp.arrayBuffer();
    if (buffer.byteLength > 4_000_000) return null;
    const base64 = Buffer.from(buffer).toString("base64");
    return { data: base64, mimeType: contentType.split(";")[0] };
  } catch {
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

  p += `    "missingSlots": [\n`;
  const startSlot = imgCount + 1;
  const endSlot = Math.min(imgCount + 4, screenshotMax);
  for (let i = startSlot; i <= endSlot; i++) {
    p += `      {\n`;
    p += `        "slot": ${i},\n`;
    p += `        "whatToShow": "What this new screenshot should display based on the app",\n`;
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
}

async function callGemini(apiKey: string, opts: GeminiCallOptions): Promise<Record<string, unknown> | null> {
  const t0 = Date.now();

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
  console.log(`AI [${opts.label}]: Request body ${(bodyJson.length / 1_000_000).toFixed(2)}MB, sending...`);

  try {
    const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyJson,
      signal: AbortSignal.timeout(opts.timeoutMs),
    });

    const elapsed = Date.now() - t0;

    if (!resp.ok) {
      const err = await resp.text();
      console.error(`AI [${opts.label}]: Gemini ${resp.status} after ${elapsed}ms:`, err.substring(0, 500));
      return null;
    }

    const result = await resp.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const finishReason = result?.candidates?.[0]?.finishReason;
      const safetyRatings = result?.candidates?.[0]?.safetyRatings;
      console.error(`AI [${opts.label}]: No text after ${elapsed}ms. finishReason=${finishReason}`, JSON.stringify(safetyRatings));
      return null;
    }

    const finishReason = result?.candidates?.[0]?.finishReason;
    console.log(`AI [${opts.label}]: ${text.length} chars in ${elapsed}ms, finishReason=${finishReason}`);

    if (finishReason === "MAX_TOKENS") {
      console.warn(`AI [${opts.label}]: Output was TRUNCATED — response likely incomplete`);
    }

    return JSON.parse(text);
  } catch (error) {
    const elapsed = Date.now() - t0;
    console.error(`AI [${opts.label}]: Failed after ${elapsed}ms:`, error instanceof Error ? error.message : error);
    return null;
  }
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
  const textCall = callGemini(apiKey, {
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
  const MAX_TOTAL_IMAGE_BYTES = 12_000_000; // 12MB — visual call gets its own budget

  if (imageUrls.length > 0) {
    const downloads = await Promise.all(
      imageUrls.map(({ url }) => downloadImageAsBase64(url)),
    );

    const imgTime = Date.now() - t0;
    let attached = 0;
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
        attached++;
      } else {
        console.log(`AI [VISUAL]: Failed to download ${imageUrls[i].label}`);
        skipped++;
      }
    }

    console.log(`AI [VISUAL]: ${attached} images attached, ${skipped} skipped, ${(totalImageBytes / 1_000_000).toFixed(1)}MB total, download took ${imgTime}ms`);
  }

  const visualCall = callGemini(apiKey, {
    systemPrompt: VISUAL_SYSTEM_PROMPT,
    parts: visualParts,
    maxOutputTokens: 12288,
    timeoutMs: 90000,
    label: "VISUAL",
  });

  // ── Run both in parallel ──────────────────────────────────────────
  const [textResult, visualResult] = await Promise.all([textCall, visualCall]);

  const elapsed = Date.now() - t0;
  console.log(`AI: Both calls complete in ${elapsed}ms — text: ${textResult ? "OK" : "FAILED"}, visual: ${visualResult ? "OK" : "FAILED"}`);

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

export type DeepDiveSection = "title" | "subtitle" | "keywords" | "shortDescription" | "description" | "screenshots" | "icon" | "ratings" | "video" | "maintenance" | "localization";

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
  const startSlot = imgCount + 1;
  const endSlot = Math.min(imgCount + (screenshotMax - imgCount), screenshotMax);
  for (let i = startSlot; i <= endSlot; i++) {
    p += `    {\n`;
    p += `      "slot": ${i},\n`;
    p += `      "whatToShow": "What this new screenshot should display",\n`;
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
  let p = `You are a senior ASO consultant. Provide an exhaustive title optimization analysis.\n\n`;
  p += `**Current title:** "${data.title}" (${data.title.length}/${titleMax} chars)\n`;
  if (isIOS && data.subtitle) p += `**Current subtitle:** "${data.subtitle}" (${data.subtitle.length}/30 chars)\n`;
  p += `**Category:** ${data.category}\n`;
  p += `**Platform:** ${isIOS ? "iOS" : "Android"}\n\n`;
  p += `**Description excerpt:** ${data.description.substring(0, 800)}\n\n`;

  p += `Return JSON:\n{\n`;
  p += `  "currentAnalysis": "Detailed analysis of current title — keyword coverage, brand placement, character usage",\n`;
  p += `  "variants": [\n`;
  for (let i = 1; i <= 8; i++) {
    p += `    {\n`;
    p += `      "title": "Title variant ${i} (≤${titleMax} chars)",\n`;
    p += `      "charCount": ${titleMax},\n`;
    p += `      "strategy": "keyword-first | brand-first | hybrid",\n`;
    p += `      "reasoning": "Why this variant works"\n`;
    p += `    }${i < 8 ? "," : ""}\n`;
  }
  p += `  ],\n`;
  p += `  "keywordCoverage": [\n`;
  p += `    { "keyword": "target keyword", "presentIn": ["variant 1", "variant 3"], "searchVolume": "high | medium | low" }\n`;
  p += `  ],\n`;
  p += `  "recommendation": "Which variant is the top recommendation and why"\n`;
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
    case "subtitle":
    case "keywords":
    case "shortDescription":
      return {
        systemPrompt: TEXT_SYSTEM_PROMPT,
        prompt: buildTitleDeepDivePrompt(data),
        maxOutputTokens: 8192,
        needsImages: false,
      };
    case "icon":
      return {
        systemPrompt: VISUAL_SYSTEM_PROMPT,
        prompt: `Provide a deep-dive icon analysis for "${data.title}" (${data.category}, ${data.platform}).\n\nReturn JSON:\n{\n  "assessment": "Detailed assessment of the icon",\n  "issues": ["list every issue"],\n  "colorAnalysis": "Color palette assessment — contrast, visibility on light/dark backgrounds",\n  "competitorComparison": "How this icon compares to typical icons in ${data.category} category",\n  "redesignBrief": "Detailed brief for a designer to improve the icon",\n  "suggestions": ["specific improvement 1", "improvement 2", "improvement 3"]\n}`,
        maxOutputTokens: 4096,
        needsImages: true,
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

  const config = getDeepDivePromptAndConfig(section, appData);
  const parts: Record<string, unknown>[] = [{ text: config.prompt }];

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

    if (imageUrls.length > 0) {
      const downloads = await Promise.all(imageUrls.map(({ url }) => downloadImageAsBase64(url)));
      let totalBytes = 0;
      for (let i = 0; i < downloads.length; i++) {
        const img = downloads[i];
        if (img) {
          const imgBytes = img.data.length * 0.75;
          if (totalBytes + imgBytes > 12_000_000) break;
          totalBytes += imgBytes;
          parts.push({ text: imageUrls[i].label });
          parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
        }
      }
      console.log(`Deep-dive [${section}]: ${downloads.filter(Boolean).length} images, ${(totalBytes / 1_000_000).toFixed(1)}MB`);
    }
  }

  return callGemini(apiKey, {
    systemPrompt: config.systemPrompt,
    parts,
    maxOutputTokens: config.maxOutputTokens,
    timeoutMs: 90000,
    label: `DEEP-DIVE-${section.toUpperCase()}`,
  });
}
