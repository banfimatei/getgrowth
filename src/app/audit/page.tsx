"use client";

export const dynamic = "force-dynamic";

import { useState, useCallback, useEffect, useRef, Suspense, type FormEvent } from "react";
import { useUser, useSignIn, useClerk } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import ScoreRing from "@/components/ScoreRing";
import CategoryCard from "@/components/CategoryCard";
import ActionPlan from "@/components/ActionPlan";
import type { AuditCategory } from "@/lib/aso-rules";
import type { ActionItem } from "@/lib/action-plan";
import { generateExperimentSuggestions, type SuggestedExperiment } from "@/lib/experiment-generator";

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

interface KWIntelItem {
  keyword: string;
  popularity: number;
  difficulty: number;
  difficultyLabel: string;
  targetingAdvice: { label: string; icon: string; description: string };
  dailySearches: number;
  opportunity: number;
  appRank: number | null;
  // Full detail (paid only — absent for free users)
  competitors?: Array<{ trackId: number; name: string; icon: string; rating: number; reviews: number; genre: string; price: string; storeUrl: string }>;
  rankingTiers?: {
    top5: { tierScore: number; label: string; minReviews: number; weakestApp: string; weakCount: number; freshCount: number; highlights: string[] };
    top10: { tierScore: number; label: string; minReviews: number; weakestApp: string; weakCount: number; freshCount: number; highlights: string[] };
    top20: { tierScore: number; label: string; minReviews: number; weakestApp: string; weakCount: number; freshCount: number; highlights: string[] };
  };
  downloadEstimate?: {
    dailySearches: number;
    tiers: { top5: { low: number; high: number }; top6_10: { low: number; high: number }; top11_20: { low: number; high: number } };
  };
  opportunitySignals?: Array<{ signal: string; icon: string; strength: string; detail: string }>;
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
    storeId?: string;
  };
  overallScore: number;
  categories: AuditCategory[];
  actionPlan: ActionItem[];
  keywordIntelligence?: KWIntelItem[];
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
  const { signIn } = useSignIn();
  const { setActive } = useClerk();
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

  // Post-payment auto-audit state
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [autoDeepDiveProgress, setAutoDeepDiveProgress] = useState<{ total: number; done: number; current: string } | null>(null);
  const [autoDeepDiveResults, setAutoDeepDiveResults] = useState<Record<string, DeepDiveEnhancement>>({});
  const [suggestedExperiments, setSuggestedExperiments] = useState<SuggestedExperiment[]>([]);
  const [postPaymentEmail, setPostPaymentEmail] = useState<string | null>(null);
  const activationAttempted = useRef(false);

  // Keyword tracking state (for signed-in paid users)
  const [trackedKws, setTrackedKws] = useState<Set<string>>(new Set());
  const [trackingKw, setTrackingKw] = useState<string | null>(null);

  // Lead capture state
  const [leadCaptureVisible, setLeadCaptureVisible] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSaved, setLeadSaved] = useState(false);
  const [leadToken, setLeadToken] = useState<string | null>(null);
  const [leadError, setLeadError] = useState<string | null>(null);
  const actionPlanSentinelRef = useRef<HTMLDivElement | null>(null);

  const handleTrackAuditKeyword = async (keyword: string) => {
    if (!report?.app?.storeId || !isSignedIn) return;
    setTrackingKw(keyword);
    try {
      // Find saved_app_id for this store ID — auto-save the app if not yet saved
      const appsRes = await fetch("/api/apps");
      const appsData = appsRes.ok ? await appsRes.json() : null;
      let savedApp = appsData?.apps?.find(
        (a: { store_id: string; platform: string; id: string }) =>
          a.store_id === report.app.storeId && a.platform === report.app.platform
      );

      if (!savedApp) {
        // Auto-save the app so we have a saved_app_id
        const saveRes = await fetch("/api/apps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId: report.app.storeId,
            platform: report.app.platform,
            name: report.app.title,
            iconUrl: report.app.icon ?? null,
          }),
        });
        if (saveRes.ok) {
          const saveData = await saveRes.json();
          savedApp = saveData.app;
        }
      }

      if (!savedApp?.id) return; // can't track without saved_app_id

      const res = await fetch("/api/keywords/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saved_app_id: savedApp.id,
          keyword,
          country: "us",
          store_id: report.app.storeId,
          platform: report.app.platform,
          track_id: report.app.platform === "ios" ? parseInt(report.app.storeId ?? "", 10) || null : null,
        }),
      });
      if (res.ok) {
        setTrackedKws((prev) => new Set([...prev, keyword]));
      }
    } catch {
      // silently fail
    } finally {
      setTrackingKw(null);
    }
  };

  // Scroll sentinel: show lead capture prompt when user passes the action plan
  useEffect(() => {
    const sentinel = actionPlanSentinelRef.current;
    if (!sentinel || isSignedIn || leadSaved) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setLeadCaptureVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isSignedIn, leadSaved, report]); // re-run when report loads

  const handleLeadCapture = async (e: FormEvent) => {
    e.preventDefault();
    if (!leadEmail || !report) return;
    setLeadSubmitting(true);
    try {
      const res = await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: leadEmail,
          store_id: report.app.storeId,
          platform: report.app.platform,
          app_name: report.app.title,
          app_icon_url: report.app.icon ?? null,
          score: report.overallScore,
          category_scores: Object.fromEntries(
            report.categories.map((c: { id: string; score: number }) => [c.id, c.score])
          ),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLeadSaved(true);
        setLeadToken(data.token);
        setLeadError(null);
      } else {
        setLeadError(data.error || "Could not save your audit. Please try again.");
      }
    } catch {
      setLeadError("Network error. Please try again.");
    } finally {
      setLeadSubmitting(false);
    }
  };

  // Post-payment flow: detect session_id, activate account, auto-run full audit
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const id = searchParams.get("id");
    const p = searchParams.get("platform") as "ios" | "android" | null;
    const c = searchParams.get("country") || "us";

    if (sessionId && id && p && !activationAttempted.current) {
      activationAttempted.current = true;
      window.history.replaceState({}, "", "/audit");
      handlePostPaymentFlow(sessionId, id, p, c);
      return;
    }

    if (id && p) {
      handleAudit({ id, name: id, developer: "", icon: "", rating: 0, platform: p, url: "" });
      window.history.replaceState({}, "", "/audit");
    }
  }, [searchParams]);

  const runAutoDeepDives = useCallback(async (
    auditData: AuditReport & { appData?: CachedAppData },
    appPlatform: string,
    extraSections?: string[],
  ) => {
    const coreSections = ["title", "keywords", "description", "screenshots", "icon"];
    const actionSections = (auditData.actionPlan || [])
      .filter((a: ActionItem) => a.deepDiveSection && a.priority !== "low")
      .map((a: ActionItem) => a.deepDiveSection as string);
    const allSections = [...new Set([...coreSections, ...actionSections, ...(extraSections || [])])];

    setAutoDeepDiveProgress({ total: allSections.length, done: 0, current: allSections[0] });

    const rawResults: Record<string, Record<string, unknown>> = {};
    let doneCount = 0;

    await Promise.allSettled(
      allSections.map(async (section) => {
        try {
          const resp = await fetch("/api/audit/deep-dive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              appData: auditData.appData,
              section,
              storeId: auditData.app?.url || auditData.appData?.url,
            }),
          });
          if (resp.ok) {
            const data = await resp.json();
            rawResults[section] = data.analysis;
            const formatted = formatDeepDiveResult(section, data.analysis, appPlatform);
            if (formatted) {
              setAutoDeepDiveResults((prev) => ({ ...prev, [section]: formatted }));
            }
          }
        } catch {
          // Individual deep dive failure is non-blocking
        } finally {
          doneCount++;
          setAutoDeepDiveProgress((prev) => prev ? { ...prev, done: doneCount } : null);
        }
      })
    );

    setAutoDeepDiveProgress(null);

    if (auditData.actionPlan?.length) {
      const experiments = generateExperimentSuggestions(auditData.actionPlan, rawResults);
      setSuggestedExperiments(experiments);
    }
  }, []);

  const handlePostPaymentFlow = useCallback(async (
    sessionId: string,
    appId: string,
    appPlatform: "ios" | "android",
    appCountry: string,
  ) => {
    setView("auditing");
    setUnlockLoading(true);
    setError("");
    setAutoDeepDiveResults({});
    setSuggestedExperiments([]);

    try {
      let extraSections: string[] = [];

      // If sessionId is provided, this is a Stripe redirect — activate the payment
      if (sessionId) {
        const activateResp = await fetch("/api/audit/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (!activateResp.ok) {
          const err = await activateResp.json().catch(() => null);
          throw new Error(err?.error || "Payment verification failed");
        }

        const activation = await activateResp.json();
        extraSections = activation.deepDiveSections || [];
        setPostPaymentEmail(activation.userId ? "your email" : null);

        // Auto-sign in with Clerk ticket
        if (activation.signInToken && signIn && setActive) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await (signIn as any).create({
              strategy: "ticket",
              ticket: activation.signInToken,
            });
            if (result?.createdSessionId) {
              await setActive({ session: result.createdSessionId });
            }
          } catch (signInErr) {
            console.warn("[post-payment] Auto sign-in failed:", signInErr);
          }
        }
      }

      // Re-run audit (now AI-enabled)
      const auditParams = new URLSearchParams({ id: appId, platform: appPlatform, country: appCountry });
      const auditResp = await fetch(`/api/audit?${auditParams}`);
      if (!auditResp.ok) throw new Error("Audit failed");

      const auditData = await auditResp.json();
      setReport(auditData);
      setView("report");
      setUnlockLoading(false);

      // Auto-fire deep dives
      await runAutoDeepDives(auditData, appPlatform, extraSections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setView("search");
      setUnlockLoading(false);
    }
  }, [signIn, setActive, runAutoDeepDives]);

  const handleGuestCheckout = useCallback(async () => {
    if (!report) return;
    const storeId = report.app.storeId || "";
    if (!storeId) {
      setError("Cannot start checkout — app ID missing. Please run the audit again.");
      return;
    }
    setUnlockLoading(true);
    try {
      const appPlatform = report.app.platform;
      const resp = await fetch("/api/stripe/guest-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: storeId,
          platform: appPlatform,
          country,
        }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => null);
        throw new Error(errData?.error || "Could not start checkout");
      }
      const { url } = await resp.json();
      if (url) window.location.href = url;
      else throw new Error("No checkout URL returned");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed. Please try again.");
      setUnlockLoading(false);
    }
  }, [report, country]);

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
      {view === "search" ? (
        <div>
          {/* ═══ HERO ═══════════════════════════════════════════ */}
          <section className="pt-16 pb-12 lg:pt-24 lg:pb-16" style={{ backgroundColor: "var(--bg-section)" }}>
            <div className="max-w-2xl mx-auto px-6 text-center">
              <span
                className="hero-animate inline-block text-xs font-semibold px-3 py-1 rounded-full mb-5"
                style={{ backgroundColor: "rgba(30,27,75,0.08)", color: "var(--accent)" }}
              >
                Free ASO audit &mdash; no signup required
              </span>

              <h1 className="hero-animate hero-animate-delay-1 mb-4">
                Audit your app store listing
              </h1>

              <p
                className="hero-animate hero-animate-delay-2 text-base mb-8"
                style={{ color: "var(--text-secondary)", maxWidth: 500, margin: "0 auto" }}
              >
                See your ASO score, keyword intelligence, and an action plan to improve installs. Results in under 60 seconds.
              </p>

              {/* Search form */}
              <form onSubmit={handleSearch} className="hero-animate hero-animate-delay-3 text-left">
                <div
                  className="rounded-xl p-5 border"
                  style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
                >
                  <div className="relative mb-4">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="10" cy="10" r="7" stroke="var(--text-tertiary)" strokeWidth="2" />
                      <path d="M15 15L21 21" stroke="var(--text-tertiary)" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    <input
                      id="search-input"
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="App name, store URL, or keyword\u2026"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full pl-11 pr-4 py-3 text-sm border rounded-lg transition-colors"
                      style={{
                        backgroundColor: "var(--bg-page)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-body)",
                      }}
                    />
                  </div>

                  <div className="flex items-end gap-3 flex-wrap">
                    <div className="flex gap-1.5 flex-1 min-w-0" role="radiogroup" aria-label="Platform">
                      {(["both", "ios", "android"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPlatform(p)}
                          className="flex-1 text-xs py-2 px-3 border rounded-md transition-colors font-medium"
                          style={{
                            backgroundColor: platform === p ? "var(--accent-bg)" : "var(--bg-page)",
                            borderColor: platform === p ? "var(--accent)" : "var(--border)",
                            color: platform === p ? "var(--accent)" : "var(--text-secondary)",
                          }}
                          aria-pressed={platform === p}
                        >
                          {p === "both" ? "Both" : p === "ios" ? "iOS" : "Android"}
                        </button>
                      ))}
                    </div>

                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="px-3 py-2 text-xs border rounded-md"
                      style={{ backgroundColor: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                      aria-label="Region"
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

                    <button
                      type="submit"
                      disabled={searching || !query.trim()}
                      className="px-6 py-2.5 text-sm font-semibold rounded-lg transition-all disabled:opacity-50 hover:brightness-110"
                      style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                    >
                      {searching ? "Searching\u2026" : "Run Audit"}
                    </button>
                  </div>
                </div>
              </form>

              {error && (
                <p className="mt-4 text-sm text-center" style={{ color: "var(--fail-text)" }} role="alert">
                  {error}
                </p>
              )}

              <p className="hero-animate hero-animate-delay-4 mt-5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                Free, instant results. No account needed.
              </p>
            </div>
          </section>

          {/* ═══ SCORE PREVIEW MOCK ═════════════════════════════ */}
          <section className="py-14 lg:py-20" style={{ backgroundColor: "var(--bg-page)" }}>
            <div className="max-w-3xl mx-auto px-6">
              <div className="text-center mb-8">
                <h2 className="mb-2 font-display">See exactly where you stand</h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Every audit produces a scored breakdown across 6 ASO categories.
                </p>
              </div>

              <div
                className="rounded-2xl border p-6 lg:p-8"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}
              >
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                  <div className="shrink-0">
                    <div className="relative" style={{ width: 100, height: 100 }}>
                      <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" opacity="0.4" />
                        <circle
                          cx="50" cy="50" r="42" fill="none" stroke="var(--score-good)" strokeWidth="8"
                          strokeLinecap="round" strokeDasharray="264" strokeDashoffset="74"
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-semibold tabular-nums" style={{ color: "var(--score-good)" }}>72</span>
                        <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>B</span>
                      </div>
                    </div>
                    <p className="text-xs text-center mt-1.5 font-medium" style={{ color: "var(--text-secondary)" }}>ASO Score</p>
                  </div>

                  <div className="flex-1 w-full">
                    <div className="flex gap-4 flex-wrap mb-4">
                      {[
                        { label: "3 Critical", color: "var(--error)" },
                        { label: "4 Warnings", color: "var(--warning)" },
                        { label: "8 Passed", color: "var(--success)" },
                      ].map((s) => (
                        <div key={s.label} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{s.label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[
                        { name: "Title", score: 85 },
                        { name: "Keywords", score: 45 },
                        { name: "Screenshots", score: 70 },
                        { name: "Description", score: 82 },
                        { name: "Ratings", score: 90 },
                        { name: "Icon", score: 60 },
                      ].map((cat) => (
                        <div key={cat.name} className="text-center py-2 px-1 rounded-md" style={{ backgroundColor: "var(--bg-inset)" }}>
                          <div
                            className="text-sm font-semibold tabular-nums"
                            style={{ color: cat.score >= 80 ? "var(--score-excellent)" : cat.score >= 60 ? "var(--score-good)" : cat.score >= 40 ? "var(--score-warning)" : "var(--score-fail)" }}
                          >
                            {cat.score}
                          </div>
                          <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{cat.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2" style={{ borderColor: "var(--border)" }}>
                  {[
                    { status: "fail", text: "Title missing high-volume keywords", section: "Title" },
                    { status: "fail", text: "Only 3 of 10 screenshot slots used", section: "Screenshots" },
                    { status: "warn", text: "No app preview video detected", section: "Video" },
                    { status: "pass", text: "Icon readable at 60px, good category contrast", section: "Icon" },
                  ].map((finding, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: finding.status === "fail" ? "var(--error)" : finding.status === "warn" ? "var(--warning)" : "var(--success)" }}
                      />
                      <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{finding.text}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--bg-inset)", color: "var(--text-tertiary)" }}>{finding.section}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] mt-3 text-center" style={{ color: "var(--text-tertiary)" }}>
                  Sample output &mdash; your results will vary.
                </p>
              </div>
            </div>
          </section>

          {/* ═══ HOW IT WORKS ═══════════════════════════════════ */}
          <section className="py-14 lg:py-20" style={{ backgroundColor: "var(--bg-section)" }}>
            <div className="max-w-4xl mx-auto px-6">
              <div className="text-center mb-10">
                <h2 className="mb-2 font-display">How it works</h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Three steps. Under 60 seconds. No setup required.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    step: "01",
                    title: "Search or paste a URL",
                    body: "Enter any app name or store URL. We fetch metadata, screenshots, ratings, and keyword data automatically.",
                    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" /><path d="M15 15L21 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>,
                  },
                  {
                    step: "02",
                    title: "See your ASO score",
                    body: "Get a scored breakdown across 6 categories, keyword intelligence with targeting advice, and a prioritized action plan.",
                    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" /><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" /><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" /><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" /></svg>,
                  },
                  {
                    step: "03",
                    title: "Ship improvements",
                    body: "Follow AI-generated copy rewrites, experiment suggestions, and visual briefs. Connect your store to track which changes move installs.",
                    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
                  },
                ].map((s) => (
                  <div
                    key={s.step}
                    className="rounded-xl p-6 border"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "var(--accent-bg)", color: "var(--accent)" }}
                      >
                        {s.icon}
                      </span>
                      <span className="text-xs font-mono font-semibold" style={{ color: "var(--accent-muted)" }}>
                        Step {s.step}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>{s.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{s.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ WHAT WE AUDIT ══════════════════════════════════ */}
          <section className="py-14 lg:py-20" style={{ backgroundColor: "var(--bg-page)" }}>
            <div className="max-w-4xl mx-auto px-6">
              <div className="text-center mb-10">
                <h2 className="mb-2 font-display">What we audit</h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Every metadata field, visual asset, and conversion signal &mdash; scored and explained.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { name: "Title & Subtitle", desc: "Keyword coverage, character usage, and overlap analysis.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7V4h16v3M9 20h6M12 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> },
                  { name: "Keywords", desc: "Popularity, difficulty, and targeting advice from real search data.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg> },
                  { name: "Screenshots", desc: "Gallery count, ordering, captions, and visual coherence.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" /><path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> },
                  { name: "Description", desc: "Structure, keyword density, and conversion copy quality.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 10h16M4 14h10M4 18h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg> },
                  { name: "Ratings & Reviews", desc: "Volume, velocity, and sentiment vs. category benchmarks.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg> },
                  { name: "Icon & Video", desc: "Readability at small sizes, category contrast, and preview presence.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="2" /><path d="M10 8l6 4-6 4V8z" fill="currentColor" /></svg> },
                ].map((f) => (
                  <div
                    key={f.name}
                    className="rounded-xl p-5 border"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                      style={{ backgroundColor: "var(--accent-bg)", color: "var(--accent)" }}
                    >
                      {f.icon}
                    </div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{f.name}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ UPGRADE CTA ════════════════════════════════════ */}
          <section className="py-14 lg:py-20" style={{ backgroundColor: "var(--bg-section)" }}>
            <div className="max-w-2xl mx-auto px-6 text-center">
              <h2 className="mb-3 font-display">Go deeper with the full AI audit</h2>
              <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
                Unlock AI-written rewrites, keyword strategy across 30 countries, experiment suggestions, and PDF export.
              </p>

              <div
                className="rounded-xl border p-6 inline-block text-left"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}
              >
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-semibold" style={{ color: "var(--accent)" }}>&euro;29</span>
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>one-time per app</span>
                </div>
                <ul className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {[
                    "Deep AI analysis with copy rewrites",
                    "Keyword targeting strategy per keyword",
                    "Country Opportunity Finder (30 markets)",
                    "Download estimates and ranking tiers",
                    "Auto-generated A/B experiments",
                    "PDF export for your team",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
                        <path d="M3 8l3.5 3.5L13 5" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-6 text-xs" style={{ color: "var(--text-tertiary)" }}>
                Start with the free audit. Upgrade only if you want AI depth.
              </p>
            </div>
          </section>

          {/* ═══ BOTTOM CTA ═════════════════════════════════════ */}
          <section className="py-14 lg:py-20" style={{ backgroundColor: "var(--bg-page)" }}>
            <div className="max-w-xl mx-auto px-6 text-center">
              <h2 className="mb-3 font-display">Ready to see your ASO score?</h2>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                Free, instant, no signup. Paste a URL or search by name.
              </p>
              <button
                onClick={() => {
                  const el = document.getElementById("search-input");
                  if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus(); }
                }}
                className="px-8 py-3 text-sm font-semibold rounded-lg transition-all hover:brightness-110 pulse-cta"
                style={{ backgroundColor: "var(--accent)", color: "#fff" }}
              >
                Run free audit
              </button>
            </div>
          </section>
        </div>
      ) : (
        <>
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
          <main className="max-w-3xl mx-auto px-6 py-10">
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
              {unlockLoading ? "Payment verified \u2014 running full AI audit" : "Running ASO Audit"}
            </h2>
            <p className="text-sm loading-ellipsis" style={{ color: "var(--text-secondary)" }}>
              {unlockLoading ? "Setting up your account and analyzing with AI" : "Fetching store data and analyzing metadata"}
            </p>
          </div>
        )}

        {/* REPORT VIEW */}
        {view === "report" && report && (
          <div>
            {/* Inline error banner — checkout / unlock failures */}
            {error && (
              <div
                className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-3"
                style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--fail-text)" }}
                role="alert"
              >
                <span>{error}</span>
                <button onClick={() => setError("")} className="opacity-60 hover:opacity-100 flex-shrink-0 text-base leading-none">×</button>
              </div>
            )}

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

            {/* Keyword Intelligence (iOS only) */}
            {report.keywordIntelligence && report.keywordIntelligence.length > 0 && report.app.platform === "ios" && (
              <div className="mb-8 fade-in fade-in-delay-1">
                <h3 className="text-lg mb-3 font-display" style={{ color: "var(--text-primary)" }}>
                  Keyword Intelligence
                </h3>

                <div className="space-y-3">
                  {report.keywordIntelligence.map((kw) => {
                    const isPaid = report.aiEnabled;
                    const hasFull = !!kw.competitors;
                    return (
                      <div
                        key={kw.keyword}
                        className="border rounded-lg p-4"
                        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base">{kw.targetingAdvice.icon}</span>
                            <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                              &ldquo;{kw.keyword}&rdquo;
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: kw.targetingAdvice.label === "Sweet Spot" || kw.targetingAdvice.label === "Hidden Gem"
                                  ? "rgba(16,185,129,0.12)" : kw.targetingAdvice.label === "Avoid"
                                  ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                                color: kw.targetingAdvice.label === "Sweet Spot" || kw.targetingAdvice.label === "Hidden Gem"
                                  ? "#10b981" : kw.targetingAdvice.label === "Avoid"
                                  ? "#ef4444" : "#f59e0b",
                              }}
                            >
                              {kw.targetingAdvice.label}
                            </span>
                          </div>
                          {kw.appRank && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(30,27,75,0.08)", color: "var(--accent)" }}>
                              Rank #{kw.appRank}
                            </span>
                          )}
                        </div>

                        {/* Bars: Popularity + Difficulty */}
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
                              <span>Popularity</span>
                              <span>{kw.popularity}/100</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "var(--bg-inset)" }}>
                              <div className="h-full rounded-full" style={{ width: `${kw.popularity}%`, backgroundColor: "#10b981" }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
                              <span>Difficulty</span>
                              <span>{kw.difficulty}/100 ({kw.difficultyLabel})</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "var(--bg-inset)" }}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${kw.difficulty}%`,
                                  backgroundColor: kw.difficulty <= 35 ? "#10b981" : kw.difficulty <= 55 ? "#f59e0b" : "#ef4444",
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
                          <div className="flex gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                            <span>~{Math.round(kw.dailySearches)} daily searches</span>
                            <span>Opportunity: {kw.opportunity}/100</span>
                            {!kw.appRank && <span style={{ color: "#f59e0b" }}>Not ranked yet</span>}
                          </div>
                          {/* Track keyword button — signed-in paid users only */}
                          {isSignedIn && report?.aiEnabled && report?.app?.platform === "ios" && (
                            <button
                              onClick={() => handleTrackAuditKeyword(kw.keyword)}
                              disabled={trackedKws.has(kw.keyword) || trackingKw === kw.keyword}
                              className="text-xs px-2.5 py-1 rounded-lg border transition-all"
                              style={{
                                borderColor: trackedKws.has(kw.keyword) ? "#10b981" : "var(--border)",
                                color: trackedKws.has(kw.keyword) ? "#10b981" : "var(--text-muted)",
                                backgroundColor: "transparent",
                                opacity: trackingKw === kw.keyword ? 0.5 : 1,
                              }}
                            >
                              {trackedKws.has(kw.keyword) ? "✓ Tracking" : trackingKw === kw.keyword ? "Adding…" : "+ Track rank"}
                            </button>
                          )}
                        </div>

                        {/* Paid-only: Download estimates + Tiers + Competitors */}
                        {isPaid && hasFull && kw.downloadEstimate && (
                          <details className="mt-3">
                            <summary className="text-xs font-medium cursor-pointer" style={{ color: "var(--accent)" }}>
                              View details: downloads, ranking tiers, competitors
                            </summary>
                            <div className="mt-2 space-y-2">
                              {/* Download estimates */}
                              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                <strong>Est. daily downloads:</strong>{" "}
                                Top 5: {Math.round(kw.downloadEstimate.tiers.top5.low)}-{Math.round(kw.downloadEstimate.tiers.top5.high)} |{" "}
                                Top 6-10: {Math.round(kw.downloadEstimate.tiers.top6_10.low)}-{Math.round(kw.downloadEstimate.tiers.top6_10.high)} |{" "}
                                Top 11-20: {Math.round(kw.downloadEstimate.tiers.top11_20.low)}-{Math.round(kw.downloadEstimate.tiers.top11_20.high)}
                              </div>

                              {/* Ranking tiers */}
                              {kw.rankingTiers && (
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  {(["top5", "top10", "top20"] as const).map((tier) => {
                                    const t = kw.rankingTiers![tier];
                                    return (
                                      <div
                                        key={tier}
                                        className="border rounded p-2"
                                        style={{ backgroundColor: "var(--bg-inset)", borderColor: "var(--border)" }}
                                      >
                                        <div className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                                          {tier === "top5" ? "Top 5" : tier === "top10" ? "Top 10" : "Top 20"}
                                        </div>
                                        <div style={{ color: t.label === "Easy" || t.label === "Very Easy" ? "#10b981" : t.label === "Moderate" ? "#f59e0b" : "#ef4444" }}>
                                          {t.label} ({t.tierScore})
                                        </div>
                                        {t.highlights.slice(0, 2).map((h, hi) => (
                                          <div key={hi} className="mt-0.5" style={{ color: "var(--text-secondary)" }}>{h}</div>
                                        ))}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Top competitors */}
                              {kw.competitors && kw.competitors.length > 0 && (
                                <div>
                                  <div className="text-xs font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                                    Top competitors ({kw.competitors.length})
                                  </div>
                                  <div className="space-y-1">
                                    {kw.competitors.slice(0, 5).map((comp, ci) => (
                                      <div key={ci} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                                        {comp.icon && (
                                          <img src={comp.icon} alt="" className="w-5 h-5 rounded" />
                                        )}
                                        <span className="font-medium" style={{ color: "var(--text-primary)" }}>{comp.name}</span>
                                        <span>{comp.rating > 0 ? `${comp.rating.toFixed(1)}\u2605` : ""}</span>
                                        <span>{comp.reviews.toLocaleString()} reviews</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Opportunity signals */}
                              {kw.opportunitySignals && kw.opportunitySignals.length > 0 && (
                                <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                  {kw.opportunitySignals.map((sig, si) => (
                                    <div key={si} className="mt-0.5">
                                      {sig.icon} <strong>{sig.signal}</strong> ({sig.strength}): {sig.detail}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </details>
                        )}

                        {/* Free locked placeholders */}
                        {!isPaid && (
                          <div
                            className="mt-3 border rounded p-3 text-center text-xs"
                            style={{ backgroundColor: "rgba(30,27,75,0.03)", borderColor: "rgba(30,27,75,0.1)", color: "var(--text-secondary)" }}
                          >
                            <span style={{ opacity: 0.6 }}>🔒</span>{" "}
                            Competitor analysis, ranking tiers, download estimates, and country opportunities — <strong>unlock with full audit</strong>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Upsell banner for free users */}
                {!report.aiEnabled && (
                  <div
                    className="border rounded-lg p-4 mt-4"
                    style={{ backgroundColor: "rgba(30,27,75,0.04)", borderColor: "rgba(30,27,75,0.15)" }}
                  >
                    <p className="text-sm font-semibold mb-1" style={{ color: "var(--accent)" }}>
                      Unlock full Keyword Intelligence
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                      <div>🎯 <strong>Keyword Targeting Strategy</strong> — AI-classified targeting advice per keyword</div>
                      <div>🌍 <strong>Country Opportunity Finder</strong> — Scan 30 markets to find easier wins</div>
                      <div>📊 <strong>Deep AI Analysis</strong> — AI-written rewrites for title, subtitle &amp; keywords</div>
                      <div>⚗️ <strong>Auto-Generated Experiments</strong> — Ready-to-run A/B tests from audit findings</div>
                    </div>
                    <button
                      onClick={isSignedIn && (report.creditsRemaining ?? 0) > 0 ? undefined : handleGuestCheckout}
                      className="mt-3 px-4 py-2 rounded-lg font-semibold text-xs transition-all hover:brightness-110 pulse-cta"
                      style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                    >
                      {isSignedIn && (report.creditsRemaining ?? 0) > 0 ? "Use 1 credit" : "Unlock full audit \u2014 \u20AC29"}
                    </button>
                  </div>
                )}

                {/* Country Opportunity buttons for paid users */}
                {report.aiEnabled && (
                  <div className="mt-3">
                    <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                      Find easier markets for your keywords:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {report.keywordIntelligence.slice(0, 5).map((kw) => (
                        <button
                          key={kw.keyword}
                          onClick={async () => {
                            const params = new URLSearchParams({
                              keyword: kw.keyword,
                              appId: report.app.storeId || "",
                              platform: report.app.platform,
                              trackId: report.app.storeId || "",
                            });
                            window.open(`/api/keywords/country-scan?${params}`, "_blank");
                          }}
                          className="text-xs px-3 py-1.5 rounded-md border transition-colors hover:brightness-95"
                          style={{ borderColor: "var(--border)", color: "var(--accent)", backgroundColor: "var(--bg-card)" }}
                        >
                          🌍 &ldquo;{kw.keyword}&rdquo;
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Android: no keyword intelligence */}
            {report.app.platform === "android" && (
              <div
                className="border rounded-lg p-4 mb-6 fade-in"
                style={{ backgroundColor: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)" }}
              >
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  <strong style={{ color: "#f59e0b" }}>Keyword Intelligence</strong> is currently available for iOS apps only (uses Apple&apos;s iTunes Search API). Android keyword data requires Google Play scraping which is less reliable.
                </p>
              </div>
            )}

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


            {/* AI Status Banners — only shown to paid users when AI partially/fully failed */}
            {report.aiEnabled && report.aiPowered && !report.aiScreenshots && (
              <div
                className="border rounded-lg p-4 mb-6 fade-in fade-in-delay-2"
                style={{ backgroundColor: "rgba(234, 179, 8, 0.08)", borderColor: "rgba(234, 179, 8, 0.3)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  <strong style={{ color: "rgb(234, 179, 8)" }}>AI Vision Unavailable</strong> — Screenshot and icon analysis fell back to rule-based mode. This usually means images couldn&apos;t be downloaded or the visual AI call timed out. Use the &quot;Enhance with AI&quot; button on screenshot items to retry per-item analysis.
                </p>
              </div>
            )}
            {report.aiEnabled && !report.aiPowered && (
              <div
                className="border rounded-lg p-4 mb-6 fade-in fade-in-delay-2"
                style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", borderColor: "rgba(239, 68, 68, 0.3)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  <strong style={{ color: "rgb(239, 68, 68)" }}>AI Analysis Unavailable</strong> — The audit used rule-based analysis only. AI-powered recommendations were not generated. Use the &quot;Enhance with AI&quot; buttons to get AI analysis per item.
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
                  appName={report.app.title}
                  platform={report.app.platform}
                />
              </div>
            )}

            {/* Scroll sentinel + Lead capture prompt */}
            <div ref={actionPlanSentinelRef} />
            {!isSignedIn && report && leadCaptureVisible && (
              <div
                className="mb-8 rounded-2xl border-2 p-6 fade-in"
                style={{ borderColor: "var(--accent)", backgroundColor: "rgba(30,27,75,0.03)" }}
              >
                {leadSaved ? (
                  <div className="text-center">
                    <p className="text-2xl mb-1">✓</p>
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Audit saved!</p>
                    <p className="text-sm mt-1 mb-4" style={{ color: "var(--text-secondary)" }}>
                      We&apos;ll email you when your score changes. Check your inbox for a link to your saved audit.
                    </p>
                    {leadToken && (
                      <a
                        href={`/audit/saved/${leadToken}`}
                        className="text-sm font-semibold"
                        style={{ color: "var(--accent)" }}
                      >
                        View saved audit →
                      </a>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--accent)" }}>
                      Save your audit
                    </p>
                    <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                      Get notified when things change
                    </h3>
                    <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                      We&apos;ll re-check your listing weekly and email you if your score moves — so you can act before competitors do.
                    </p>
                    <form onSubmit={handleLeadCapture} className="flex gap-2 flex-col sm:flex-row">
                      <input
                        type="email"
                        required
                        value={leadEmail}
                        onChange={(e) => setLeadEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="flex-1 px-4 py-2.5 rounded-xl border text-sm"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: "var(--bg-page)",
                          color: "var(--text-primary)",
                        }}
                      />
                      <button
                        type="submit"
                        disabled={leadSubmitting}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 flex-shrink-0"
                        style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                      >
                        {leadSubmitting ? "Saving…" : "Save & get notified"}
                      </button>
                    </form>
                    {leadError && (
                      <p className="text-xs mt-2" style={{ color: "#ef4444" }}>{leadError}</p>
                    )}
                    {!leadError && (
                      <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                        No spam. Just a heads-up when your score changes.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Auto deep-dive progress */}
            {autoDeepDiveProgress && (
              <div
                className="border rounded-lg p-4 mb-6 fade-in"
                style={{ backgroundColor: "rgba(30,27,75,0.04)", borderColor: "rgba(30,27,75,0.15)" }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin" style={{ animationDuration: "2s" }}>
                    <circle cx="12" cy="12" r="10" stroke="var(--border)" strokeWidth="2" />
                    <path d="M12 2a10 10 0 019.95 9" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>
                    Running deep AI analysis ({autoDeepDiveProgress.done}/{autoDeepDiveProgress.total})
                  </p>
                </div>
                <div className="w-full rounded-full h-1.5" style={{ backgroundColor: "var(--border)" }}>
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      backgroundColor: "var(--accent)",
                      width: `${(autoDeepDiveProgress.done / autoDeepDiveProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Post-payment email banner */}
            {postPaymentEmail && !autoDeepDiveProgress && Object.keys(autoDeepDiveResults).length > 0 && (
              <div
                className="border rounded-lg p-4 mb-6 fade-in"
                style={{ backgroundColor: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.3)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  <strong style={{ color: "#10b981" }}>Full AI audit complete.</strong>{" "}
                  Check your email to set a password and access your audit anytime from the dashboard.
                </p>
              </div>
            )}

            {/* Recommended Experiments */}
            {suggestedExperiments.length > 0 && (
              <div className="mb-8 fade-in">
                <h3 className="text-lg mb-1" style={{ color: "var(--text-primary)" }}>
                  Recommended Experiments
                </h3>
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                  Top experiments generated from your audit findings. Connect your store to track impact.
                </p>
                <div className="space-y-3">
                  {suggestedExperiments.map((exp, i) => (
                    <div
                      key={i}
                      className="border rounded-lg p-4"
                      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono font-medium px-1.5 py-0.5 rounded" style={{
                              backgroundColor: exp.priority === "high" ? "var(--error-bg)" : "var(--warning-bg)",
                              color: exp.priority === "high" ? "var(--error-text)" : "var(--warning-text)",
                            }}>
                              {exp.priority}
                            </span>
                            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                              {exp.title}
                            </span>
                          </div>
                          <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                            {exp.hypothesis}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
                            {exp.suggestedDuration}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium px-2 py-0.5 rounded" style={{
                          backgroundColor: "var(--accent-bg)",
                          color: "var(--accent)",
                        }}>
                          Target: {exp.targetMetric}
                        </span>
                        {exp.changes.slice(0, 2).map((change, j) => (
                          <span key={j} className="text-xs px-2 py-0.5 rounded" style={{
                            backgroundColor: "var(--bg-inset)",
                            color: "var(--text-secondary)",
                          }}>
                            {change.length > 60 ? change.substring(0, 57) + "\u2026" : change}
                          </span>
                        ))}
                      </div>
                      {isSignedIn && (
                        <button
                          onClick={() => {
                            const params = new URLSearchParams({
                              title: exp.title,
                              hypothesis: exp.hypothesis,
                              target_metric: exp.targetMetric,
                            });
                            router.push(`/dashboard?newExperiment=1&${params}`);
                          }}
                          className="mt-3 text-xs font-medium px-3 py-1.5 rounded-md transition-opacity hover:opacity-80"
                          style={{ backgroundColor: "var(--success)", color: "#fff" }}
                        >
                          Save to experiment board
                        </button>
                      )}
                    </div>
                  ))}
                </div>
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
        </>
      )}
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
