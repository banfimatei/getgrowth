"use client";

import { useState } from "react";
import type { AuditCategory } from "@/lib/aso-rules";

function statusStyle(status: string) {
  switch (status) {
    case "pass":
      return { bg: "var(--pass-bg)", border: "var(--pass-border)", text: "var(--pass-text)", label: "Pass" };
    case "warning":
      return { bg: "var(--warn-bg)", border: "var(--warn-border)", text: "var(--warn-text)", label: "Warning" };
    case "fail":
      return { bg: "var(--fail-bg)", border: "var(--fail-border)", text: "var(--fail-text)", label: "Fail" };
    default:
      return { bg: "var(--info-bg)", border: "var(--info-border)", text: "var(--info-text)", label: "Info" };
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--score-excellent)";
  if (score >= 60) return "var(--score-good)";
  if (score >= 40) return "var(--score-warning)";
  return "var(--score-fail)";
}

export default function CategoryCard({ category }: { category: AuditCategory }) {
  const [expanded, setExpanded] = useState(false);

  const passCount = category.results.filter(r => r.status === "pass").length;
  const warnCount = category.results.filter(r => r.status === "warning").length;
  const failCount = category.results.filter(r => r.status === "fail").length;

  return (
    <div
      className="border rounded-lg overflow-hidden transition-colors"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 flex items-center gap-4 transition-colors"
        style={{ backgroundColor: expanded ? "var(--bg-card-hover)" : "transparent" }}
        aria-expanded={expanded}
        aria-controls={`category-${category.id}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
              {category.name}
            </h3>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {category.description}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex gap-1.5 text-xs font-mono tabular-nums">
            {passCount > 0 && <span style={{ color: "var(--pass-text)" }}>{passCount}P</span>}
            {warnCount > 0 && <span style={{ color: "var(--warn-text)" }}>{warnCount}W</span>}
            {failCount > 0 && <span style={{ color: "var(--fail-text)" }}>{failCount}F</span>}
          </div>
          <div
            className="w-12 h-12 rounded-md flex items-center justify-center tabular-nums font-semibold text-lg"
            style={{
              color: scoreColor(category.score),
              backgroundColor: "var(--bg-inset)",
            }}
          >
            {category.score}
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="transition-transform"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <path d="M4 6L8 10L12 6" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div
          id={`category-${category.id}`}
          className="border-t divide-y"
          style={{ borderColor: "var(--border)" }}
          role="region"
          aria-label={`${category.name} audit details`}
        >
          {category.results.map((result, i) => {
            const style = statusStyle(result.status);
            return (
              <div key={i} className="p-4 pl-5" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-start gap-3">
                  <span
                    className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-medium shrink-0"
                    style={{
                      backgroundColor: style.bg,
                      color: style.text,
                      border: `1px solid ${style.border}`,
                    }}
                  >
                    {style.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {result.ruleName}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {result.message}
                    </p>
                    {result.details && (
                      <p
                        className="text-xs mt-2 p-2.5 rounded whitespace-pre-wrap"
                        style={{ backgroundColor: "var(--bg-inset)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", lineHeight: "1.6" }}
                      >
                        {result.details}
                      </p>
                    )}
                    {result.recommendation && (
                      <p
                        className="text-sm mt-2 p-3 rounded border-l-2"
                        style={{ backgroundColor: style.bg, borderLeftColor: style.border, color: style.text }}
                      >
                        {result.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
