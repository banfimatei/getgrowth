"use client";

import { useState } from "react";
import type { ActionItem, DeepDiveSection } from "@/lib/action-plan";

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

interface ActionPlanProps {
  actions: ActionItem[];
  onDeepDive?: (section: DeepDiveSection, actionId: string) => Promise<DeepDiveEnhancement | string | null>;
  deepDiveLoading?: string | null;
  onVisualize?: (section: "icon" | "screenshots", brief: string) => Promise<VisualConceptResult[] | string>;
}

const priorityConfig = {
  critical: { bg: "var(--fail-bg)", border: "var(--fail-border)", text: "var(--fail-text)", label: "Critical" },
  high: { bg: "var(--warn-bg)", border: "var(--warn-border)", text: "var(--warn-text)", label: "High" },
  medium: { bg: "var(--info-bg)", border: "var(--info-border)", text: "var(--info-text)", label: "Medium" },
  low: { bg: "var(--pass-bg)", border: "var(--pass-border)", text: "var(--pass-text)", label: "Low" },
};

const effortConfig = {
  quick: { label: "Quick win", color: "var(--pass-text)" },
  medium: { label: "Medium effort", color: "var(--warn-text)" },
  heavy: { label: "Significant effort", color: "var(--text-tertiary)" },
};

export default function ActionPlan({ actions, onDeepDive, deepDiveLoading, onVisualize }: ActionPlanProps) {
  if (actions.length === 0) {
    return (
      <div
        className="border rounded-lg p-6 text-center"
        style={{ backgroundColor: "var(--pass-bg)", borderColor: "var(--pass-border)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--pass-text)" }}>
          No critical actions needed. Your ASO is in great shape.
        </p>
      </div>
    );
  }

  const quickWins = actions.filter(a => a.effort === "quick");
  const mediumEffort = actions.filter(a => a.effort === "medium");
  const heavyEffort = actions.filter(a => a.effort === "heavy");

  return (
    <div className="space-y-4">
      {quickWins.length > 0 && (
        <ActionGroup title="Quick Wins" subtitle="Can be done today" actions={quickWins} onDeepDive={onDeepDive} deepDiveLoading={deepDiveLoading} onVisualize={onVisualize} />
      )}
      {mediumEffort.length > 0 && (
        <ActionGroup title="This Sprint" subtitle="Medium effort, high impact" actions={mediumEffort} onDeepDive={onDeepDive} deepDiveLoading={deepDiveLoading} onVisualize={onVisualize} />
      )}
      {heavyEffort.length > 0 && (
        <ActionGroup title="Roadmap" subtitle="Significant effort" actions={heavyEffort} onDeepDive={onDeepDive} deepDiveLoading={deepDiveLoading} onVisualize={onVisualize} />
      )}
    </div>
  );
}

function ActionGroup({ title, subtitle, actions, onDeepDive, deepDiveLoading, onVisualize }: {
  title: string;
  subtitle: string;
  actions: ActionItem[];
  onDeepDive?: (section: DeepDiveSection, actionId: string) => Promise<DeepDiveEnhancement | string | null>;
  deepDiveLoading?: string | null;
  onVisualize?: (section: "icon" | "screenshots", brief: string) => Promise<VisualConceptResult[] | string>;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h4>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{subtitle}</span>
      </div>
      <div className="space-y-2">
        {actions.map((action) => (
          <ActionCard key={action.id} action={action} onDeepDive={onDeepDive} isLoading={deepDiveLoading === action.id} onVisualize={onVisualize} />
        ))}
      </div>
    </div>
  );
}

