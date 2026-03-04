import type { AppData } from "./aso-rules";

const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ---------------------------------------------------------------------------
// Expanded AIAnalysis — covers every audit area, all optional for resilience
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
// System prompt — comprehensive ASO expertise from both skills
// Sources:
//   - app-store-optimization SKILL.md (keyword research, metadata, competitor analysis,
//     scoring, A/B testing, localization, review analysis, launch planning)
//   - app-store-screenshots SKILL.md (OCR, First 3 Rule, gallery strategy, caption writing,
//     all 7 styles, CPPs, panoramic, story flow, conversion psychology, specs, pre-upload)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a senior App Store Optimization (ASO) consultant with 10+ years of experience. You analyze app store listings and provide specific, actionable, expert-level recommendations grounded in current best practices. You always reference actual app content — never give generic advice.

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
- Google: Fully indexed. Keywords 3-5x naturally, front-loaded in first paragraph. Keyword density > raw count. "Keywords mentioned frequently and earlier have been found more relevant."
- iOS: NOT indexed for search, but impacts conversion rate and is indexed by web search engines
- Structure: Opening hook → Feature bullets → Social proof → CTA
- Opening must lead with value proposition, not "Welcome to..." or "This app is..." or "We are..."
- 2,500-4,000 chars recommended for both platforms

**Promotional Text (iOS only, 170 chars):**
- Appears above the description — first text users read on the product page
- Can be changed anytime WITHOUT an app update (unlike all other metadata)
- Use for: feature announcements, social proof, seasonal campaigns, limited offers
- Rotate monthly for freshness
- Not indexed for search but directly impacts conversion

**What's New:**
- Shown to existing users in the Updates tab — drives re-engagement
- Write user-facing changes, not internal changelog
- Highlight the most exciting improvement first

## SCREENSHOT STRATEGY

### The First 3 Rule
80% of App Store impressions show only the first 3 screenshots before the user scrolls. Users spend approximately 7 seconds on an app page before deciding. ~70% of visitors use search, and 65% of downloads happen immediately after a search query. The first 3 must function as a complete elevator pitch:
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

Upload 6-8 screenshots minimum. Upload all 10 (iOS) or 8 (Android) only if each adds distinct value.

### Caption Writing Rules
- 2-5 words per caption (readable at thumbnail size)
- BENEFIT-focused, not feature-focused
- 40pt+ bold sans-serif font (SF Pro, Helvetica, Inter)
- Keyword-aware — distribute ASO keywords across captions
- Keep text inside safe zones (avoid top 20% for status bar area)

Bad → Good examples:
- "Push Notification System" → "Never Miss a Deadline"
- "Calendar View with Filters" → "See Your Week at a Glance"
- "Data Export Functionality" → "Share Reports in One Tap"
- "AI Task Prioritization" → "Focus on What Matters"
- "Sleep Tracking Settings" → "Sleep Better Tonight"
- "Offline Storage Mode" → "Works Anywhere, No WiFi"
- "Easy to Use" (zero search volume) → "Track Daily Habits" (searchable keyword)
- "Audio Player Interface" → "Stream Music Anytime"
- "Settings and Preferences" → "Personalize Your Sound"

### Screenshot Styles (7 types — identify which style each screenshot uses)
1. **Device Frame with Caption** — 96% of top apps use this. Device mockup + benefit caption. Default recommendation.
2. **Full-Bleed UI** — App fills entire screenshot. Best for immersive apps (games, media, photo editors).
3. **Lifestyle Context** — Device in real-world context (person holding phone). Research shows depicting real people drives higher engagement, particularly on iOS.
4. **Feature Highlight with Callouts** — UI with arrows/circles pointing to features. Max 1-2 callouts per screenshot.
5. **Before/After Comparison** — Split-screen transformation. Effective for photo editors, fitness, productivity.
6. **Panoramic / Continuous Scroll** — Screenshots visually connect across gallery creating a banner effect. Encourages scrolling.
7. **Story Flow (Three-Act Structure)** — Hook → Flow → Trust narrative. Story-based galleries convert better than random feature lists.

