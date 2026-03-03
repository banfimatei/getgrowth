import type { AppData } from "./aso-rules";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
  description: {
    openingHook: string;
    featureBullets: string[];
    cta: string;
    keywordGaps: string[];
  };
  screenshots: {
    overallAssessment: string;
    galleryCoherence: number;
    perScreenshot: {
      slot: number;
      whatItShows: string;
      captionQuality: string;
      captionSuggestion: string;
      issues: string[];
    }[];
    missingSlots: {
      slot: number;
      whatToShow: string;
      captionSuggestion: string;
    }[];
  };
  topInsights: string[];
}

const SYSTEM_PROMPT = `You are a senior App Store Optimization (ASO) consultant with 10+ years of experience. You analyze app store listings and provide specific, actionable recommendations grounded in current best practices.

Your knowledge base includes:

## METADATA RULES

**Title (30 chars max on both stores):**
- Most heavily weighted metadata element for search ranking
- Front-load keywords in first 15 chars (most visible, highest weight)
- Format: "Brand – Keyword Phrase" or "Keyword – Brand" (if brand isn't well-known)
- Write for humans first, SEO second
- No superlatives (#1, best, top) — stores reject these
- Use every available character

**Subtitle (iOS, 30 chars max):**
- Second-most weighted field on iOS
- Zero word overlap with title (Apple combines title + subtitle + keyword field automatically)
- Don't repeat category name (already indexed for free)
- Apple's indexable budget: title (30) + subtitle (30) + keyword field (100) = 160 chars

**iOS Keyword Field (100 chars, invisible):**
- Comma-separated, NO spaces after commas
- No plurals (Apple handles singular/plural)
- No words already in title or subtitle
- Single words > phrases (Apple recombines: "music,streaming" covers "music streaming" + "streaming music")

**Short Description (Android, 80 chars):**
- Second-most indexed field on Google Play
- Front-load primary keyword in first 3 words
- Appears in search results — must be compelling

**Full Description:**
- Google: Indexed for search. Keywords 3-5x naturally, front-loaded in first paragraph. Density > raw count.
- iOS: NOT indexed for search, but impacts conversion + web SEO.
- Structure: Opening hook → Feature bullets → Social proof → CTA
- Opening must lead with value proposition, not "Welcome to..." or "This app is..."

## SCREENSHOT RULES (app-store-screenshots skill)

**The First 3 Rule:**
80% of App Store impressions show only the first 3 screenshots. Users spend ~7 seconds. 65% download immediately after search. First 3 = complete elevator pitch:
1. What is it? (Core value proposition)
2. What does it do? (Key differentiator)
3. Why do I need it? (Most popular feature/outcome)

**Gallery Order Strategy (positions 1-10):**
1. Hero — Core Value Proposition
2. Key Differentiator
3. Most Popular Feature
4. Social Proof / Outcome
5-8. Supporting Features
9. Edge Case / Niche
10. CTA / Download Prompt

**Caption Writing Rules:**
- 2-5 words per caption (readable at thumbnail size)
- BENEFIT-focused, not feature-focused
- 40pt+ bold sans-serif font (SF Pro, Helvetica, Inter)
- Keyword-aware — distribute ASO keywords across captions
- Bad: "Audio Player Interface", "Settings Screen", "Easy to Use"
- Good: "Stream Music Anytime", "Track Your Progress", "Never Miss a Beat"

**Conversion Psychology:**
- Processing fluency: high-contrast text on clean backgrounds
- Emotional triggers: outcome-focused > technical language
- Specificity: "Save 2 Hours Weekly" > "Calendar Integration"
- iOS users: lifestyle imagery, emotional triggers, minimalist design
- Android users: feature-oriented, specific functionality

**Apple OCR (2025-2026):**
Apple extracts text from screenshots via OCR as a keyword ranking signal.
- Bold sans-serif, 40pt+ minimum, high contrast
- Position text in top 1/3
- First 3 screenshots carry heaviest indexing weight
- Semantic clustering: ranking for a keyword gains visibility for related terms

**Screenshot Analysis Criteria:**
When analyzing screenshots, evaluate:
- Does each screenshot show the app IN USE with real data (not empty states)?
- Are captions benefit-focused and keyword-rich?
- Are fonts readable at thumbnail size?
- Do the first 3 form a complete elevator pitch?
- Is there visual variety across the gallery?
- Are device frames current-gen?
- Any settings, onboarding, or login screens? (bad)
- Does the gallery tell a coherent story?

**Screenshot Styles:**
96% of top apps use "Device Frame with Caption." Alternatives: Full-Bleed, Lifestyle Context, Panoramic.

**Design Specs (2026):**
- iOS: 1320x2868 (6.9"), 1290x2796 (6.7"), 1242x2208 (5.5")
- Android: 1080x1920, 1440x2560, Feature graphic 1024x500

## OUTPUT REQUIREMENTS

You MUST return valid JSON matching the exact schema provided. Every suggestion must be:
- Specific to THIS app (reference actual features, brand, category)
- Actionable (not vague advice — provide actual copy)
- Within character limits (titles ≤30 chars, subtitles ≤30 chars, captions 2-5 words)
- Benefit-focused (user outcomes, not technical capabilities)

For screenshot captions, write actual captions a designer could implement immediately — short, punchy, keyword-rich.
For description copy, write actual paragraphs a developer could paste — not templates with brackets.`;

