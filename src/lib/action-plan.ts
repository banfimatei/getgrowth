import type { AppData, AuditCategory, RuleResult } from "./aso-rules";
import { STORE_LIMITS } from "./aso-rules";

export interface ActionItem {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  effort: "quick" | "medium" | "heavy";
  category: string;
  title: string;
  currentState: string;
  action: string;
  example?: string;
  impact: string;
  scoreBoost: string;
}

export function generateActionPlan(
  appData: AppData,
  categories: AuditCategory[],
  overallScore: number
): ActionItem[] {
  const actions: ActionItem[] = [];
  const catMap = new Map(categories.map(c => [c.id, c]));

  // --- TITLE ---
  const titleCat = catMap.get("title");
  if (titleCat) {
    const lengthRule = titleCat.results.find(r => r.ruleId === "title-length");
    if (lengthRule && lengthRule.score < 90) {
      const remaining = 30 - appData.title.length;
      actions.push({
        id: "title-expand",
        priority: remaining > 10 ? "critical" : "high",
        effort: "quick",
        category: "Title",
        title: `Use ${remaining} unused title characters`,
        currentState: `"${appData.title}" (${appData.title.length}/30 chars)`,
        action: `Add your highest-priority keyword to fill the remaining ${remaining} characters. The title is the most heavily weighted metadata field.`,
        example: appData.title.length < 20
          ? `"${appData.title} - [Primary Keyword]"`
          : `"${appData.title} [Keyword]"`,
        impact: "Direct ranking improvement for added keywords",
        scoreBoost: "+10-20 on Title score",
      });
    }

    const keywordRule = titleCat.results.find(r => r.ruleId === "title-keywords");
    if (keywordRule && keywordRule.score < 60) {
      actions.push({
        id: "title-add-keywords",
        priority: "critical",
        effort: "quick",
        category: "Title",
        title: "Add descriptive keywords to your title",
        currentState: `"${appData.title}" appears to be brand-only`,
        action: `Restructure as "Brand \u2013 Keyword Phrase" format. Even well-known brands like Waze use "Waze: Navigation & Live Traffic".`,
        example: `"${appData.title.split(/[-:|]/)[0].trim()} \u2013 [What Your App Does]"`,
        impact: "Significantly improves keyword ranking potential",
        scoreBoost: "+30-50 on Title score",
      });
    }

    const frontloadRule = titleCat.results.find(r => r.ruleId === "title-frontload");
    if (frontloadRule && frontloadRule.score < 60) {
      actions.push({
        id: "title-frontload",
        priority: "high",
        effort: "quick",
        category: "Title",
        title: "Front-load keywords in the first 15 characters",
        currentState: `First 15 chars: "${appData.title.substring(0, 15)}"`,
        action: "If your brand isn't a household name, consider keyword-first format. The first 15 characters carry the most weight and are always visible even in truncated results.",
        example: `"[Key Feature] \u2013 ${appData.title.split(/[-:|]/)[0].trim()}"`,
        impact: "Better visibility in search results",
        scoreBoost: "+20-35 on Title score",
      });
    }
  }

  // --- SUBTITLE (iOS) ---
  if (appData.platform === "ios") {
    const subtitleCat = catMap.get("subtitle");
    if (subtitleCat) {
      const lengthRule = subtitleCat.results.find(r => r.ruleId === "subtitle-length");
      if (lengthRule && lengthRule.score === 0) {
        actions.push({
          id: "subtitle-add",
          priority: "critical",
          effort: "quick",
          category: "Subtitle",
          title: "Add a subtitle \u2014 you\u2019re missing your second most valuable field",
          currentState: "No subtitle set",
          action: "Add a 30-character subtitle with your next-priority keywords. Don\u2019t repeat words from your title \u2014 Apple combines title + subtitle + keyword field automatically.",
          example: generateSubtitleSuggestion(appData),
          impact: "Unlocks an entire metadata field for keyword ranking",
          scoreBoost: "+60-90 on Subtitle score",
        });
      } else if (lengthRule && lengthRule.score < 90 && appData.subtitle) {
        const remaining = 30 - appData.subtitle.length;
        if (remaining > 4) {
          actions.push({
            id: "subtitle-expand",
            priority: "high",
            effort: "quick",
            category: "Subtitle",
            title: `Use ${remaining} unused subtitle characters`,
            currentState: `"${appData.subtitle}" (${appData.subtitle.length}/30 chars)`,
            action: `Add ${remaining} more characters of keywords. Every unused character is wasted indexable space. Don\u2019t duplicate title words.`,
            impact: "More keywords indexed for search",
            scoreBoost: "+10-25 on Subtitle score",
          });
        }
      }

      const dupeRule = subtitleCat.results.find(r => r.ruleId === "subtitle-no-duplicate");
      if (dupeRule && dupeRule.score < 70 && appData.subtitle) {
        actions.push({
          id: "subtitle-dedup",
          priority: "high",
          effort: "quick",
          category: "Subtitle",
          title: "Remove duplicated keywords from subtitle",
          currentState: `Subtitle "${appData.subtitle}" shares keywords with title`,
          action: "Replace duplicated words with new keywords. Apple\u2019s algorithm gives you 160 indexable characters total (title + subtitle + keyword field) \u2014 duplicates waste that budget.",
          impact: "More unique keywords indexed",
          scoreBoost: "+20-40 on Subtitle score",
        });
      }
    }
  }

  // --- SHORT DESCRIPTION (Android) ---
  if (appData.platform === "android") {
    const shortCat = catMap.get("short-description");
    if (shortCat) {
      const rule = shortCat.results[0];
      if (rule && rule.score < 60) {
        actions.push({
          id: "short-desc-optimize",
          priority: "critical",
          effort: "quick",
          category: "Short Description",
          title: appData.shortDescription ? "Expand your short description" : "Add a short description",
          currentState: appData.shortDescription
            ? `"${appData.shortDescription}" (${appData.shortDescription.length}/80 chars)`
            : "No short description set",
          action: "Write a compelling 80-character pitch with your primary keywords. This appears in search results and is heavily indexed by Google Play.",
          impact: "Direct Google Play ranking improvement",
          scoreBoost: "+30-60 on Short Description score",
        });
      }
    }
  }

  // --- DESCRIPTION ---
  const descCat = catMap.get("description");
  if (descCat) {
    const structRule = descCat.results.find(r => r.ruleId === "desc-structure");
    if (structRule && structRule.score < 60) {
      actions.push({
        id: "desc-restructure",
        priority: appData.platform === "android" ? "high" : "medium",
        effort: "medium",
        category: "Description",
        title: "Restructure your description for readability and conversion",
        currentState: `${appData.description.length} chars, ${structRule.message}`,
        action: "Rewrite using this proven structure:\n1. Strong opening (2-3 sentences on core value)\n2. Feature list with bullet points\n3. Social proof (awards, press, user count)\n4. Call to action",
        impact: appData.platform === "android"
          ? "Better Google Play rankings + higher conversion"
          : "Higher conversion rate from page visitors",
        scoreBoost: "+15-30 on Description score",
      });
    }

    if (appData.platform === "android") {
      const densityRule = descCat.results.find(r => r.ruleId === "desc-keyword-density");
      if (densityRule && densityRule.score < 60) {
        const titleKeywords = appData.title
          .split(/[\s\-:|\u2013\u2014]+/)
          .filter(w => w.length > 3)
          .slice(0, 3);
        actions.push({
          id: "desc-keyword-density",
          priority: "high",
          effort: "medium",
          category: "Description",
          title: "Improve keyword density in description",
          currentState: densityRule.details || "Key title keywords underrepresented in description",
          action: `Naturally mention your primary keywords 3\u20135 times each, with emphasis in the first paragraph. Target words: ${titleKeywords.map(w => `"${w}"`).join(", ")}`,
          impact: "Google indexes the full description \u2014 density matters more than raw count",
          scoreBoost: "+15-30 on Description score",
        });
      }
    }
  }

  // --- VISUALS ---
  const visualsCat = catMap.get("visuals");
  if (visualsCat) {
    const countRule = visualsCat.results.find(r => r.ruleId === "screenshot-count");
    const maxScreenshots = appData.platform === "ios" ? 10 : 8;
    if (countRule && appData.screenshotCount < 6) {
      actions.push({
        id: "screenshots-add",
        priority: "critical",
        effort: "heavy",
        category: "Visual Assets",
        title: `Add more screenshots (${appData.screenshotCount} \u2192 ${maxScreenshots})`,
        currentState: `${appData.screenshotCount}/${maxScreenshots} screenshot slots used`,
        action: `Upload ${maxScreenshots - appData.screenshotCount} more screenshots. Follow the gallery order:\n1. Hero (core value prop)\n2. Differentiator (what makes you unique)\n3. Popular feature\n4. Social proof\n5. Additional features\n6-${maxScreenshots}. Secondary features & use cases`,
        impact: "Screenshots are the #1 conversion driver on store pages",
        scoreBoost: "+20-40 on Visual Assets score",
      });
    }

    if (appData.platform === "ios") {
      actions.push({
        id: "screenshots-ocr",
        priority: "high",
        effort: "medium",
        category: "Visual Assets",
        title: "Optimize screenshot captions for Apple\u2019s OCR indexing",
        currentState: "Apple now uses OCR to extract and index text from screenshot captions",
        action: "Map your top 5\u201310 ASO keywords across screenshot captions. Use bold sans-serif fonts at 40pt+ with high contrast. Replace generic text like \u201CEasy to Use\u201D with keyword-rich text.",
        example: `Instead of "Listen Anywhere" \u2192 "${extractCategoryKeyword(appData)} Streaming & Playlists"`,
        impact: "Screenshots become a secondary keyword field \u2014 major 2025-2026 algorithm shift",
        scoreBoost: "+10-20 on Visual Assets score",
      });
    }

    const videoRule = visualsCat.results.find(r => r.ruleId === "video-presence");
    if (videoRule && videoRule.score < 60) {
      actions.push({
        id: "video-add",
        priority: "medium",
        effort: "heavy",
        category: "Visual Assets",
        title: "Add an app preview video",
        currentState: "No preview video detected",
        action: appData.platform === "ios"
          ? "Create a 15\u201330s video: Hook (0\u20133s with wow moment) \u2192 Feature 1 (3\u201310s) \u2192 Feature 2 (10\u201318s) \u2192 Feature 3 (18\u201325s) \u2192 CTA (25\u201330s). Videos auto-play silently in the store."
          : "Create a 30s\u20132min YouTube video. Hook in first 3 seconds. Landscape preferred. Show the core outcome, not features.",
        impact: "Increases conversion rate and time on page",
        scoreBoost: "+10-15 on Visual Assets score",
      });
    }
  }

  // --- RATINGS ---
  const ratingsCat = catMap.get("ratings");
  if (ratingsCat) {
    const scoreRule = ratingsCat.results.find(r => r.ruleId === "rating-score");
    if (scoreRule && appData.rating > 0 && appData.rating < 4.0) {
      actions.push({
        id: "ratings-improve",
        priority: "critical",
        effort: "heavy",
        category: "Ratings",
        title: `Improve rating from ${appData.rating.toFixed(1)} to 4.0+`,
        currentState: `${appData.rating.toFixed(1)} \u2605 with ${appData.ratingsCount.toLocaleString()} ratings`,
        action: "Three-step plan:\n1. Fix the top 3 complaints from recent negative reviews\n2. Implement smart review prompts after positive in-app moments (task completion, 3rd session, achievement)\n3. Respond to every negative review within 24-48h with a fix timeline",
        impact: "Ratings below 4.0 severely hurt both conversion and rankings",
        scoreBoost: "+20-40 on Ratings score",
      });
    }

    const countRule = ratingsCat.results.find(r => r.ruleId === "ratings-count");
    if (countRule && countRule.score < 60) {
      actions.push({
        id: "ratings-volume",
        priority: "high",
        effort: "medium",
        category: "Ratings",
        title: "Increase ratings volume",
        currentState: `${appData.ratingsCount.toLocaleString()} total ratings`,
        action: appData.platform === "ios"
          ? "Use SKStoreReviewController.requestReview() after positive experiences. Apple limits to 3 prompts per 365-day period per device, so time them well."
          : "Use the Google Play In-App Review API after positive moments. Show a pre-prompt screen first to filter unhappy users toward a feedback form instead.",
        impact: "Higher volume improves social proof and algorithm trust signals",
        scoreBoost: "+10-25 on Ratings score",
      });
    }
  }

  // --- MAINTENANCE ---
  const maintCat = catMap.get("maintenance");
  if (maintCat) {
    const rule = maintCat.results[0];
    if (rule && rule.score < 60) {
      actions.push({
        id: "update-app",
        priority: "high",
        effort: "medium",
        category: "Maintenance",
        title: "Ship an app update",
        currentState: rule.message,
        action: "Release an update and use it as an opportunity to refresh your ASO metadata. On iOS, each update lets you change title, subtitle, keywords, and screenshots. Plan updates every 4\u20136 weeks.",
        impact: "Both stores favor actively maintained apps in rankings",
        scoreBoost: "+30-50 on Maintenance score",
      });
    }
  }

  // --- CONVERSION ---
  const convCat = catMap.get("conversion");
  if (convCat && appData.platform === "ios") {
    const promoRule = convCat.results.find(r => r.ruleId === "promotional-text");
    if (promoRule && promoRule.score < 70) {
      actions.push({
        id: "promo-text-add",
        priority: "medium",
        effort: "quick",
        category: "Conversion",
        title: "Add promotional text (no app update needed)",
        currentState: "No promotional text set",
        action: "Write a 170-character promotional text highlighting your latest feature, a seasonal campaign, or social proof. This is your most flexible field \u2014 it can be changed anytime without submitting an update.",
        example: generatePromoTextSuggestion(appData),
        impact: "Appears above the description, influences conversion",
        scoreBoost: "+15-25 on Conversion score",
      });
    }
  }

  return actions.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const effortOrder = { quick: 0, medium: 1, heavy: 2 };
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return effortOrder[a.effort] - effortOrder[b.effort];
  });
}

function generateSubtitleSuggestion(data: AppData): string {
  const titleWords = new Set(data.title.toLowerCase().split(/[\s\-:,|]+/));
  const categoryWords = data.category.toLowerCase().split(/\s+/);
  const suggestion = categoryWords.filter(w => !titleWords.has(w) && w.length > 2);
  if (suggestion.length > 0) {
    return `Consider keywords related to "${suggestion.join(", ")}" that aren\u2019t in your title`;
  }
  return "Use keywords that describe your app\u2019s core benefit, without repeating title words";
}

function generatePromoTextSuggestion(data: AppData): string {
  return `"\u2B50 New in v${data.version || "X.X"}: [Latest Feature]. Join [X]+ ${data.category.toLowerCase()} lovers. [Social proof or seasonal hook]."`;
}

function extractCategoryKeyword(data: AppData): string {
  const cat = data.category || "";
  if (cat.toLowerCase().includes("music")) return "Music";
  if (cat.toLowerCase().includes("photo")) return "Photo";
  if (cat.toLowerCase().includes("health")) return "Health";
  if (cat.toLowerCase().includes("finance")) return "Finance";
  if (cat.toLowerCase().includes("productivity")) return "Productivity";
  return cat.split(/\s/)[0] || "App";
}