function ActionCard({ action, onDeepDive, isLoading, onVisualize }: {
  action: ActionItem;
  onDeepDive?: (section: DeepDiveSection, actionId: string) => Promise<DeepDiveEnhancement | string | null>;
  isLoading?: boolean;
  onVisualize?: (section: "icon" | "screenshots", brief: string) => Promise<VisualConceptResult[] | string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [enhanced, setEnhanced] = useState<DeepDiveEnhancement | null>(null);
  const [deepDiveError, setDeepDiveError] = useState<string | null>(null);
  const [visualConcepts, setVisualConcepts] = useState<VisualConceptResult[] | null>(null);
  const [visualLoading, setVisualLoading] = useState(false);
  const [visualError, setVisualError] = useState<string | null>(null);
  const pConfig = priorityConfig[action.priority];
  const eConfig = effortConfig[action.effort];

  const canDeepDive = !!action.deepDiveSection && !!onDeepDive;
  const showDeepDive = canDeepDive;

  const isEnhanced = !!enhanced;
  const activeBrief = enhanced?.brief || action.brief;
  const activeCopyOptions = enhanced?.copyOptions || action.copyOptions;
  const activeDeliverables = enhanced?.deliverables || action.deliverables;

  const aiBadge = isEnhanced ? "enhanced" : action.aiStatus;

  const canVisualize = !!onVisualize && (action.deepDiveSection === "icon" || action.deepDiveSection === "screenshots");
  const showVisualize = canVisualize && (isEnhanced || action.aiStatus === "reviewed");

  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: isLoading ? "var(--info-border)" : isEnhanced ? "rgba(124,58,237,0.3)" : "var(--border)",
        transition: "border-color 0.3s ease",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-start gap-3 cursor-pointer"
        style={{ background: "none", border: "none" }}
      >
        <span
          className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-medium shrink-0"
          style={{ backgroundColor: pConfig.bg, color: pConfig.text, border: `1px solid ${pConfig.border}` }}
        >
          {pConfig.label}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5 flex-wrap">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {action.title}
              {aiBadge === "enhanced" && (
                <span
                  className="inline-block ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none align-middle"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)", color: "#fff" }}
                  title="Enhanced by deep AI analysis"
                >
                  AI+
                </span>
              )}
              {aiBadge === "reviewed" && (
                <span
                  className="inline-block ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none align-middle"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)", color: "#fff" }}
                  title="Analyzed by AI"
                >
                  AI
                </span>
              )}
              {aiBadge === "available" && (
                <span
                  className="inline-block ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none align-middle"
                  style={{ backgroundColor: "var(--bg-inset)", color: "var(--text-tertiary)", border: "1px dashed var(--border)" }}
                  title="AI analysis available"
                >
                  ✦ AI
                </span>
              )}
            </p>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            {action.category} {"\u00B7"} <span style={{ color: eConfig.color }}>{eConfig.label}</span> {"\u00B7"} {action.scoreBoost}
          </p>
        </div>
        <span
          className="text-xs mt-1 shrink-0 transition-transform"
          style={{
            color: "var(--text-tertiary)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          {"\u25BC"}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "var(--border)" }}>
          {/* Current state badge */}
          <div
            className="text-xs px-2.5 py-1.5 rounded mt-3"
            style={{
              backgroundColor: "var(--bg-inset)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {action.currentState}
          </div>

          {/* Rich brief — replaced when deep-dive succeeds */}
          <BriefContent text={activeBrief} />

          {/* Copy options */}
          {activeCopyOptions && activeCopyOptions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
                Ready-to-use copy options
              </p>
              {activeCopyOptions.map((opt, i) => (
                <CopyOption key={i} index={i + 1} text={opt} />
              ))}
            </div>
          )}

          {/* Deliverables checklist */}
          {activeDeliverables && activeDeliverables.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
                Deliverables
              </p>
              <div
                className="rounded p-2.5 space-y-1"
                style={{ backgroundColor: "var(--bg-inset)" }}
              >
                {activeDeliverables.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span className="shrink-0 mt-px" style={{ color: "var(--text-tertiary)" }}>{"\u25A2"}</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Impact */}
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            <span className="font-medium" style={{ color: "var(--text-secondary)" }}>Impact:</span> {action.impact}
          </p>

          {/* Deep Dive button / status */}
          {showDeepDive && (
            <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              {isLoading ? (
                <div className="flex items-center gap-2 text-xs py-1.5" style={{ color: "var(--info-text)" }}>
                  <span className="inline-block w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "var(--info-border)", borderTopColor: "var(--info-text)" }} />
                  Running deep AI analysis on {action.deepDiveSection}...
                </div>
              ) : deepDiveError ? (
                <div className="flex items-center gap-2 text-xs py-1.5">
                  <span style={{ color: "var(--fail-text)" }}>{deepDiveError}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeepDiveError(null);
                    }}
                    className="text-xs underline cursor-pointer"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Retry
                  </button>
                </div>
              ) : isEnhanced ? (
                <p className="text-xs py-1" style={{ color: "var(--text-tertiary)" }}>
                  ✦ Enhanced with deep AI analysis
                </p>
              ) : (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (onDeepDive && action.deepDiveSection) {
                      const result = await onDeepDive(action.deepDiveSection, action.id);
                      if (typeof result === "string" && result.startsWith("__ERROR__")) {
                        setDeepDiveError(result.replace("__ERROR__", ""));
                      } else if (result && typeof result === "object") {
                        setEnhanced(result);
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded cursor-pointer transition-colors"
                  style={{
                    background: "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(99,102,241,0.1))",
                    color: "var(--info-text)",
                    border: "1px solid var(--info-border)",
                  }}
                >
                  <span>✦</span>
                  {action.aiStatus === "reviewed" ? "Deep Dive" : "Enhance with AI"}
                </button>
              )}
            </div>
          )}

          {/* Visual Concepts */}
          {showVisualize && (
            <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              {visualLoading ? (
                <div className="flex items-center gap-2 text-xs py-1.5" style={{ color: "rgb(234, 179, 8)" }}>
                  <span className="inline-block w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(234, 179, 8, 0.3)", borderTopColor: "rgb(234, 179, 8)" }} />
                  Generating {action.deepDiveSection === "icon" ? "icon concepts" : "gallery moodboard"}... (10-20s)
                </div>
              ) : visualError ? (
                <div className="flex items-center gap-2 text-xs py-1.5">
                  <span style={{ color: "var(--fail-text)" }}>{visualError}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setVisualError(null);
                    }}
                    className="text-xs underline cursor-pointer"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Retry
                  </button>
                </div>
              ) : visualConcepts ? (
                <VisualConceptsGallery
                  concepts={visualConcepts}
                  section={action.deepDiveSection as "icon" | "screenshots"}
                />
              ) : (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (onVisualize && action.deepDiveSection) {
                      setVisualLoading(true);
                      try {
                        const result = await onVisualize(
                          action.deepDiveSection as "icon" | "screenshots",
                          activeBrief,
                        );
                        if (typeof result === "string" && result.startsWith("__ERROR__")) {
                          setVisualError(result.replace("__ERROR__", ""));
                        } else if (Array.isArray(result)) {
                          setVisualConcepts(result);
                        }
                      } finally {
                        setVisualLoading(false);
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded cursor-pointer transition-colors"
                  style={{
                    background: "linear-gradient(135deg, rgba(234,179,8,0.1), rgba(245,158,11,0.1))",
                    color: "rgb(234, 179, 8)",
                    border: "1px solid rgba(234, 179, 8, 0.3)",
                  }}
                >
                  <span>{"\uD83C\uDFA8"}</span>
                  {action.deepDiveSection === "icon" ? "Generate Icon Concepts" : "Generate Gallery Moodboard"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RichText({ text }: { text: string }) {
  if (!text.includes("**")) return <>{text}</>;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <span key={j} className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {part.replace(/\*\*/g, "")}
          </span>
        ) : (
          <span key={j}>{part}</span>
        )
      )}
    </>
  );
}

function BriefContent({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="text-sm space-y-0.5" style={{ color: "var(--text-secondary)" }}>
      {lines.map((line, i) => {
        const trimmed = line.trimStart();
        const indent = line.length - trimmed.length;
        const pl = indent > 0 ? `${Math.min(indent * 4, 32)}px` : undefined;

        if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
          return (
            <p key={i} className="font-semibold text-xs mt-3 mb-0.5" style={{ color: "var(--text-primary)" }}>
              {trimmed.replace(/\*\*/g, "")}
            </p>
          );
        }

        if (trimmed.startsWith("\u2022") || trimmed.startsWith("-") || trimmed.startsWith("\u2705") || trimmed.startsWith("\u274C") || trimmed.startsWith("\u25A2")) {
          return (
            <p key={i} className="text-xs leading-relaxed" style={{ paddingLeft: `${Math.max(indent * 4, 12)}px` }}>
              <RichText text={trimmed} />
            </p>
          );
        }

        if (trimmed.match(/^\d+\.\s/)) {
          return (
            <p key={i} className="text-xs font-medium mt-2 leading-relaxed" style={{ paddingLeft: pl, color: "var(--text-primary)" }}>
              <RichText text={trimmed} />
            </p>
          );
        }

        if (trimmed === "---") {
          return <hr key={i} className="my-3" style={{ borderColor: "var(--border)", borderStyle: "dashed" }} />;
        }

        if (trimmed === "") {
          return <div key={i} className="h-2" />;
        }

        return (
          <p key={i} className="text-xs leading-relaxed" style={{ paddingLeft: pl }}>
            <RichText text={trimmed} />
          </p>
        );
      })}
    </div>
  );
}

function downloadConcept(data: string, mimeType: string, label: string, section: "icon" | "screenshots") {
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const filename = `${section}-concept-${slug}.${ext}`;
  const link = document.createElement("a");
  link.href = `data:${mimeType};base64,${data}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function VisualConceptsGallery({ concepts, section }: {
  concepts: VisualConceptResult[];
  section: "icon" | "screenshots";
}) {
  const isIcon = section === "icon";
  // 4 concepts → 2×2 grid; 3 → 3 cols; moodboard → single column
  const gridClass = isIcon
    ? concepts.length >= 4 ? "grid grid-cols-2 gap-3" : "grid grid-cols-3 gap-3"
    : "space-y-3";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgb(234, 179, 8)" }}>
          {isIcon ? "Icon Concepts" : "Gallery Moodboard"}
        </p>
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{
            backgroundColor: "rgba(234, 179, 8, 0.1)",
            color: "rgb(234, 179, 8)",
            border: "1px solid rgba(234, 179, 8, 0.3)",
          }}
        >
          AI Concept
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
          {concepts.length} {concepts.length === 1 ? "result" : "results"} · click ↓ to download
        </span>
      </div>
      <div className={gridClass}>
        {concepts.map((concept, i) => (
          <div key={i} className="space-y-1.5">
            <div
              className="relative rounded-lg overflow-hidden border group"
              style={{ borderColor: "rgba(234, 179, 8, 0.2)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${concept.mimeType};base64,${concept.data}`}
                alt={concept.label}
                className={isIcon ? "w-full aspect-square object-cover" : "w-full object-contain"}
                style={{ backgroundColor: "var(--bg-inset)" }}
              />
              {/* Overlay: label + download button */}
              <div
                className="absolute bottom-0 left-0 right-0 px-2 py-1.5 flex items-center justify-between"
                style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}
              >
                <p className="text-[10px] font-semibold text-white">{concept.label}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadConcept(concept.data, concept.mimeType, concept.label, section);
                  }}
                  className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded cursor-pointer transition-opacity opacity-70 hover:opacity-100"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.15)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}
                  title={`Download ${concept.label}`}
                >
                  ↓ Download
                </button>
              </div>
            </div>
            {concept.commentary && (
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                {concept.commentary}
              </p>
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] italic" style={{ color: "var(--text-tertiary)" }}>
        AI-generated concepts for creative direction only — not production-ready assets.
      </p>
    </div>
  );
}

