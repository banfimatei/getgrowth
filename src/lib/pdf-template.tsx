import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import React from "react";

const styles = StyleSheet.create({
  page:         { padding: 40, fontFamily: "Helvetica", backgroundColor: "#fff" },
  header:       { marginBottom: 24 },
  brand:        { fontSize: 10, color: "#1E1B4B", marginBottom: 4 },
  title:        { fontSize: 20, fontWeight: "bold", color: "#111", marginBottom: 4 },
  subtitle:     { fontSize: 11, color: "#555" },
  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: "bold", color: "#111", marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingBottom: 4 },
  scoreRow:     { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  scoreBig:     { fontSize: 40, fontWeight: "bold", color: "#1E1B4B", marginRight: 16 },
  scoreLabel:   { fontSize: 11, color: "#555" },
  catRow:       { flexDirection: "row", justifyContent: "space-between", marginBottom: 6, padding: "4 8", backgroundColor: "#f9fafb", borderRadius: 4 },
  catName:      { fontSize: 10, color: "#333" },
  catScore:     { fontSize: 10, fontWeight: "bold", color: "#333" },
  actionItem:   { marginBottom: 10, padding: "6 8", backgroundColor: "#f9fafb", borderRadius: 4 },
  actionTitle:  { fontSize: 10, fontWeight: "bold", color: "#111", marginBottom: 2 },
  actionMeta:   { fontSize: 9, color: "#888", marginBottom: 3 },
  actionBrief:  { fontSize: 9, color: "#444", lineHeight: 1.5 },
  footer:       { position: "absolute", bottom: 30, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
  footerText:   { fontSize: 8, color: "#aaa" },
});

const priorityLabel: Record<string, string> = {
  high:   "High Impact",
  medium: "Medium Impact",
  low:    "Quick Win",
};

export interface AuditPdfData {
  appTitle: string;
  developer: string;
  platform: string;
  overallScore: number;
  generatedAt: string;
  aiPowered: boolean;
  categories: Array<{ id: string; name: string; score: number }>;
  actionPlan: Array<{ title: string; priority: string; brief: string }>;
  keywordIntelligence?: Array<{
    keyword: string;
    popularity: number;
    difficulty: number;
    difficultyLabel: string;
    targetingLabel: string;
    dailySearches: number;
    appRank: number | null;
  }>;
}

export function AuditPdfDocument({ auditData }: { auditData: AuditPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>GetGrowth.eu — ASO Audit Report</Text>
          <Text style={styles.title}>{auditData.appTitle}</Text>
          <Text style={styles.subtitle}>
            {auditData.developer} · {auditData.platform === "ios" ? "iOS" : "Android"} · Generated {auditData.generatedAt}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Score</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreBig}>{auditData.overallScore}</Text>
            <Text style={styles.scoreLabel}>
              out of 100{"\n"}
              {auditData.aiPowered ? "AI-powered analysis" : "Rule-based analysis"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Scores</Text>
          {auditData.categories.map((cat) => (
            <View key={cat.id} style={styles.catRow}>
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catScore}>{cat.score}/100</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Action Plan ({auditData.actionPlan.length} items)</Text>
          {auditData.actionPlan.slice(0, 12).map((item, i) => (
            <View key={i} style={styles.actionItem}>
              <Text style={styles.actionTitle}>{item.title}</Text>
              <Text style={styles.actionMeta}>{priorityLabel[item.priority] ?? item.priority}</Text>
              <Text style={styles.actionBrief}>
                {item.brief?.substring(0, 300)}{item.brief?.length > 300 ? "…" : ""}
              </Text>
            </View>
          ))}
        </View>

        {auditData.keywordIntelligence && auditData.keywordIntelligence.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Keyword Intelligence ({auditData.keywordIntelligence.length} keywords)</Text>
            <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e2e2", paddingBottom: 4, marginBottom: 4 }}>
              <Text style={{ fontSize: 7, fontWeight: "bold", width: "25%", color: "#1E1B4B" }}>Keyword</Text>
              <Text style={{ fontSize: 7, fontWeight: "bold", width: "15%", color: "#1E1B4B", textAlign: "center" }}>Targeting</Text>
              <Text style={{ fontSize: 7, fontWeight: "bold", width: "12%", color: "#1E1B4B", textAlign: "center" }}>Pop.</Text>
              <Text style={{ fontSize: 7, fontWeight: "bold", width: "12%", color: "#1E1B4B", textAlign: "center" }}>Diff.</Text>
              <Text style={{ fontSize: 7, fontWeight: "bold", width: "16%", color: "#1E1B4B", textAlign: "center" }}>Searches/day</Text>
              <Text style={{ fontSize: 7, fontWeight: "bold", width: "10%", color: "#1E1B4B", textAlign: "center" }}>Rank</Text>
            </View>
            {auditData.keywordIntelligence.map((kw, ki) => (
              <View key={ki} style={{ flexDirection: "row", paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0" }}>
                <Text style={{ fontSize: 7, width: "25%", color: "#333" }}>{kw.keyword}</Text>
                <Text style={{ fontSize: 7, width: "15%", color: "#555", textAlign: "center" }}>{kw.targetingLabel}</Text>
                <Text style={{ fontSize: 7, width: "12%", color: "#333", textAlign: "center" }}>{kw.popularity}</Text>
                <Text style={{ fontSize: 7, width: "12%", color: "#333", textAlign: "center" }}>{kw.difficulty} ({kw.difficultyLabel})</Text>
                <Text style={{ fontSize: 7, width: "16%", color: "#333", textAlign: "center" }}>~{Math.round(kw.dailySearches)}</Text>
                <Text style={{ fontSize: 7, width: "10%", color: kw.appRank ? "#1E1B4B" : "#999", textAlign: "center" }}>{kw.appRank ? `#${kw.appRank}` : "—"}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>GetGrowth.eu — ASO Intelligence Platform</Text>
          <Text style={styles.footerText}>getgrowth.eu</Text>
        </View>
      </Page>
    </Document>
  );
}
