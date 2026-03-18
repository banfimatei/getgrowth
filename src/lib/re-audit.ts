/**
 * Automated re-audit engine.
 * Runs heuristic (no-AI) audits for connected apps and their saved competitors.
 * Called by the weekly cron job.
 */

import { supabaseAdmin } from "./supabase";
import { fetchAppStoreData, fetchGooglePlayData } from "./store-scraper";
import { runAudit, calculateOverallScore } from "./aso-rules";
import { sendScoreRegression, sendLeadScoreChange } from "./email";
import { buildAndSaveProfile } from "./profile-compiler";

interface ReAuditResult {
  connectedApps: { processed: number; errored: number; errors: string[] };
  competitors: { processed: number; errored: number; errors: string[] };
  leads: { processed: number; errored: number; alerted: number };
  regressionAlerts: number;
}

const REGRESSION_THRESHOLD = 5; // pts drop to trigger email
const BIWEEKLY_MS = 13 * 24 * 60 * 60 * 1000; // 13 days (fire if last email > 13 days ago)

/**
 * Re-audit all connected apps that have sync enabled, plus their saved competitors.
 */
export async function reAuditAll(): Promise<ReAuditResult> {
  const result: ReAuditResult = {
    connectedApps: { processed: 0, errored: 0, errors: [] },
    competitors: { processed: 0, errored: 0, errors: [] },
    leads: { processed: 0, errored: 0, alerted: 0 },
    regressionAlerts: 0,
  };

  // Load all connected apps with sync enabled
  const { data: connectedApps } = await supabaseAdmin
    .from("connected_apps")
    .select("id, user_id, store_app_id, platform, name, saved_app_id")
    .eq("sync_enabled", true);

  if (connectedApps?.length) {
    for (const app of connectedApps) {
      if (!app.saved_app_id) continue;
      try {
        await reAuditApp({
          userId: app.user_id,
          savedAppId: app.saved_app_id,
          storeId: app.store_app_id,
          platform: app.platform as "ios" | "android",
          source: "auto_public",
        });
        result.connectedApps.processed++;
      } catch (err) {
        result.connectedApps.errored++;
        result.connectedApps.errors.push(`${app.name}: ${err instanceof Error ? err.message : "unknown"}`);
      }
      // Small delay between apps
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Rebuild app context profiles for all processed apps
    for (const app of connectedApps) {
      if (!app.saved_app_id || !app.user_id) continue;
      try {
        await buildAndSaveProfile(app.saved_app_id, app.user_id);
      } catch (e) {
        console.error(`[re-audit] Profile rebuild failed for ${app.name}:`, e);
      }
    }
  }

  // F3: Bi-weekly score regression check for connected apps
  // For each connected app, compare the two most recent auto_public audits.
  // If score dropped >=5pts AND last regression email was >13 days ago, email the user.
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://getgrowth.eu";
  const savedAppIds = (connectedApps ?? []).filter((a) => a.saved_app_id).map((a) => a.saved_app_id);

  if (savedAppIds.length) {
    for (const app of connectedApps ?? []) {
      if (!app.saved_app_id || !app.user_id) continue;
      try {
        // Get the two most recent auto-audits for this saved app
        const { data: recentAudits } = await supabaseAdmin
          .from("audits")
          .select("overall_score, category_scores, created_at")
          .eq("saved_app_id", app.saved_app_id)
          .eq("source", "auto_public")
          .is("competitor_id", null)
          .order("created_at", { ascending: false })
          .limit(2);

        if (!recentAudits || recentAudits.length < 2) continue;
        const [latest, previous] = recentAudits;
        const delta = latest.overall_score - previous.overall_score;
        if (delta > -REGRESSION_THRESHOLD) continue; // not a significant drop

        // Check bi-weekly gate on saved_apps.last_regression_email_at
        const { data: savedApp } = await supabaseAdmin
          .from("saved_apps")
          .select("last_regression_email_at")
          .eq("id", app.saved_app_id)
          .single();

        const lastSent = savedApp?.last_regression_email_at
          ? new Date(savedApp.last_regression_email_at).getTime()
          : 0;
        if (Date.now() - lastSent < BIWEEKLY_MS) continue;

        // Resolve user email
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("email")
          .eq("id", app.user_id)
          .single();
        if (!user?.email) continue;

        // Build category diff list
        const prevScores = (previous.category_scores as Record<string, number>) ?? {};
        const currScores = (latest.category_scores as Record<string, number>) ?? {};
        const categoryDiffs = Object.keys({ ...prevScores, ...currScores }).map((cat) => ({
          category: cat,
          previous: prevScores[cat] ?? 0,
          current: currScores[cat] ?? 0,
        }));

        await sendScoreRegression({
          to: user.email,
          appName: app.name,
          previousScore: previous.overall_score,
          newScore: latest.overall_score,
          categoryDiffs,
          appDetailUrl: `${APP_URL}/dashboard/apps/${app.id}`,
        });

        // Update last_regression_email_at
        await supabaseAdmin
          .from("saved_apps")
          .update({ last_regression_email_at: new Date().toISOString() })
          .eq("id", app.saved_app_id);

        result.regressionAlerts++;
      } catch (err) {
        console.error(`[re-audit] Regression check failed for ${app.name}:`, err);
      }
    }
  }

  // Load saved competitors for all connected apps
  if (savedAppIds.length) {
    const { data: competitorRows } = await supabaseAdmin
      .from("competitors")
      .select("id, saved_app_id, competitor_store_id, competitor_platform, competitor_name, user_id")
      .in("saved_app_id", savedAppIds);

    if (competitorRows?.length) {
      for (const comp of competitorRows) {
        if (!comp.user_id || !comp.saved_app_id) continue; // skip orphaned rows
        try {
          await reAuditApp({
            userId: comp.user_id,
            savedAppId: comp.saved_app_id,
            storeId: comp.competitor_store_id,
            platform: comp.competitor_platform as "ios" | "android",
            source: "auto_public",
            competitorId: comp.id,
          });
          result.competitors.processed++;
        } catch (err) {
          result.competitors.errored++;
          result.competitors.errors.push(`${comp.competitor_name}: ${err instanceof Error ? err.message : "unknown"}`);
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  // F4: Re-audit unclaimed audit leads and email if score changed >=3pts
  const LEAD_CHANGE_THRESHOLD = 3;
  const { data: leads } = await supabaseAdmin
    .from("audit_leads")
    .select("id, token, email, store_id, platform, app_name, app_icon_url, score, category_scores")
    .is("claimed_user_id", null); // only unclaimed leads

  if (leads?.length) {
    for (const lead of leads) {
      try {
        const appData =
          lead.platform === "ios"
            ? await fetchAppStoreData(lead.store_id)
            : await fetchGooglePlayData(lead.store_id);

        const categories = runAudit(appData);
        const newScore = calculateOverallScore(categories);
        const delta = newScore - lead.score;

        if (Math.abs(delta) >= LEAD_CHANGE_THRESHOLD) {
          const newCategoryScores: Record<string, number> = {};
          for (const cat of categories) newCategoryScores[cat.id] = cat.score;

          const prevScores = (lead.category_scores as Record<string, number>) ?? {};
          const categoryDiffs = Object.keys({ ...prevScores, ...newCategoryScores }).map((cat) => ({
            category: cat,
            previous: prevScores[cat] ?? 0,
            current: newCategoryScores[cat] ?? 0,
          }));

          const savedAuditUrl = `${APP_URL}/audit/saved/${lead.token}`;

          await sendLeadScoreChange({
            to: lead.email,
            appName: lead.app_name,
            previousScore: lead.score,
            newScore,
            categoryDiffs,
            savedAuditUrl,
          }).catch((e) => console.error(`[re-audit] Lead email failed for ${lead.email}:`, e));

          // Update lead with new score
          await supabaseAdmin
            .from("audit_leads")
            .update({
              score: newScore,
              category_scores: newCategoryScores,
              last_checked_at: new Date().toISOString(),
              notified_at: new Date().toISOString(),
            })
            .eq("id", lead.id);

          result.leads.alerted++;
        } else {
          // Just update last_checked_at
          await supabaseAdmin
            .from("audit_leads")
            .update({ last_checked_at: new Date().toISOString() })
            .eq("id", lead.id);
        }

        result.leads.processed++;
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        result.leads.errored++;
        console.error(`[re-audit] Lead re-audit failed for ${lead.email}:`, err);
      }
    }
  }

  return result;
}

interface ReAuditOptions {
  userId: string;
  savedAppId: string;
  storeId: string;
  platform: "ios" | "android";
  source: "manual" | "auto_public";
  competitorId?: string;
}

async function reAuditApp(opts: ReAuditOptions): Promise<void> {
  const { userId, savedAppId, storeId, platform, source, competitorId } = opts;

  const appData =
    platform === "ios"
      ? await fetchAppStoreData(storeId)
      : await fetchGooglePlayData(storeId);

  const categories = runAudit(appData);
  const overallScore = calculateOverallScore(categories);
  const categoryScores: Record<string, number> = {};
  for (const cat of categories) categoryScores[cat.id] = cat.score;

  await supabaseAdmin.from("audits").insert({
    user_id: userId,
    saved_app_id: savedAppId,
    platform,
    overall_score: overallScore,
    category_scores: categoryScores,
    action_plan: [],
    ai_powered: false,
    app_data: { title: appData.title, iconUrl: appData.iconUrl },
    source,
    competitor_id: competitorId ?? null,
  });
}