async function downloadImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return null;
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const buffer = await resp.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return { data: base64, mimeType: contentType.split(";")[0] };
  } catch {
    return null;
  }
}

function buildUserPrompt(data: AppData): string {
  let p = `Analyze this ${data.platform === "ios" ? "iOS App Store" : "Google Play"} listing:\n\n`;
  p += `**Title:** "${data.title}" (${data.title.length}/30 chars)\n`;
  if (data.subtitle) p += `**Subtitle:** "${data.subtitle}" (${data.subtitle.length}/30 chars)\n`;
  if (data.shortDescription) p += `**Short description:** "${data.shortDescription}" (${data.shortDescription.length}/80 chars)\n`;
  p += `**Developer:** ${data.developerName}\n`;
  p += `**Category:** ${data.category}\n`;
  p += `**Rating:** ${data.rating > 0 ? `${data.rating.toFixed(1)}★ (${data.ratingsCount.toLocaleString()} ratings)` : "No rating"}\n`;
  p += `**Price:** ${data.price}\n`;
  if (data.installs) p += `**Installs:** ${data.installs}\n`;
  if (data.version) p += `**Version:** ${data.version}\n`;
  if (data.lastUpdated) p += `**Last updated:** ${data.lastUpdated}\n`;
  p += `**Screenshots:** ${data.screenshotCount} uploaded (max ${data.platform === "ios" ? 10 : 8})\n`;
  p += `**Video:** ${data.hasVideo ? "Yes" : "No"}\n\n`;

  p += `**Full description:**\n${data.description.substring(0, 3000)}\n\n`;

  if (data.screenshots && data.screenshots.length > 0) {
    p += `I'm including ${Math.min(data.screenshots.length, 5)} screenshot images for visual analysis. Analyze each one.\n\n`;
  }

  p += `Provide your analysis as JSON matching this exact structure:
{
  "title": {
    "issues": ["specific issue 1", ...],
    "suggestions": ["Title Option 1 (≤30ch)", "Title Option 2 (≤30ch)", "Title Option 3 (≤30ch)"],
    "reasoning": "Why these changes improve ranking and conversion"
  },
  ${data.platform === "ios" ? `"subtitle": {
    "issues": ["specific issue 1", ...],
    "suggestions": ["Subtitle Option 1 (≤30ch)", "Subtitle Option 2 (≤30ch)"],
    "reasoning": "Why these changes improve ranking"
  },` : ""}
  "description": {
    "openingHook": "A complete, well-written 2-3 sentence opening paragraph for this specific app. No brackets or placeholders.",
    "featureBullets": ["• Benefit-focused bullet 1", "• Benefit-focused bullet 2", ...],
    "cta": "A complete closing CTA sentence",
    "keywordGaps": ["keyword1", "keyword2", ...]
  },
  "screenshots": {
    "overallAssessment": "2-3 sentence assessment of the screenshot gallery quality, story coherence, and conversion effectiveness",
    "galleryCoherence": 7,
    "perScreenshot": [
      {
        "slot": 1,
        "whatItShows": "Brief description of what this screenshot displays",
        "captionQuality": "Assessment of the current caption (if visible) — is it benefit-focused? keyword-rich?",
        "captionSuggestion": "2-5 Word Caption",
        "issues": ["specific issue"]
      }
    ],
    "missingSlots": [
      {
        "slot": 7,
        "whatToShow": "What this screenshot should display",
        "captionSuggestion": "2-5 Word Caption"
      }
    ]
  },
  "topInsights": ["Insight 1", "Insight 2", "Insight 3"]
}`;

  return p;
}

export async function analyzeWithAI(appData: AppData): Promise<AIAnalysis | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("AI analysis skipped: no GEMINI_API_KEY");
    return null;
  }

  try {
    // Build the content parts: text + screenshot images
    const parts: Record<string, unknown>[] = [
      { text: buildUserPrompt(appData) },
    ];

    // Download and attach up to 5 screenshots for vision analysis
    if (appData.screenshots && appData.screenshots.length > 0) {
      const urls = appData.screenshots.slice(0, 5);
      const downloads = await Promise.all(urls.map(u => downloadImageAsBase64(u)));
      for (const img of downloads) {
        if (img) {
          parts.push({
            inlineData: { mimeType: img.mimeType, data: img.data },
          });
        }
      }
    }

    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    };

    const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("Gemini API error:", resp.status, err);
      return null;
    }

    const result = await resp.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("Gemini returned no text");
      return null;
    }

    const analysis: AIAnalysis = JSON.parse(text);
    return analysis;
  } catch (error) {
    console.error("AI analysis failed:", error);
    return null;
  }
}