### Apple OCR (Major 2025-2026 Algorithm Shift)
Apple now uses OCR to extract and index readable text from screenshot captions as ranking signals. Screenshots are now discovery assets — effectively a secondary keyword field.

OCR Optimization:
- Bold sans-serif typography, high contrast (dark on light or white on dark, no mid-tones)
- 40pt+ minimum text on canvas for reliable extraction
- Map 5-10 core ASO keywords to individual captions
- First 3 screenshots carry heaviest indexing weight
- Align caption keywords with title + subtitle to amplify signals
- Replace generic phrases with keyword-rich, benefit-driven text
- Semantic clustering: ranking for a keyword gains visibility for related terms automatically

### Conversion Psychology
- Processing fluency: high-contrast text on clean backgrounds → faster processing → higher download rate
- Emotional triggers: outcome-focused ("Sleep Better Tonight") outperforms technical ("Sleep Tracking")
- Specificity: "Save 2 Hours Every Week" outperforms "Calendar Integration"
- iOS users: respond more to lifestyle imagery, emotional triggers, minimalist design
- Android users: more feature-oriented, want specific functionality. Keep promotional text under 20% of image.

### Apple Custom Product Pages (CPPs)
Up to 70 custom product pages per app, each with unique screenshots per keyword cluster.
- Average 8.6% conversion lift, up to 60% CPA reduction vs default page
- Map high-intent keyword clusters to dedicated CPPs
- Align CPP captions with target keywords for OCR indexing
- Link CPPs to Apple Search Ads campaigns

### Google Play Custom Store Listings
Android's equivalent to CPPs — create multiple store listings per app:
- Country-specific listings with localized screenshots and descriptions
- Pre-registration listings with unique messaging
- Custom listings for paid campaign landing pages
- Each listing can have different screenshots, short description, and full description
- Use to target different user segments or geographic markets
- Set up in Google Play Console → Store presence → Custom store listings

### Google Play Feature Graphic (1024 x 500 px)
Required for Google Play featuring and editorial promotion. Appears at the top of the store listing.
- Must clearly communicate what the app does
- No excessive text — focus on visual storytelling
- Don't duplicate screenshot content — use as a hero banner
- Avoid small text (unreadable on mobile)
- Should work on both light and dark backgrounds
- Keep important content centered (edges may be cropped on some devices)
- PNG or JPEG, 1024 x 500 px exactly
- Update seasonally or with major feature launches

### Google Play Content Policy Compliance
Screenshots and graphics must comply with Google Play policies:
- No fake badges, awards, or certifications unless verifiable
- No direct competitor comparisons by name
- No false superlative claims ("Best app", "#1 rated") without third-party verification
- Promotional text must be under 20% of screenshot image area
- No misleading imagery showing features not in the app
- No inappropriate content mismatched with content rating

### Common Screenshot Mistakes (flag any found)
1. Settings, onboarding, or login screens — show app in-use with real data
2. Too much text — stick to 2-5 word captions, 40pt+ font
3. Wrong dimensions — use exact platform specs
4. All screenshots look the same — vary composition and content
5. Feature-focused captions — use benefit-focused language
6. Generic captions with zero search volume ("Easy to Use") — use keyword-rich text
7. Decorative or script fonts — use bold sans-serif for readability AND OCR
8. Outdated device frames — use current-gen (iPhone 16 Pro, Pixel 9)
9. Outdated UI — update screenshots with each major release
10. No strong hero screenshot — slot 1 must be the absolute best shot
11. Same screenshots for iOS and Android — different aspect ratios AND audience psychology
12. Empty states or placeholder data — show realistic, populated content

