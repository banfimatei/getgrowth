"use client";

import { useState, useCallback, useEffect, Suspense, type FormEvent } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import ScoreRing from "@/components/ScoreRing";
import CategoryCard from "@/components/CategoryCard";
import ActionPlan from "@/components/ActionPlan";
import type { AuditCategory } from "@/lib/aso-rules";
import type { ActionItem } from "@/lib/action-plan";

interface DeepDiveEnhancement {
  brief: string;
  copyOptions?: string[];
  deliverables?: string[];
}

interface VisualConceptResult {
  data: string;
  mimeType: string;
  label: string;
  commentary: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatDeepDiveResult(section: string, analysis: any, platform?: string): DeepDiveEnhancement | null {
  if (!analysis) return null;
  const p = platform || "ios";

  switch (section) {
    case "screenshots":
      return formatScreenshotsDeepDive(analysis, p);
    case "description":
      return formatDescriptionDeepDive(analysis, p);
    case "title":
      return formatTitleDeepDive(analysis);
    case "subtitle":
      return formatSubtitleDeepDive(analysis);
    case "keywords":
      return formatKeywordsDeepDive(analysis);
    case "shortDescription":
      return formatShortDescriptionDeepDive(analysis);
    case "icon":
      return formatIconDeepDive(analysis, p);
    case "video":
      return formatVideoDeepDive(analysis, p);
    case "ratings":
      return formatRatingsDeepDive(analysis, p);
    case "maintenance":
      return formatMaintenanceDeepDive(analysis, p);
    case "localization":
      return formatLocalizationDeepDive(analysis);
    case "cpp":
      return formatCppDeepDive(analysis, p);
    default:
      return { brief: JSON.stringify(analysis, null, 2) };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatScreenshotsDeepDive(ai: any, platform: string): DeepDiveEnhancement {
  const isIOS = platform === "ios";
  let b = "";

  b += `**AI Screenshot Analysis** (deep-dive, vision-powered):\n`;
  if (ai.overallAssessment) b += `${ai.overallAssessment}\n`;
  if (ai.galleryCoherence) b += `**Gallery coherence:** ${ai.galleryCoherence}/10\n`;
  if (ai.visualIdentity) b += `**Visual identity:** ${ai.visualIdentity}\n`;
  b += "\n";

  if (ai.firstThreeVerdict) b += `**First 3 Rule verdict:** ${ai.firstThreeVerdict}\n\n`;

  b += `**Per-screenshot analysis:**\n`;
  if (ai.perScreenshot?.length) {
    for (const ss of ai.perScreenshot) {
      b += `\n  \u2705 **Slot ${ss.slot}:**\n`;
      b += `     Shows: ${ss.whatItShows}\n`;
      if (ss.style) b += `     Style: ${ss.style}\n`;
      if (ss.captionVisible && ss.captionVisible !== "none") b += `     Visible caption: "${ss.captionVisible}"\n`;
      if (ss.captionQuality) b += `     Caption assessment: ${ss.captionQuality}\n`;
      if (ss.captionSuggestions?.length) {
        b += `     Suggested captions: ${ss.captionSuggestions.map((c: string) => `"${c}"`).join(" | ")}\n`;
      } else if (ss.captionSuggestion) {
        b += `     Suggested caption: "${ss.captionSuggestion}"\n`;
      }
      if (ss.issues?.length) {
        for (const issue of ss.issues) b += `     \u274C ${issue}\n`;
      }
      if (ss.designBrief) b += `     **Design brief:** ${ss.designBrief}\n`;
    }
  }

  if (ai.missingSlots?.length) {
    b += `\n**Missing screenshots to add** *(verify each feature is live in your app before shooting)*:\n`;
    for (const ms of ai.missingSlots) {
      b += `\n  \u274C **Slot ${ms.slot}:**\n`;
      b += `     What to show: ${ms.whatToShow}\n`;
      b += `     Suggested caption: "${ms.captionSuggestion}"\n`;
      if (ms.recommendedStyle) b += `     Recommended style: ${ms.recommendedStyle}\n`;
      if (ms.designBrief) b += `     **Design brief:** ${ms.designBrief}\n`;
    }
  }

  if (ai.commonMistakesFound?.length) {
    b += `\n**Common mistakes detected:**\n`;
    for (const m of ai.commonMistakesFound) b += `  \u274C ${m}\n`;
  }

  if (ai.galleryReorderSuggestion) b += `\n**Reorder suggestion:** ${ai.galleryReorderSuggestion}\n`;
  if (ai.ocrOptimization) b += `\n**OCR optimization:** ${ai.ocrOptimization}\n`;

  // Compact reference (same as initial brief)
  b += `\n**Caption rules:** 2-5 words \u2022 benefit-focused \u2022 40pt+ bold sans-serif \u2022 keyword-aware\n`;
  if (isIOS) {
    b += `**iOS OCR:** Apple indexes caption text as keywords \u2014 first 3 screenshots carry most weight. Align captions with your title + subtitle keywords.\n`;
    b += `**Design specs:** 1320\u00D72868px (6.9") | 1290\u00D72796px (6.7") | 1242\u00D72208px (5.5") \u2014 upload 6.9" and Apple scales down.\n`;
    b += `**Device frame:** iPhone 16 Pro (Dynamic Island, no home button)\n`;
    b += `**A/B test:** Apple PPO supports up to 3 treatments. Test screenshot order, caption copy, and visual style.\n`;
  } else {
    b += `**Android:** Keep promo text under 20% of image area. Use Store Listing Experiments (7+ days, 50%+ traffic).\n`;
    b += `**Design specs:** 1080\u00D71920px (standard) | 1440\u00D72560px (high-res) | Feature graphic 1024\u00D7500px\n`;
    b += `**Device frame:** Pixel 9 or current flagship Android device\n`;
  }

  // Extract caption copy options
  const copyOptions: string[] = [];
  if (ai.perScreenshot?.length) {
    for (const ss of ai.perScreenshot) {
      if (ss.captionSuggestions?.length) {
        copyOptions.push(ss.captionSuggestions[0]);
      } else if (ss.captionSuggestion) {
        copyOptions.push(ss.captionSuggestion);
      }
    }
  }
  if (ai.missingSlots?.length) {
    for (const ms of ai.missingSlots) {
      if (ms.captionSuggestion) copyOptions.push(ms.captionSuggestion);
    }
  }

  // Build deliverables
  const deliverables: string[] = [];
  const existingCount = ai.perScreenshot?.length || 0;
  const missingCount = ai.missingSlots?.length || 0;
  const hasFrameIssues = JSON.stringify(ai.perScreenshot || []).toLowerCase().includes("outdated");
  const hasUIIssues = JSON.stringify(ai.perScreenshot || []).toLowerCase().match(/2019|2020|outdated ui/);

  if (hasFrameIssues) deliverables.push(`Reshoot all ${existingCount} existing screenshots with current-gen device frames (${isIOS ? "iPhone 16 Pro" : "Pixel 9"})`);
  if (hasUIIssues) deliverables.push("Update all screenshots to show the current app version (outdated UI/dates detected)");
  if (missingCount > 0) deliverables.push(`Design ${missingCount} new screenshots for slots ${existingCount + 1}-${existingCount + missingCount} (see above)`);
  deliverables.push(`Export at platform-required resolutions`);
  deliverables.push(`Upload to ${isIOS ? "App Store Connect \u203A Media Manager" : "Google Play Console \u203A Store Listing"}`);
  if (isIOS) deliverables.push("Verify OCR readability (zoom to 25% test)");
  deliverables.push("Set up A/B test with current vs new screenshots");

  return { brief: b, copyOptions: copyOptions.length > 0 ? copyOptions : undefined, deliverables };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatDescriptionDeepDive(ai: any, platform: string): DeepDiveEnhancement {
  const isAndroid = platform === "android";
  let b = "**AI Description Analysis** (deep-dive):\n\n";

  // Keyword gaps from current description
  if (ai.keywordGaps?.length) {
    b += `**Missing keywords in current description:** ${ai.keywordGaps.map((w: string) => `"${w}"`).join(", ")}\n\n`;
  }

  if (ai.keywordStrategy) b += `**Keyword Strategy:**\n${ai.keywordStrategy}\n\n`;

  if (ai.structuralChanges?.length) {
    b += `**Structural Changes:**\n`;
    for (const c of ai.structuralChanges) b += `  \u2022 ${c}\n`;
    b += "\n";
  }

  const copyOptions: string[] = [];

  // Opening hook + bullets breakdown ? shown before the full rewrite so users
  // get the headline content immediately without scrolling through 4,000 chars.
  if (ai.openingHook) {
    b += `---\n\n`;
    b += `**Opening hook** (first impression ? must lead with value, not intro fluff):\n\n`;
    b += `${ai.openingHook}\n\n`;
  }
  if (ai.featureBullets?.length) {
    b += `**Feature bullets** (benefit-focused ? paste directly):\n`;
    for (const bullet of ai.featureBullets) b += `${bullet}\n`;
    b += "\n";
  }
  if (ai.cta) b += `**Closing CTA:** ${ai.cta}\n\n`;

  // Primary rewrite ? full copy-paste version
  if (ai.primaryRewrite) {
    b += `---\n\n`;
    b += `**Recommended Description** (${ai.charCounts?.primary || "?"} chars, ready to copy-paste):\n\n`;
    b += `${ai.primaryRewrite}\n\n`;
    copyOptions.push(ai.primaryRewrite);
  }

  if (ai.alternativeA) {
    b += `---\n\n`;
    b += `**Alternative A** (${ai.charCounts?.altA || "?"} chars):\n\n`;
    b += `${ai.alternativeA}\n\n`;
    copyOptions.push(ai.alternativeA);
  }

  if (ai.alternativeB) {
    b += `---\n\n`;
    b += `**Alternative B** (${ai.charCounts?.altB || "?"} chars):\n\n`;
    b += `${ai.alternativeB}\n\n`;
    copyOptions.push(ai.alternativeB);
  }

  // Platform-specific notes
  if (isAndroid) {
    b += `---\n\n`;
    b += `**Note:** Google Play indexes the full description \u2014 keyword density and placement directly affect rankings.\n`;
  } else {
    b += `---\n\n`;
    b += `**Note:** iOS description is NOT indexed for search, but it directly impacts conversion rate and is indexed by web search engines.\n`;
  }

  const deliverables = [
    "Review the AI-written description and adapt for brand voice",
    `Paste into ${isAndroid ? "Google Play Console \u203A Full description" : "App Store Connect \u203A Description"}`,
    "Verify character count meets platform requirements",
    "Run keyword density check on final version",
    "Set up A/B test (current vs new description)",
  ];
  if (!isAndroid) deliverables.push("Requires app update submission to take effect on iOS");

  return { brief: b, copyOptions: copyOptions.length > 0 ? copyOptions : undefined, deliverables };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTitleDeepDive(ai: any): DeepDiveEnhancement {
  const hasPairedSets = ai.pairedSets?.length > 0;
  // Detect Android pairs: paired sets that have shortDescription instead of subtitle
  const isAndroidPair = hasPairedSets && ai.pairedSets[0]?.shortDescription !== undefined;
  const isIosPair = hasPairedSets && !isAndroidPair;

  let b = isIosPair
    ? "**AI Title + Subtitle Analysis** (deep-dive, paired strategy):\n\n"
    : isAndroidPair
      ? "**AI Title + Short Description Analysis** (deep-dive, paired strategy):\n\n"
      : "**AI Title Analysis** (deep-dive):\n\n";

  if (ai.currentAnalysis) b += `${ai.currentAnalysis}\n\n`;

  if (isIosPair) {
    b += `**Paired Title + Subtitle Sets** (designed as coordinated keyword strategies):\n\n`;
    for (let i = 0; i < ai.pairedSets.length; i++) {
      const pair = ai.pairedSets[i];
      b += `  **Set ${i + 1}** (${pair.strategy || "hybrid"}):\n`;
      b += `    Title: "${pair.title}" (${pair.titleCharCount || pair.title?.length || "?"}ch)\n`;
      b += `    Subtitle: "${pair.subtitle}" (${pair.subtitleCharCount || pair.subtitle?.length || "?"}ch)\n`;
      if (pair.keywordsCovered?.length) {
        b += `    Keywords covered: ${pair.keywordsCovered.join(", ")} (${pair.keywordsCovered.length} unique terms)\n`;
      }
      b += `    ${pair.reasoning}\n\n`;
    }
  } else if (isAndroidPair) {
    b += `**Paired Title + Short Description Sets** (coordinated for max keyword coverage + conversion):\n\n`;
    for (let i = 0; i < ai.pairedSets.length; i++) {
      const pair = ai.pairedSets[i];
      b += `  **Set ${i + 1}** (${pair.strategy || "keyword-first"}):\n`;
      b += `    Title: "${pair.title}" (${pair.titleCharCount || pair.title?.length || "?"}ch)\n`;
      b += `    Short description: "${pair.shortDescription}" (${pair.shortDescCharCount || pair.shortDescription?.length || "?"}ch)\n`;
      if (pair.keywordsCovered?.length) {
        b += `    Keywords covered: ${pair.keywordsCovered.join(", ")} (${pair.keywordsCovered.length} unique terms)\n`;
      }
      b += `    ${pair.reasoning}\n\n`;
    }
  } else if (ai.variants?.length) {
    b += `**Title Variants:**\n`;
    for (const v of ai.variants) {
      b += `  \u2022 "${v.title}" (${v.charCount}ch) \u2014 ${v.strategy}: ${v.reasoning}\n`;
    }
    b += "\n";
  }

  if (ai.keywordCoverage?.length) {
    b += `**Keyword coverage across ${hasPairedSets ? "paired sets" : "variants"}:**\n`;
    for (const k of ai.keywordCoverage) {
      b += `  \u2022 "${k.keyword}" (${k.searchVolume}) \u2014 in: ${k.presentIn?.join(", ") || "none"}\n`;
    }
    b += "\n";
  }

  if (ai.recommendation) b += `**Recommendation:** ${ai.recommendation}\n`;

  const copyOptions: string[] = [];
  if (isIosPair) {
    for (const pair of ai.pairedSets) {
      if (pair.title && pair.subtitle) {
        copyOptions.push(`Title: "${pair.title}" + Subtitle: "${pair.subtitle}"`);
      }
    }
  } else if (isAndroidPair) {
    for (const pair of ai.pairedSets) {
      if (pair.title && pair.shortDescription) {
        copyOptions.push(`Title: "${pair.title}" + Short desc: "${pair.shortDescription}"`);
      }
    }
  } else if (ai.variants?.length) {
    for (const v of ai.variants) {
      if (v.title) copyOptions.push(v.title);
    }
  }

  const deliverables = isIosPair
    ? [
        "Choose a paired title + subtitle set (or adapt)",
        "Verify zero word overlap between chosen title and subtitle",
        "Update both in App Store Connect \u203A App Information",
        "Update keyword field to complement (remove words now covered by title/subtitle)",
        "A/B test with Apple PPO for 7+ days",
        "Monitor keyword rankings for 2 weeks after change",
      ]
    : isAndroidPair
      ? [
          "Choose a paired title + short description set (or adapt)",
          "Verify the short description front-loads a different keyword from the title",
          "Update both in Google Play Console \u203A Store Listing",
          "Both take effect immediately \u2014 no app update required",
          "Run a Store Listing Experiment to A/B test the paired variants for 7+ days",
          "Monitor keyword rankings for 2 weeks after change",
        ]
      : [
          "Choose preferred title variant",
          "Update in store listing and submit for review",
          "Monitor keyword rankings for 2 weeks after change",
        ];

  return { brief: b, copyOptions: copyOptions.length > 0 ? copyOptions : undefined, deliverables };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatSubtitleDeepDive(ai: any): DeepDiveEnhancement {
  let b = "**AI Subtitle Analysis** (deep-dive, iOS):\n\n";

  if (ai.currentAnalysis) b += `${ai.currentAnalysis}\n\n`;

  if (ai.titleOverlapCheck) b += `**Title/subtitle overlap check:** ${ai.titleOverlapCheck}\n\n`;

  if (ai.variants?.length) {
    b += `**Subtitle Variants** (30 chars max):\n`;
    for (const v of ai.variants) {
      b += `  \u2022 "${v.subtitle}" (${v.charCount}ch)`;
      if (v.keywordsAdded?.length) b += ` \u2014 adds: ${v.keywordsAdded.join(", ")}`;
      b += `\n    ${v.reasoning}\n`;
    }
    b += "\n";
  }

  if (ai.recommendation) b += `**Recommendation:** ${ai.recommendation}\n`;

  const copyOptions: string[] = [];
  if (ai.variants?.length) {
    for (const v of ai.variants) {
      if (v.subtitle) copyOptions.push(v.subtitle);
    }
  }

  const deliverables = [
    "Choose preferred subtitle variant",
    "Verify zero word overlap with title before submission",
    "Update in App Store Connect (requires app update submission)",
    "Monitor keyword rankings for 2 weeks after change",
  ];

  return { brief: b, copyOptions: copyOptions.length > 0 ? copyOptions : undefined, deliverables };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatKeywordsDeepDive(ai: any): DeepDiveEnhancement {
  let b = "**AI Keyword Field Analysis** (deep-dive, iOS):\n\n";

  if (ai.currentAnalysis) b += `${ai.currentAnalysis}\n\n`;

  if (ai.wastedWords?.length) {
    b += `**Wasted words** (already in title/subtitle, remove from keyword field):\n`;
    for (const w of ai.wastedWords) b += `  \u274C ${w}\n`;
    b += "\n";
  }

  if (ai.optimizedField) {
    b += `---\n\n`;
    b += `**Optimized keyword field** (${ai.charCount || "?"}/100 chars):\n\n`;
    b += `\`${ai.optimizedField}\`\n\n`;
  }

  if (ai.keywordsIncluded?.length) {
    b += `**Keywords included:**\n`;
    for (const k of ai.keywordsIncluded) {
      if (typeof k === "string") {
        b += `  \u2705 ${k}\n`;
      } else {
        b += `  \u2705 "${k.keyword}" \u2014 ${k.reasoning}\n`;
      }
    }
    b += "\n";
  }

  if (ai.keywordsExcluded?.length) {
    b += `**Keywords considered but excluded:**\n`;
    for (const k of ai.keywordsExcluded) b += `  \u2022 ${k}\n`;
    b += "\n";
  }

  if (ai.combinationExamples?.length) {
    b += `**Search queries this field enables:**\n`;
    for (const c of ai.combinationExamples) b += `  \u2022 ${c}\n`;
    b += "\n";
  }

  if (ai.recommendation) b += `**Strategy:** ${ai.recommendation}\n`;

  const copyOptions: string[] = [];
  if (ai.optimizedField) copyOptions.push(ai.optimizedField);

  const deliverables = [
    "Copy the optimized keyword field above",
    "Paste into App Store Connect \u203A Keywords (comma-separated)",
    "Verify no words overlap with title or subtitle",
    "Submit app update to apply changes",
    "Update keyword field quarterly based on ranking data",
  ];

  return { brief: b, copyOptions: copyOptions.length > 0 ? copyOptions : undefined, deliverables };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatShortDescriptionDeepDive(ai: any): DeepDiveEnhancement {
  let b = "**AI Short Description Analysis** (deep-dive):\n\n";

  if (ai.currentAnalysis) b += `${ai.currentAnalysis}\n\n`;

  if (ai.variants?.length) {
    b += `**Short Description Variants** (80 chars max):\n`;
    for (const v of ai.variants) {
      b += `  \u2022 "${v.text}" (${v.charCount}ch) \u2014 ${v.strategy}: ${v.reasoning}\n`;
    }
    b += "\n";
  }

  if (ai.keywordsTargeted?.length) {
    b += `**Keywords targeted:** ${ai.keywordsTargeted.join(", ")}\n\n`;
  }

  if (ai.recommendation) b += `**Recommendation:** ${ai.recommendation}\n`;

  const copyOptions: string[] = [];
  if (ai.variants?.length) {
    for (const v of ai.variants) {
      if (v.text) copyOptions.push(v.text);
    }
  }

  const deliverables = [
    "Choose preferred short description variant",
    "Update in Google Play Console \u203A Store Listing \u203A Short description",
    "Run a Store Listing Experiment to A/B test top 2 variants",
  ];

  return { brief: b, copyOptions: copyOptions.length > 0 ? copyOptions : undefined, deliverables };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatIconDeepDive(ai: any, platform: string): DeepDiveEnhancement {
  const isIOS = platform === "ios";
  let b = "**AI Icon Analysis** (deep-dive, vision-powered):\n\n";
  if (ai.assessment) b += `${ai.assessment}\n\n`;

  if (ai.strengths?.length) {
    b += `**Strengths:**\n`;
    for (const s of ai.strengths) b += `  \u2705 ${s}\n`;
    b += "\n";
  }

  if (ai.issues?.length) {
    b += `**Issues found:**\n`;
    for (const issue of ai.issues) b += `  \u274C ${issue}\n`;
    b += "\n";
  }

  if (ai.readabilityAt60px) b += `**Readability at 60x60px:** ${ai.readabilityAt60px}\n\n`;
  if (ai.colorAnalysis) b += `**Color analysis:** ${ai.colorAnalysis}\n\n`;
  if (ai.competitorComparison) b += `**Category comparison:** ${ai.competitorComparison}\n\n`;

  if (ai.redesignBrief) {
    b += `---\n\n`;
    b += `**Redesign brief for designer:**\n${ai.redesignBrief}\n\n`;
  }

  if (ai.suggestions?.length) {
    b += `**Actionable improvements:**\n`;
    for (const s of ai.suggestions) b += `  \u2022 ${s}\n`;
    b += "\n";
  }

  b += `---\n\n`;
  b += `**Icon specs:** ${isIOS ? "1024x1024px, no transparency, Apple applies rounded corners automatically" : "512x512px, provide adaptive icon layers (foreground + background)"}\n`;

  const deliverables = [
    "Design 2-3 icon variants based on the redesign brief above",
    "Test at 60x60px, 120x120px, and 1024x1024px sizes",
    "Verify visibility on both light and dark backgrounds",
    `Export at ${isIOS ? "1024x1024px (no alpha channel)" : "512x512px with adaptive icon layers"}`,
    `Upload to ${isIOS ? "App Store Connect" : "Google Play Console"}`,
    `A/B test with ${isIOS ? "Apple PPO (Product Page Optimization)" : "Google Play Store Listing Experiments"}`,
  ];

  return { brief: b, deliverables };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatVideoDeepDive(ai: any, platform: string): DeepDiveEnhancement {
  const isIOS = platform === "ios";
  let b = "**AI Video Strategy** (deep-dive):\n\n";

  if (ai.assessment) b += `${ai.assessment}\n\n`;

  if (ai.hookStrategy) b += `**Hook strategy (first 3 seconds):** ${ai.hookStrategy}\n\n`;

  if (ai.storyboard?.length) {
    b += `**Video storyboard:**\n\n`;
    for (const seg of ai.storyboard) {
      b += `  \u2022 **${seg.duration} \u2014 ${seg.segment}:** ${seg.content}\n`;
      if (seg.caption) b += `    Caption: "${seg.caption}"\n`;
      if (seg.whyItWorks) b += `    Why: ${seg.whyItWorks}\n`;
    }
    b += "\n";
  }

  if (ai.posterFrame) b += `**Poster frame / thumbnail:** ${ai.posterFrame}\n\n`;
  if (ai.musicDirection) b += `**Music direction:** ${ai.musicDirection}\n\n`;
  if (ai.transitionStyle) b += `**Transition style:** ${ai.transitionStyle}\n\n`;

  if (ai.keyMessages?.length) {
    b += `**Key messages to convey:**\n`;
    for (const msg of ai.keyMessages) b += `  \u2022 ${msg}\n`;
    b += "\n";
  }

  if (ai.commonMistakes?.length) {
    b += `**Mistakes to avoid:**\n`;
    for (const m of ai.commonMistakes) b += `  \u274C ${m}\n`;
    b += "\n";
  }

  // Platform-specific specs
  b += `---\n\n`;
  if (isIOS) {
    b += `**Specs:** 15-30s, H.264 .mov or .mp4, no letterboxing\n`;
    b += `**Sizes:** 886\u00D71920 (5.5") | 1080\u00D71920 (6.1") | 1284\u00D72778 (6.5") | 1290\u00D72796 (6.7") | 1320\u00D72868 (6.9")\n`;
    b += `**Rules:** Real app footage only (no renders), no people outside the device, loops silently in store\n`;
  } else {
    b += `**Specs:** 30s-2min YouTube video, landscape preferred\n`;
    b += `**Upload:** YouTube URL in Google Play Console \u203A Promo video\n`;
    b += `**Rules:** Can mix in-app footage with motion graphics and text overlays\n`;
  }

  const deliverables = [
    "Write final video script based on storyboard above",
    "Record in-app screen captures for each segment with real content",
    isIOS ? "Edit to 15-30s, export H.264 .mov for all device sizes" : "Edit to 30-60s, export and upload to YouTube",
    "Add caption overlays for silent autoplay",
    "Add background music (royalty-free) matching the recommended mood",
    "Select poster frame / thumbnail",
    isIOS ? "Upload to App Store Connect \u203A App Preview" : "Add YouTube URL to Google Play Console",
  ];

  return { brief: b, deliverables };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatRatingsDeepDive(ai: any, platform: string): DeepDiveEnhancement {
  const isIOS = platform === "ios";
  let b = "**AI Ratings & Reviews Analysis** (deep-dive):\n\n";

  if (ai.assessment) b += `${ai.assessment}\n\n`;
  if (ai.ratingAnalysis) b += `**Rating signal:** ${ai.ratingAnalysis}\n\n`;
  if (ai.volumeAnalysis) b += `**Volume signal:** ${ai.volumeAnalysis}\n\n`;
  if (ai.competitorBenchmark) b += `**Category benchmark:** ${ai.competitorBenchmark}\n\n`;

  if (ai.promptStrategy) {
    b += `---\n\n**Review prompt strategy:**\n\n`;
    if (ai.promptStrategy.bestMoments?.length) {
      b += `**Best moments to prompt:**\n`;
      for (const m of ai.promptStrategy.bestMoments) b += `  \u2705 ${m}\n`;
      b += "\n";
    }
    if (ai.promptStrategy.worstMoments?.length) {
      b += `**Never prompt after:**\n`;
      for (const m of ai.promptStrategy.worstMoments) b += `  \u274C ${m}\n`;
      b += "\n";
    }
    if (ai.promptStrategy.implementation) b += `**Implementation:** ${ai.promptStrategy.implementation}\n\n`;
  }

  if (ai.negativeReviewStrategy) b += `**Negative review strategy:** ${ai.negativeReviewStrategy}\n\n`;

  if (ai.suggestions?.length) {
    b += `**Recommendations:**\n`;
    for (const s of ai.suggestions) b += `  \u2022 ${s}\n`;
    b += "\n";
  }

  const deliverables = [
    "Export and categorize recent negative reviews (top 3 complaint themes)",
    "Prioritize fixes by frequency ? severity",
    `Implement ${isIOS ? "SKStoreReviewController" : "In-App Review API"} with the trigger moments above`,
    "Set up review monitoring and response workflow (24-48h SLA)",
    "Ship fix for #1 complaint and mention in release notes",
  ];

  return { brief: b, deliverables };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatMaintenanceDeepDive(ai: any, platform: string): DeepDiveEnhancement {
  let b = "**AI Maintenance Analysis** (deep-dive):\n\n";

  if (ai.assessment) b += `${ai.assessment}\n\n`;
  if (ai.releaseNotesQuality) b += `**Release notes quality:** ${ai.releaseNotesQuality}\n\n`;
  if (ai.updateCadence) b += `**Recommended cadence:** ${ai.updateCadence}\n\n`;

  if (ai.seasonalOpportunities?.length) {
    b += `**Seasonal opportunities:**\n`;
    for (const s of ai.seasonalOpportunities) b += `  \u2022 ${s}\n`;
    b += "\n";
  }

  if (ai.metadataRefreshPlan) b += `**Metadata refresh plan:** ${ai.metadataRefreshPlan}\n\n`;

  if (ai.suggestions?.length) {
    b += `**Recommendations:**\n`;
    for (const s of ai.suggestions) b += `  \u2022 ${s}\n`;
    b += "\n";
  }

  const copyOptions: string[] = [];
  if (ai.releaseNotesSuggestions?.length) {
    for (const rn of ai.releaseNotesSuggestions) copyOptions.push(rn);
  }

  const deliverables = [
    "Prepare new build with improvements",
    "Write release notes using AI suggestions above",
    `Refresh ASO metadata alongside the update`,
    `Submit to ${platform === "ios" ? "App Store Connect" : "Google Play Console"}`,
    "Monitor ranking and conversion metrics daily for 2 weeks post-update",
  ];

  return { brief: b, copyOptions: copyOptions.length > 0 ? copyOptions : undefined, deliverables };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatCppDeepDive(ai: any, platform: string): DeepDiveEnhancement {
  const isIos = platform === "ios";
  const label = isIos ? "Custom Product Pages" : "Custom Store Listings";
  let b = `**AI ${label} Strategy** (deep-dive):\n\n`;

  if (ai.assessment) b += `${ai.assessment}\n\n`;
  if (ai.currentState) b += `**Current state:** ${ai.currentState}\n`;
  if (ai.priority) b += `**Priority:** ${ai.priority}\n`;
  if (ai.reasoning) b += `${ai.reasoning}\n\n`;

  if (ai.pages?.length) {
    b += `---\n\n**Recommended ${label}:**\n\n`;
    for (let i = 0; i < ai.pages.length; i++) {
      const pg = ai.pages[i];
      b += `**${i + 1}. ${pg.name || `Page ${i + 1}`}**\n`;
      if (pg.targetIntent) b += `  Target: ${pg.targetIntent}\n`;
      if (pg.heroScreenshot) b += `  Hero screenshot: ${pg.heroScreenshot}\n`;
      if (pg.supportingScreenshots?.length) {
        b += `  Supporting: ${pg.supportingScreenshots.join(" ? ")}\n`;
      }
      if (isIos) {
        if (pg.promotionalText) b += `  Promotional text: "${pg.promotionalText}"\n`;
        if (pg.captionKeywords?.length) b += `  OCR keywords: ${pg.captionKeywords.join(", ")}\n`;
      } else {
        if (pg.title) b += `  Title: "${pg.title}"\n`;
        if (pg.shortDescription) b += `  Short description: "${pg.shortDescription}"\n`;
      }
      if (pg.adIntegration) b += `  Ad integration: ${pg.adIntegration}\n`;
      if (pg.expectedImpact) b += `  Expected impact: ${pg.expectedImpact}\n`;
      b += "\n";
    }
  }

  if (ai.seasonalOpportunities?.length) {
    b += `---\n\n**Seasonal / event opportunities:**\n`;
    for (const s of ai.seasonalOpportunities) b += `  \u2022 ${s}\n`;
    b += "\n";
  }

  if (ai.measurementPlan) b += `**Measurement plan:** ${ai.measurementPlan}\n\n`;

  if (ai.implementationSteps?.length) {
    b += `**Implementation steps:**\n`;
    for (let i = 0; i < ai.implementationSteps.length; i++) {
      b += `  ${i + 1}. ${ai.implementationSteps[i]}\n`;
    }
    b += "\n";
  }

  if (ai.suggestions?.length) {
    b += `**Recommendations:**\n`;
    for (const s of ai.suggestions) b += `  \u2022 ${s}\n`;
    b += "\n";
  }

  // Surface copy-paste-ready content from each page as copyOptions
  const cppCopyOptions: string[] = [];
  if (isIos) {
    for (const pg of ai.pages || []) {
      if (pg.promotionalText) {
        cppCopyOptions.push(`[${pg.name || "CPP"}] Promo text: "${pg.promotionalText}"`);
      }
    }
  } else {
    for (const pg of ai.pages || []) {
      if (pg.title) cppCopyOptions.push(`[${pg.name || "Listing"}] Title: "${pg.title}"`);
      if (pg.shortDescription) cppCopyOptions.push(`[${pg.name || "Listing"}] Short desc: "${pg.shortDescription}"`);
    }
  }

  const deliverables = isIos
    ? [
        ...(ai.pages || []).map((pg: { name?: string }) => `Design screenshot set for CPP: "${pg.name || "Unnamed"}"`),
        "Create CPPs in App Store Connect ? Custom Product Pages",
        "Link each CPP to corresponding Apple Search Ads ad group",
        "Write keyword-optimized captions per CPP for OCR indexing",
        "Monitor conversion rates per CPP vs default page",
        "Set up seasonal CPP rotation calendar",
      ]
    : [
        ...(ai.pages || []).map((pg: { name?: string }) => `Create custom store listing: "${pg.name || "Unnamed"}"`),
        "Set up listings in Google Play Console ? Custom store listings",
        "Link listings to Google Ads campaigns",
        "Research local keywords per target market (not translations)",
        "Monitor conversion rates per listing vs default",
      ];

  return { brief: b, copyOptions: cppCopyOptions.length > 0 ? cppCopyOptions : undefined, deliverables };
}

function formatLocalizationDeepDive(ai: any): DeepDiveEnhancement {
  let b = "**AI Localization Strategy** (deep-dive):\n\n";

  if (ai.assessment) b += `${ai.assessment}\n\n`;
  if (ai.priority) b += `**Priority level:** ${ai.priority}\n`;
  if (ai.reasoning) b += `${ai.reasoning}\n\n`;

  if (ai.tier1Markets?.length) {
    b += `---\n\n**Tier 1 markets** (full localization \u2014 screenshots + metadata + local keywords):\n\n`;
    for (const m of ai.tier1Markets) {
      if (typeof m === "string") {
        b += `  \u2022 ${m}\n`;
      } else {
        b += `  \u2022 **${m.market}:** ${m.reasoning}`;
        if (m.expectedLift) b += ` (expected: ${m.expectedLift})`;
        b += "\n";
      }
    }
    b += "\n";
  }

  if (ai.tier2Markets?.length) {
    b += `**Tier 2 markets** (translated captions + metadata only):\n\n`;
    for (const m of ai.tier2Markets) {
      if (typeof m === "string") {
        b += `  \u2022 ${m}\n`;
      } else {
        b += `  \u2022 **${m.market}:** ${m.reasoning}\n`;
      }
    }
    b += "\n";
  }

  if (ai.localizationChecklist?.length) {
    b += `---\n\n**What to localize** (priority order):\n`;
    for (let i = 0; i < ai.localizationChecklist.length; i++) {
      b += `  ${i + 1}. ${ai.localizationChecklist[i]}\n`;
    }
    b += "\n";
  }

  if (ai.culturalConsiderations?.length) {
    b += `**Cultural considerations:**\n`;
    for (const c of ai.culturalConsiderations) b += `  \u2022 ${c}\n`;
    b += "\n";
  }

  if (ai.keywordStrategy) b += `**Keyword strategy:** ${ai.keywordStrategy}\n\n`;

  if (ai.suggestions?.length) {
    b += `**Recommendations:**\n`;
    for (const s of ai.suggestions) b += `  \u2022 ${s}\n`;
    b += "\n";
  }

  // Surface tier 1 markets and keyword strategy as copy options
  const locCopyOptions: string[] = [];
  if (ai.keywordStrategy) locCopyOptions.push(`Keyword strategy: ${ai.keywordStrategy}`);
  for (const m of ai.tier1Markets || []) {
    const market = typeof m === "string" ? m : m.market;
    if (market) locCopyOptions.push(market);
  }

  const deliverables = [
    "Identify top target markets using category download data",
    "Research local ASO keywords per market (not just translations)",
    "Localize title + subtitle + keyword field for Tier 1 markets",
    "Translate screenshot captions with local keywords",
    "Set up per-market keyword tracking",
  ];

  return { brief: b, copyOptions: locCopyOptions.length > 0 ? locCopyOptions : undefined, deliverables };
}

interface SearchResult {
  id: string;
  name: string;
  developer: string;
  icon: string;
  rating: number;
  platform: "ios" | "android";
  url: string;
}

interface CachedAppData {
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
  featureGraphicUrl?: string;
}

interface AuditReport {
  app: {
    title: string;
    developer: string;
    platform: string;
    rating: number;
    ratingsCount: number;
    icon?: string;
    url?: string;
  };
  overallScore: number;
  categories: AuditCategory[];
  actionPlan: ActionItem[];
  aiPowered?: boolean;
  aiText?: boolean;
  aiScreenshots?: boolean;
  aiEnabled?: boolean;
  creditsRemaining?: number;
  justUnlocked?: boolean;
  appData?: CachedAppData;
}

type ViewState = "search" | "results" | "auditing" | "report";

function AuditContent() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewState>("search");
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<"ios" | "android" | "both">("both");
  const [country, setCountry] = useState("us");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const [deepDiveLoading, setDeepDiveLoading] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    const id = searchParams.get("id");
    const p = searchParams.get("platform") as "ios" | "android" | null;
    if (id && p) {
      handleAudit({ id, name: id, developer: "", icon: "", rating: 0, platform: p, url: "" });
      window.history.replaceState({}, "", "/audit");
    }
  }, [searchParams]);

  const handleDeepDive = useCallback(async (section: string, actionId: string): Promise<DeepDiveEnhancement | string | null> => {
    if (!report?.appData) return null;
    setDeepDiveLoading(actionId);
    try {
      const resp = await fetch("/api/audit/deep-dive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appData: report.appData, section, storeId: report.app.url || report.appData?.url }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => null);
        if (errData?.needsCredits) return "__ERROR__NEEDS_CREDITS";
        return `__ERROR__${errData?.error || `AI analysis failed (${resp.status})`}`;
      }
      const data = await resp.json();
      return formatDeepDiveResult(section, data.analysis, report.appData.platform);
    } catch {
      return "__ERROR__Network error ? please try again";
    } finally {
      setDeepDiveLoading(null);
    }
  }, [report]);

  const handleVisualize = useCallback(async (section: "icon" | "screenshots", brief: string): Promise<VisualConceptResult[] | string> => {
    if (!report?.appData) return "__ERROR__No app data available";
    try {
      const resp = await fetch("/api/audit/visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appData: report.appData, section, brief, storeId: report.app.url || report.appData?.url }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => null);
        if (errData?.needsCredits) return "__ERROR__NEEDS_CREDITS";
        return `__ERROR__${errData?.error || `Visual generation failed (${resp.status})`}`;
      }
      const data = await resp.json();
      return (data.concepts || []).map((c: { data: string; mimeType: string; label: string; commentary: string }) => ({
        data: c.data,
        mimeType: c.mimeType,
        label: c.label,
        commentary: c.commentary,
      }));
    } catch {
      return "__ERROR__Network error ? please try again";
    }
  }, [report]);

  const handleSearch = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setError("");
    setSearching(true);

    try {
      const params = new URLSearchParams({ q: query, platform, country });
      const resp = await fetch(`/api/search?${params}`);
      if (!resp.ok) throw new Error("Search failed");
      const data = await resp.json();
      setResults(data.results || []);
      setView("results");
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [query, platform, country]);

  const handleAudit = useCallback(async (app: SearchResult) => {
    setView("auditing");
    setError("");

    try {
      const params = new URLSearchParams({ id: app.id, platform: app.platform, country });
      const resp = await fetch(`/api/audit?${params}`);
      if (!resp.ok) throw new Error("Audit failed");
      const data = await resp.json();
      setReport(data);
      setView("report");
    } catch {
      setError("Audit failed. Please try again.");
      setView("results");
    }
  }, [country]);

  const handleBack = useCallback(() => {
    if (view === "report") setView("results");
    else if (view === "results") setView("search");
  }, [view]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-page)" }}>
      {view !== "search" && (
        <div className="max-w-3xl mx-auto px-6 pt-4">
          <button
            onClick={handleBack}
            className="text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
            style={{ color: "var(--text-secondary)", backgroundColor: "transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-inset)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            &larr; Back
          </button>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* SEARCH VIEW */}
        {view === "search" && (
          <div className="fade-in">
            <div className="text-center mb-10">
              <h1 className="text-3xl mb-3" style={{ color: "var(--text-primary)" }}>
                Free ASO Audit
              </h1>
              <p className="text-base" style={{ color: "var(--text-secondary)", maxWidth: "480px", margin: "0 auto" }}>
                Analyze any app&rsquo;s metadata, visual assets, ratings, and conversion signals against ASO best practices. Powered by the ASO Stack framework.
              </p>
            </div>

            <form
              onSubmit={handleSearch}
              className="border rounded-lg p-5"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
            >
              <div className="mb-4">
                <label htmlFor="search-input" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                  App name or keyword
                </label>
                <input
                  id="search-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Spotify, Headspace\u2026"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full px-3.5 py-2.5 text-sm border rounded-md transition-colors"
                  style={{
                    backgroundColor: "var(--bg-page)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-body)",
                  }}
                />
              </div>

              <div className="flex gap-4 mb-5">
                <fieldset className="flex-1">
                  <legend className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                    Platform
                  </legend>
                  <div className="flex gap-2" role="radiogroup" aria-label="Platform selection">
                    {(["both", "ios", "android"] as const).map((p) => (
                      <label
                        key={p}
                        className="flex-1 cursor-pointer text-center text-sm py-2 px-3 border rounded-md transition-colors"
                        style={{
                          backgroundColor: platform === p ? "var(--accent-bg)" : "var(--bg-page)",
                          borderColor: platform === p ? "var(--accent)" : "var(--border)",
                          color: platform === p ? "var(--accent)" : "var(--text-secondary)",
                          fontWeight: platform === p ? 600 : 400,
                        }}
                      >
                        <input
                          type="radio"
                          name="platform"
                          value={p}
                          checked={platform === p}
                          onChange={() => setPlatform(p)}
                          className="sr-only"
                        />
                        {p === "both" ? "Both" : p === "ios" ? "iOS" : "Android"}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="w-24">
                  <label htmlFor="country-select" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                    Region
                  </label>
                  <select
                    id="country-select"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border rounded-md"
                    style={{
                      backgroundColor: "var(--bg-page)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="us">US</option>
                    <option value="gb">UK</option>
                    <option value="de">DE</option>
                    <option value="jp">JP</option>
                    <option value="br">BR</option>
                    <option value="kr">KR</option>
                    <option value="fr">FR</option>
                    <option value="au">AU</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="w-full py-2.5 text-sm font-semibold rounded-md transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "var(--accent)", color: "#fff" }}
              >
                {searching ? "Searching\u2026" : "Search Apps"}
              </button>
            </form>

            {error && (
              <p className="mt-4 text-sm text-center" style={{ color: "var(--fail-text)" }} role="alert">
                {error}
              </p>
            )}
          </div>
        )}

        {/* RESULTS VIEW */}
        {view === "results" && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl mb-1" style={{ color: "var(--text-primary)" }}>
                Search Results
              </h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {results.length} apps found for &ldquo;{query}&rdquo;. Select one to audit.
              </p>
            </div>

            {results.length === 0 ? (
              <div
                className="border rounded-lg p-8 text-center"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  No apps found. Try a different search term.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((app, i) => (
                  <button
                    key={`${app.platform}-${app.id}`}
                    onClick={() => handleAudit(app)}
                    className="fade-in w-full text-left border rounded-lg p-4 flex items-center gap-4 transition-colors"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      borderColor: "var(--border)",
                      animationDelay: `${i * 0.04}s`,
                      opacity: 0,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-card-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-card)"; }}
                  >
                    {app.icon ? (
                      <img
                        src={app.icon}
                        alt=""
                        width={44}
                        height={44}
                        className="rounded-lg shrink-0"
                        style={{ backgroundColor: "var(--bg-inset)" }}
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-lg shrink-0"
                        style={{ backgroundColor: "var(--bg-inset)" }}
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {app.name}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                        {app.developer}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {app.rating > 0 && (
                        <span className="text-xs font-mono tabular-nums" style={{ color: "var(--text-secondary)" }}>
                          {app.rating.toFixed(1)} {"\u2605"}
                        </span>
                      )}
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: app.platform === "ios" ? "var(--info-bg)" : "var(--pass-bg)",
                          color: app.platform === "ios" ? "var(--info-text)" : "var(--pass-text)",
                        }}
                      >
                        {app.platform === "ios" ? "iOS" : "Android"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-center" style={{ color: "var(--fail-text)" }} role="alert">
                {error}
              </p>
            )}
          </div>
        )}

        {/* AUDITING VIEW */}
        {view === "auditing" && (
          <div className="py-20 text-center fade-in">
            <div
              className="w-16 h-16 mx-auto mb-6 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "var(--bg-inset)" }}
              aria-hidden="true"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="animate-spin" style={{ animationDuration: "2s" }}>
                <circle cx="12" cy="12" r="10" stroke="var(--border)" strokeWidth="2.5" />
                <path d="M12 2a10 10 0 019.95 9" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-xl mb-2" style={{ color: "var(--text-primary)" }}>
              Running ASO Audit
            </h2>
            <p className="text-sm loading-ellipsis" style={{ color: "var(--text-secondary)" }}>
              Fetching store data and analyzing metadata
            </p>
          </div>
        )}

        {/* REPORT VIEW */}
        {view === "report" && report && (
          <div>
            {/* Report Header */}
            <div className="mb-8 fade-in">
              <div className="flex items-start gap-5 mb-6">
                {report.app.icon && (
                  <img
                    src={report.app.icon}
                    alt=""
                    width={64}
                    height={64}
                    className="rounded-2xl shrink-0"
                    style={{ backgroundColor: "var(--bg-inset)" }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl mb-1 truncate" style={{ color: "var(--text-primary)" }}>
                    {report.app.title}
                  </h2>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {report.app.developer} &middot; {report.app.platform === "ios" ? "App Store" : "Google Play"}
                    {report.app.rating > 0 && (
                      <> {"\u00B7"} {report.app.rating.toFixed(1)} {"\u2605"} ({report.app.ratingsCount.toLocaleString()})</>
                    )}
                  </p>
                </div>
              </div>

              <div
                className="border rounded-lg p-6 flex items-center gap-6"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <ScoreRing score={report.overallScore} size={100} label="Overall" />
                <div className="flex-1">
                  <h3 className="text-lg mb-2" style={{ color: "var(--text-primary)" }}>
                    ASO Health Score
                  </h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {report.overallScore >= 80
                      ? "Strong ASO foundation. Focus on the warning areas below for further gains."
                      : report.overallScore >= 60
                        ? "Decent baseline with clear optimization opportunities. Address the failing areas first."
                        : report.overallScore >= 40
                          ? "Significant gaps in ASO coverage. Prioritize the failing categories below."
                          : "Critical ASO issues detected. Start with the highest-weighted failing rules."}
                  </p>
                </div>
              </div>
            </div>

            {/* Category Scores Grid */}
            <div
              className="grid grid-cols-3 gap-3 mb-8 fade-in fade-in-delay-1"
              role="list"
              aria-label="Category scores"
            >
              {report.categories.map((cat) => (
                <div
                  key={cat.id}
                  className="border rounded-lg p-3.5 text-center"
                  style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
                  role="listitem"
                >
                  <div
                    className="text-xl font-semibold tabular-nums mb-0.5"
                    style={{ color: cat.score >= 80 ? "var(--score-excellent)" : cat.score >= 60 ? "var(--score-good)" : cat.score >= 40 ? "var(--score-warning)" : "var(--score-fail)" }}
                  >
                    {cat.score}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {cat.name}
                  </div>
                </div>
              ))}
            </div>

            {/* Just-unlocked banner */}
            {report.justUnlocked && (
              <div
                className="border rounded-lg p-4 mb-6 fade-in"
                style={{ backgroundColor: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.3)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  <strong style={{ color: "#10b981" }}>Full AI audit unlocked</strong> ? 1 credit used.
                  {report.creditsRemaining !== undefined && (
                    <> You have {report.creditsRemaining} credit{report.creditsRemaining === 1 ? "" : "s"} remaining.</>
                  )}
                  {" "}Deep-dive analysis and visual concepts are now available for this app.
                </p>
              </div>
            )}

            {/* No credits ? upsell nudge */}
            {!report.aiEnabled && (
              <div
                className="border rounded-lg p-4 mb-6 fade-in"
                style={{ backgroundColor: "rgba(180,83,9,0.05)", borderColor: "rgba(180,83,9,0.2)" }}
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    <strong style={{ color: "var(--accent)" }}>Free audit</strong> ? Scores + action plan included.
                    Buy a Full Audit (?29) to unlock AI-powered deep analysis, rewrite suggestions, visual concepts, and PDF export.
                  </p>
                  <button
                    onClick={() => router.push("/pricing")}
                    className="text-xs px-4 py-2 rounded-lg font-medium shrink-0 transition-opacity hover:opacity-80"
                    style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                  >
                    Get full audit
                  </button>
                </div>
              </div>
            )}

            {/* AI Status Banner */}
            {report.aiPowered && !report.aiScreenshots && (
              <div
                className="border rounded-lg p-4 mb-6 fade-in fade-in-delay-2"
                style={{ backgroundColor: "rgba(234, 179, 8, 0.08)", borderColor: "rgba(234, 179, 8, 0.3)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  <strong style={{ color: "rgb(234, 179, 8)" }}>AI Vision Unavailable</strong> ? Screenshot and icon analysis fell back to rule-based mode. This usually means images couldn&apos;t be downloaded or the visual AI call timed out. Use the &quot;Enhance with AI&quot; button on screenshot items to retry per-item analysis.
                </p>
              </div>
            )}
            {!report.aiPowered && (
              <div
                className="border rounded-lg p-4 mb-6 fade-in fade-in-delay-2"
                style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", borderColor: "rgba(239, 68, 68, 0.3)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  <strong style={{ color: "rgb(239, 68, 68)" }}>AI Analysis Unavailable</strong> ? The audit used rule-based analysis only. AI-powered recommendations were not generated. Use the &quot;Enhance with AI&quot; buttons to get AI analysis per item.
                </p>
              </div>
            )}

            {/* Action Plan */}
            {report.actionPlan && report.actionPlan.length > 0 && (
              <div className="mb-8 fade-in fade-in-delay-2">
                <h3 className="text-lg mb-3" style={{ color: "var(--text-primary)" }}>
                  Action Plan
                </h3>
                <ActionPlan
                  actions={report.actionPlan}
                  onDeepDive={report.aiEnabled ? handleDeepDive : undefined}
                  deepDiveLoading={deepDiveLoading}
                  onVisualize={report.aiEnabled ? handleVisualize : undefined}
                  aiEnabled={report.aiEnabled ?? false}
                />
              </div>
            )}

            {/* Detailed Results */}
            <div className="space-y-3 fade-in fade-in-delay-2">
              <h3 className="text-lg mb-3" style={{ color: "var(--text-primary)" }}>
                Detailed Analysis
              </h3>
              {report.categories.map((cat) => (
                <CategoryCard key={cat.id} category={cat} />
              ))}
            </div>

            {/* Footer */}
            <div className="mt-10 pt-6 border-t text-center fade-in fade-in-delay-3" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                A <strong style={{ color: "var(--text-secondary)" }}>GetGrowth</strong> tool.
                Based on the ASO Stack framework &amp; store best practices.
                Keyword volumes are estimates. Store algorithms are proprietary and change without notice.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense>
      <AuditContent />
    </Suspense>
  );
}
