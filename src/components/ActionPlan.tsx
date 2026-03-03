"use client";

import type { ActionItem } from "@/lib/action-plan";

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

export default function ActionPlan({ actions }: { actions: ActionItem[] }) {
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
    <div className="space-y-3">
      {quickWins.length > 0 && (
        <ActionGroup title="Quick Wins" subtitle="Can be done today" actions={quickWins} />
      )}
      {mediumEffort.length > 0 && (
        <ActionGroup title="This Sprint" subtitle="Medium effort, high impact" actions={mediumEffort} />
      )}
      {heavyEffort.length > 0 && (
        <ActionGroup title="Roadmap" subtitle="Significant effort" actions={heavyEffort} />
      )}
    </div>
  );
}

function ActionGroup({ title, subtitle, actions }: { title: string; subtitle: string; actions: ActionItem[] }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h4>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{subtitle}</span>
      </div>
      <div className="space-y-2">
        {actions.map((action) => (
          <ActionCard key={action.id} action={action} />
        ))}
      </div>
    </div>
  );
}

function ActionCard({ action }: { action: ActionItem }) {
  const pConfig = priorityConfig[action.priority];
  const eConfig = effortConfig[action.effort];

  return (
    <div
      className="border rounded-lg p-4"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-start gap-3 mb-2">
        <span
          className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-medium shrink-0"
          style={{ backgroundColor: pConfig.bg, color: pConfig.text, border: `1px solid ${pConfig.border}` }}
        >
          {pConfig.label}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {action.title}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            {action.category} {"\u00B7"} <span style={{ color: eConfig.color }}>{eConfig.label}</span> {"\u00B7"} {action.scoreBoost}
          </p>
        </div>
      </div>

      <div className="ml-0 space-y-2">
        <div
          className="text-xs px-2.5 py-1.5 rounded"
          style={{ backgroundColor: "var(--bg-inset)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
        >
          {action.currentState}
        </div>

        <p className="text-sm whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
          {action.action}
        </p>

        {action.example && (
          <div
            className="text-sm p-2.5 rounded border-l-2"
            style={{ backgroundColor: "var(--info-bg)", borderLeftColor: "var(--info-border)", color: "var(--info-text)" }}
          >
            <span className="font-medium">Example: </span>{action.example}
          </div>
        )}

        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          <span className="font-medium" style={{ color: "var(--text-secondary)" }}>Impact:</span> {action.impact}
        </p>
      </div>
    </div>
  );
}