function CopyOption({ index, text }: { index: number; text: string }) {
  const [copied, setCopied] = useState(false);
  const charCount = text.length;
  const isLong = charCount > 120;
  const displayText = isLong ? text.substring(0, 100) + "\u2026" : text;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available in all contexts
    }
  };

  if (isLong) {
    return (
      <div
        className="rounded p-2.5"
        style={{ backgroundColor: "var(--info-bg)", border: "1px solid var(--info-border)" }}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-bold" style={{ color: "var(--info-text)" }}>
            Option {index}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {charCount}ch
            </span>
            <button
              onClick={handleCopy}
              className="text-xs font-medium px-2 py-0.5 rounded cursor-pointer transition-colors"
              style={{
                backgroundColor: copied ? "var(--pass-bg)" : "transparent",
                color: copied ? "var(--pass-text)" : "var(--info-text)",
                border: `1px solid ${copied ? "var(--pass-border)" : "var(--info-border)"}`,
              }}
            >
              {copied ? "\u2713 Copied" : "Copy full text"}
            </button>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--info-text)", fontFamily: "var(--font-mono)" }}>
          {displayText}
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 rounded p-2 cursor-pointer group"
      style={{ backgroundColor: "var(--info-bg)", border: "1px solid var(--info-border)" }}
      onClick={handleCopy}
    >
      <span className="text-xs font-bold shrink-0" style={{ color: "var(--info-text)" }}>
        {index}.
      </span>
      <span className="text-xs flex-1" style={{ color: "var(--info-text)", fontFamily: "var(--font-mono)" }}>
        &ldquo;{text}&rdquo;
      </span>
      <span className="text-xs shrink-0" style={{ color: "var(--text-tertiary)" }}>
        {charCount}ch
      </span>
      <span
        className="text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "var(--info-text)" }}
      >
        {copied ? "\u2713 Copied" : "Copy"}
      </span>
    </div>
  );
}