### Screenshot Analysis Criteria
When analyzing each screenshot, evaluate:
- Does it show the app IN USE with real data (not empty states, onboarding, or settings)?
- Is there a visible caption? Is it benefit-focused and keyword-rich?
- Is the font readable at thumbnail size (40pt+ bold sans-serif)?
- What style is used (device frame, full-bleed, lifestyle, etc.)?
- Is the device frame current-gen?
- Does it contribute unique value to the gallery story?

### Design Specs (2026)
iOS: iPhone 6.9" = 1320x2868, 6.7" = 1290x2796, 5.5" = 1242x2208, iPad 13" = 2064x2752. Up to 10 per localization. PNG or JPEG.
Android: 1080x1920 (standard), 1440x2560 (high-res). Feature graphic 1024x500. Max 8 per device type. PNG/JPEG, 8MB max. 7" tablet: 1200x1920.

## ICON ANALYSIS
The icon is the single most important visual element — must be recognizable at 60x60px.
Evaluate: simplicity, recognizability at small sizes, color contrast against white/dark backgrounds, brand alignment, uniqueness within the category, whether it communicates the app's purpose, visual weight and balance.

## PREVIEW VIDEO
iOS: 15-30s, H.264 .mov/.mp4, loops silently, real app footage only (no renders), no people outside device.
Android: YouTube URL, 30s-2min, landscape preferred.

Structure:
- 0-3s: Hook — core outcome/wow moment (stops scrolling)
- 3-10s: Feature 1 — top feature in action
- 10-18s: Feature 2 — second key feature
- 18-25s: Feature 3 — third feature or social proof
- 25-30s: CTA — end screen with app icon

The first 3 seconds determine whether users watch or scroll. Show the core outcome immediately.

## RATINGS & REVIEWS STRATEGY
- Below 4.0★: conversion drops up to 50%. Below 3.5★: serious ranking penalty.
- 4.5★+: optimal for both conversion and algorithm trust.
- Review volume signals app quality to algorithms: 1,000+ for social proof, 10,000+ for strong signal.
- Ask for ratings after positive in-app experiences. Never after: errors, crashes, purchases, onboarding.
- iOS: SKStoreReviewController — 3 prompts max per device per 365 days.
- Android: In-App Review API — use soft pre-prompt ("Enjoying the app?") to filter sentiment first.
- Respond to negative reviews within 24-48 hours, always professional. Every response is public.
- Extract common themes from negative reviews for product roadmap prioritization.

## LOCALIZATION
Tier 1 (full: new screenshots + translated captions + local keyword research): Japanese, Korean, Chinese (Simplified)
Tier 2 (translated captions, same screenshots, local keywords): German, French, Spanish, Portuguese (BR)
Tier 3: English defaults

- Translate ALL visible text, not just headlines. Cultural adaptation matters.
- Research local ASO keywords per market — direct translations miss local search terms.
- Typically yields 20-30% download increase in target markets.

## A/B TESTING
- Apple PPO: up to 3 treatments against original (screenshot order, caption copy, visual styles)
- Google Play Store Listing Experiments: 7+ days with 50%+ traffic for statistical significance
- Test screenshot orders, device frames vs no frames, benefit vs feature vs social proof messaging

## OUTPUT REQUIREMENTS
You MUST return valid JSON. Every field must be:
- SPECIFIC to THIS app (reference actual features, brand, category, content you can see)
- ACTIONABLE (provide actual copy a developer could implement, not vague advice)
- Within character limits (iOS title ≤30, Android title ≤50, subtitle ≤30, short desc ≤80, captions 2-5 words, promo text ≤170)
- BENEFIT-FOCUSED (user outcomes, not technical capabilities)
- GROUNDED (reference what you actually observe in the listing data and screenshots)

