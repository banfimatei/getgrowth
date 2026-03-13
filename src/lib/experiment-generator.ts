import type { ActionItem } from "./action-plan";

export interface SuggestedExperiment {
  title: string;
  hypothesis: string;
  targetMetric: string;
  suggestedDuration: string;
  changes: string[];
  sourceActionId: string;
  sourceSection: string;
  priority: "high" | "medium" | "low";
}

const SECTION_TO_METRIC: Record<string, string> = {
  title: "Impressions",
  subtitle: "Impressions",
  keywords: "Impressions",
  shortDescription: "Conversion Rate",
  description: "Conversion Rate",
  screenshots: "Conversion Rate",
  icon: "Conversion Rate",
  ratings: "Rating",
  video: "Conversion Rate",
  localization: "Impressions (localized markets)",
  cpp: "Conversion Rate (Custom Product Pages)",
  maintenance: "Rating / Crash Rate",
};

const SECTION_TO_DURATION: Record<string, string> = {
  title: "14 days",
  subtitle: "14 days",
  keywords: "21 days",
  shortDescription: "14 days",
  description: "14 days",
  screenshots: "14 days",
  icon: "14 days",
  ratings: "30 days",
  video: "14 days",
  localization: "21 days",
  cpp: "14 days",
  maintenance: "30 days",
};

/**
 * Generate structured experiment suggestions from action plan items
 * and their deep-dive results.
 */
export function generateExperimentSuggestions(
  actionPlan: ActionItem[],
  deepDiveResults: Record<string, Record<string, unknown>>,
): SuggestedExperiment[] {
  const experiments: SuggestedExperiment[] = [];
  const seenSections = new Set<string>();

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...actionPlan]
    .filter((a) => a.deepDiveSection && a.priority !== "low")
    .sort((a, b) => (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2) - (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2));

  for (const action of sorted) {
    const section = action.deepDiveSection;
    if (!section || seenSections.has(section)) continue;
    seenSections.add(section);

    const deepDive = deepDiveResults[section];
    const changes = extractChanges(action, deepDive);
    if (changes.length === 0) continue;

    experiments.push({
      title: buildExperimentTitle(section, action),
      hypothesis: buildHypothesis(section, action, deepDive),
      targetMetric: SECTION_TO_METRIC[section] || "Conversion Rate",
      suggestedDuration: SECTION_TO_DURATION[section] || "14 days",
      changes,
      sourceActionId: action.id,
      sourceSection: section,
      priority: action.priority as "high" | "medium" | "low",
    });

    if (experiments.length >= 5) break;
  }

  return experiments;
}

function buildExperimentTitle(section: string, action: ActionItem): string {
  const sectionLabels: Record<string, string> = {
    title: "Test optimized app title",
    subtitle: "Test new subtitle copy",
    keywords: "Refresh keyword field",
    shortDescription: "Rewrite short description",
    description: "Restructure long description",
    screenshots: "Redesign screenshot gallery",
    icon: "Test new icon design",
    ratings: "Improve rating response strategy",
    video: "Add or update preview video",
    localization: "Localize store listing",
    cpp: "Launch Custom Product Page",
    maintenance: "Ship stability update",
  };
  return sectionLabels[section] || action.title;
}

function buildHypothesis(
  section: string,
  action: ActionItem,
  deepDive?: Record<string, unknown>,
): string {
  if (deepDive) {
    const suggestions = deepDive.suggestions as string[] | undefined;
    if (suggestions?.length) {
      return `Implementing "${suggestions[0]}" will improve ${SECTION_TO_METRIC[section] || "performance"} by addressing: ${action.brief?.substring(0, 120) || action.title}`;
    }

    const recommendation = deepDive.recommendation as string | undefined;
    if (recommendation) {
      return `${recommendation.substring(0, 150)}`;
    }
  }

  return `Optimizing the ${section} based on audit findings will improve ${SECTION_TO_METRIC[section] || "performance"}. Current issue: ${action.brief?.substring(0, 100) || action.title}`;
}

function extractChanges(
  action: ActionItem,
  deepDive?: Record<string, unknown>,
): string[] {
  const changes: string[] = [];

  if (deepDive) {
    const suggestions = deepDive.suggestions as string[] | undefined;
    if (suggestions?.length) {
      changes.push(...suggestions.slice(0, 3));
    }

    const pairs = deepDive.titleSubtitlePairs as Array<{ title: string; subtitle: string }> | undefined;
    if (pairs?.length) {
      const pair = pairs[0];
      changes.push(`Title: "${pair.title}"`, `Subtitle: "${pair.subtitle}"`);
    }

    const keywordSuggestions = deepDive.newKeywords as string[] | undefined;
    if (keywordSuggestions?.length) {
      changes.push(`Add keywords: ${keywordSuggestions.slice(0, 5).join(", ")}`);
    }
  }

  if (changes.length === 0 && action.brief) {
    const sentences = action.brief.split(/[.!]\s+/).filter(Boolean);
    changes.push(...sentences.slice(0, 2));
  }

  return changes.slice(0, 4);
}