For screenshot captions: write actual 2-5 word captions a designer could implement immediately.
For description copy: write actual paragraphs a developer could paste — no templates with brackets.
For title/subtitle: every suggestion MUST respect the platform character limit.
For keyword field: suggest actual single keywords, comma-separated, that complement the title/subtitle.
For storyboard: reference actual features visible in the listing.
For icon: describe what you actually see in the icon image.`;

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

async function downloadImageAsBase64(
  url: string,
  timeoutMs = 6000,
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!resp.ok) return null;
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const buffer = await resp.arrayBuffer();
    if (buffer.byteLength > 3_000_000) return null; // skip images >3MB
    const base64 = Buffer.from(buffer).toString("base64");
    return { data: base64, mimeType: contentType.split(";")[0] };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// User prompt — passes ALL available listing data + image references
// ---------------------------------------------------------------------------

function buildUserPrompt(data: AppData): string {
  const isIOS = data.platform === "ios";
  const titleMax = isIOS ? 30 : 50;
  const screenshotMax = isIOS ? 10 : 8;

  let p = `Analyze this ${isIOS ? "iOS App Store" : "Google Play"} listing comprehensively.\n\n`;

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
  p += `**Screenshots:** ${data.screenshotCount} uploaded (max ${screenshotMax})\n`;
  p += `**Preview video:** ${data.hasVideo ? "Yes" : "No"}\n\n`;

  p += `## FULL DESCRIPTION\n${data.description.substring(0, 3500)}\n\n`;

  if (data.whatsNew) {
    p += `## WHAT'S NEW (latest release notes)\n${data.whatsNew.substring(0, 500)}\n\n`;
  }

  const imgCount = Math.min(data.screenshots?.length || 0, 8);
  if (data.iconUrl) p += `I'm including the app icon image for visual analysis.\n`;
  if (!isIOS && data.featureGraphicUrl) p += `I'm including the Google Play feature graphic (1024x500) for visual analysis.\n`;
  if (imgCount > 0) p += `I'm including ${imgCount} screenshot images for visual analysis. Analyze each one in order.\n`;
  p += `\n`;

  // JSON response schema — platform-adaptive
  p += `Provide your analysis as JSON matching this exact structure:\n`;
  p += `{\n`;
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
    p += `    "suggestedKeywords": ["keyword1", "keyword2", "keyword3", "...up to 20 single words that complement title+subtitle"],\n`;
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
  p += `    "openingHook": "A complete, well-written 2-3 sentence opening paragraph for THIS app. No brackets or placeholders.",\n`;
  p += `    "featureBullets": ["• Benefit-focused bullet 1", "• Bullet 2", "...5-8 bullets"],\n`;
  p += `    "cta": "A complete closing CTA paragraph",\n`;
  p += `    "keywordGaps": ["keyword not found in description that should be"],\n`;
  p += `    "structureIssues": ["specific structural problem observed"]`;

  if (!isIOS) {
    p += `,\n`;
    p += `    "keywordDensity": [\n`;
    p += `      { "keyword": "primary keyword", "currentCount": 2, "recommendedCount": 5 },\n`;
    p += `      { "keyword": "secondary keyword", "currentCount": 0, "recommendedCount": 3 }\n`;
    p += `    ]\n`;
  } else {
    p += `\n`;
  }

  p += `  },\n`;

  p += `  "icon": {\n`;
  p += `    "assessment": "What the icon shows, whether it communicates app purpose, readability at small size",\n`;
  p += `    "issues": ["specific issue"],\n`;
  p += `    "suggestions": ["specific improvement"]\n`;
  p += `  },\n`;

  if (!isIOS) {
    p += `  "featureGraphic": {\n`;
    p += `    "assessment": "${data.featureGraphicUrl ? "Analyze the feature graphic: does it communicate the app's purpose? Is text readable? Does it work as a hero banner?" : "No feature graphic detected — this is required for Google Play featuring"}",\n`;
    p += `    "issues": ["specific issue with the feature graphic"],\n`;
    p += `    "suggestions": ["specific improvement for the 1024x500 graphic"]\n`;
    p += `  },\n`;
  }

  p += `  "screenshots": {\n`;
  p += `    "overallAssessment": "2-3 sentence assessment of gallery quality, story coherence, conversion effectiveness",\n`;
  p += `    "galleryCoherence": 7,\n`;
  p += `    "firstThreeVerdict": "Do the first 3 screenshots form a complete elevator pitch? What/How/Why assessment.",\n`;
  p += `    "perScreenshot": [\n`;
  p += `      {\n`;
  p += `        "slot": 1,\n`;
  p += `        "whatItShows": "Description of what this screenshot displays",\n`;
  p += `        "captionVisible": "The exact caption text visible on the screenshot, or 'none'",\n`;
  p += `        "captionQuality": "Assessment of the caption — benefit-focused? keyword-rich? readable?",\n`;
  p += `        "captionSuggestion": "2-5 Word Better Caption",\n`;
  p += `        "style": "device-frame-with-caption | full-bleed | lifestyle | feature-highlight | before-after | panoramic | story-flow",\n`;
  p += `        "issues": ["specific issue with this screenshot"]\n`;
  p += `      }\n`;
  p += `    ],\n`;
  p += `    "missingSlots": [\n`;
  p += `      {\n`;
  p += `        "slot": 7,\n`;
  p += `        "whatToShow": "What this new screenshot should display",\n`;
  p += `        "captionSuggestion": "2-5 Word Caption",\n`;
  p += `        "recommendedStyle": "device-frame-with-caption"\n`;
  p += `      }\n`;
  p += `    ],\n`;
  p += `    "commonMistakesFound": ["List any of the 12 common screenshot mistakes you observe"]`;

  if (isIOS) {
    p += `,\n`;
    p += `    "cppStrategy": {\n`;
    p += `      "shouldUseCPPs": true,\n`;
    p += `      "keywordClusters": ["cluster 1 keywords", "cluster 2 keywords", "...high-intent keyword groups that deserve dedicated product pages"],\n`;
    p += `      "reasoning": "Why CPPs would help THIS app's conversion and which audience segments to target"\n`;
    p += `    }\n`;
  } else {
    p += `,\n`;
    p += `    "customStoreListings": {\n`;
    p += `      "shouldUse": true,\n`;
    p += `      "listingIdeas": ["Country/segment-specific listing idea 1", "Listing idea 2"],\n`;
    p += `      "reasoning": "Why custom store listings would help THIS app"\n`;
    p += `    }\n`;
  }

  p += `  },\n`;

  p += `  "video": {\n`;
  p += `    "assessment": "${data.hasVideo ? "Assessment of the video if you can see it, or general recommendation" : "No video detected — provide recommendation"}",\n`;
  p += `    "storyboard": [\n`;
  p += `      { "segment": "Hook", "duration": "0-3s", "content": "Specific content for THIS app" },\n`;
  p += `      { "segment": "Feature 1", "duration": "3-10s", "content": "Specific feature" },\n`;
  p += `      { "segment": "Feature 2", "duration": "10-18s", "content": "Specific feature" },\n`;
  p += `      { "segment": "Feature 3", "duration": "18-25s", "content": "Specific feature or social proof" },\n`;
  p += `      { "segment": "CTA", "duration": "25-30s", "content": "End screen description" }\n`;
  p += `    ]\n`;
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
  p += `    "priority": "high | medium | low — how urgently this app should run experiments",\n`;
  p += `    "experiments": [\n`;
  p += `      {\n`;
  p += `        "name": "Name of the experiment",\n`;
  p += `        "hypothesis": "If we change X, then Y will improve because Z",\n`;
  p += `        "variants": ["Control: current state", "Variant A: specific change", "Variant B: specific change"],\n`;
  p += `        "metric": "Primary metric to track (e.g., conversion rate, tap-through rate)"\n`;
  p += `      }\n`;
  p += `    ]\n`;
  p += `  },\n`;

  p += `  "maintenance": {\n`;
  p += `    "assessment": "How fresh/stale the app looks based on last update, version, and what's new text",\n`;
  p += `    "seasonalOpportunities": ["Upcoming seasonal opportunity relevant to THIS app's category"],\n`;
  p += `    "suggestions": ["specific suggestion"]\n`;
  p += `  },\n`;

  p += `  "localization": {\n`;
  p += `    "priority": "high | medium | low — based on app category and content",\n`;
  p += `    "tier1Markets": ["market1", "market2"],\n`;
  p += `    "tier2Markets": ["market1", "market2"],\n`;
  p += `    "reasoning": "Why these specific markets for THIS app's category"\n`;
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
// Main entry point
// ---------------------------------------------------------------------------

export async function analyzeWithAI(appData: AppData): Promise<AIAnalysis | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("AI analysis skipped: no GEMINI_API_KEY");
    return null;
  }

  const t0 = Date.now();

  try {
    const parts: Record<string, unknown>[] = [
      { text: buildUserPrompt(appData) },
    ];

    // Download icon + screenshots in parallel for vision analysis
    const imageUrls: { url: string; label: string }[] = [];

    if (appData.iconUrl) {
      imageUrls.push({ url: appData.iconUrl, label: "App icon:" });
    }

    if (appData.featureGraphicUrl) {
      imageUrls.push({ url: appData.featureGraphicUrl, label: "Google Play feature graphic (1024x500):" });
    }

    const screenshotUrls = (appData.screenshots || []).slice(0, 8);
    for (let i = 0; i < screenshotUrls.length; i++) {
      imageUrls.push({ url: screenshotUrls[i], label: `Screenshot ${i + 1}:` });
    }

    let totalImageBytes = 0;
    const MAX_TOTAL_IMAGE_BYTES = 8_000_000; // 8MB total cap for all images

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
          const imgBytes = img.data.length * 0.75; // base64 → bytes approx
          if (totalImageBytes + imgBytes > MAX_TOTAL_IMAGE_BYTES) {
            skipped++;
            continue;
          }
          totalImageBytes += imgBytes;
          parts.push({ text: imageUrls[i].label });
          parts.push({
            inlineData: { mimeType: img.mimeType, data: img.data },
          });
          attached++;
        } else {
          skipped++;
        }
      }

      console.log(`AI: ${attached} images attached, ${skipped} skipped, ${(totalImageBytes / 1_000_000).toFixed(1)}MB total, download took ${imgTime}ms`);
    }

    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    };

    const bodyJson = JSON.stringify(body);
    console.log(`AI: Request body size: ${(bodyJson.length / 1_000_000).toFixed(1)}MB, sending to Gemini...`);

    const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyJson,
      signal: AbortSignal.timeout(50000),
    });

    const apiTime = Date.now() - t0;

    if (!resp.ok) {
      const err = await resp.text();
      console.error(`AI: Gemini API error ${resp.status} after ${apiTime}ms:`, err.substring(0, 500));
      return null;
    }

    const result = await resp.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const finishReason = result?.candidates?.[0]?.finishReason;
      const safetyRatings = result?.candidates?.[0]?.safetyRatings;
      console.error(`AI: Gemini returned no text after ${apiTime}ms. finishReason: ${finishReason}, safetyRatings:`, JSON.stringify(safetyRatings));
      return null;
    }

    console.log(`AI: Got ${text.length} chars response in ${apiTime}ms`);

    const analysis: AIAnalysis = JSON.parse(text);

    if (!analysis.title || !Array.isArray(analysis.topInsights)) {
      console.error("AI: Gemini response missing required fields (title or topInsights)");
      return null;
    }

    const screenshotCount = analysis.screenshots?.perScreenshot?.length ?? 0;
    console.log(`AI: Analysis complete — ${screenshotCount} screenshots analyzed, ${analysis.topInsights.length} insights`);

    return analysis;
  } catch (error) {
    const elapsed = Date.now() - t0;
    console.error(`AI: Analysis failed after ${elapsed}ms:`, error instanceof Error ? error.message : error);
    return null;
  }
}
