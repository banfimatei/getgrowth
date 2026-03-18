/**
 * Keyword rank scanner — runs as part of the daily cron job.
 * Loads all active keyword_tracks and captures a daily rank snapshot
 * using the public iTunes Search API (iOS only).
 */

import { supabaseAdmin } from "./supabase";
import {
  searchiTunes,
  estimatePopularity,
  calculateDifficulty,
  estimateDownloads,
  findAppRank,
} from "./keyword-intelligence";

interface ScanResult {
  tracked: number;
  snapshotted: number;
  errors: number;
  skipped: number; // Android apps — keyword tracking is iOS only
}

export interface RankAlert {
  userId: string;
  appName: string;
  keyword: string;
  country: string;
  previousRank: number | null;
  currentRank: number | null;
  delta: number; // positive = improved (rank number decreased)
}

const RANK_ALERT_THRESHOLD = 5; // positions

/**
 * Scan all active keyword tracks and write today's rank snapshot.
 * Returns ScanResult + alerts for rank moves >= threshold.
 * Called by the daily cron job after metrics sync.
 */
export async function scanAllTrackedKeywords(): Promise<ScanResult & { alerts: RankAlert[] }> {
  const today = new Date().toISOString().split("T")[0];
  const result: ScanResult & { alerts: RankAlert[] } = {
    tracked: 0, snapshotted: 0, errors: 0, skipped: 0, alerts: [],
  };

  // Load all active tracks — join saved_apps to know the platform, name, and user
  const { data: tracks } = await supabaseAdmin
    .from("keyword_tracks")
    .select("id, keyword, country, track_id, user_id, saved_apps(platform, name)")
    .eq("is_active", true);

  if (!tracks?.length) return result;
  result.tracked = tracks.length;

  // Fetch yesterday's ranks for delta comparison
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const trackIds = tracks.map((t) => t.id);
  const { data: yesterdayRanks } = await supabaseAdmin
    .from("keyword_rank_history")
    .select("keyword_track_id, rank")
    .in("keyword_track_id", trackIds)
    .eq("date", yesterdayStr);
  const prevRankMap: Record<string, number | null> = {};
  for (const r of yesterdayRanks ?? []) {
    prevRankMap[r.keyword_track_id] = r.rank;
  }

  // Process sequentially with a small delay to respect iTunes API rate limits
  for (const track of tracks) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const platform = (track.saved_apps as any)?.platform;
    if (platform === "android") {
      result.skipped++;
      continue;
    }

    try {
      // Search iTunes to get top results
      const competitors = await searchiTunes(track.keyword, track.country, 25);

      // Popularity + difficulty from search results
      const popularity = estimatePopularity(competitors, track.keyword) ?? 5;
      const { score: difficulty } = calculateDifficulty(competitors, track.keyword);
      const downloads = estimateDownloads(popularity, track.country);
      const opportunity = Math.round((popularity * (100 - difficulty)) / 100);

      // Rank: check top-25 first, then expand to top-200 if not found
      // track_id is stored as bigint in DB but arrives as JS number at runtime
      let rank: number | null = null;
      const numericTrackId = track.track_id ? Number(track.track_id) : null;
      if (numericTrackId) {
        const idx = competitors.findIndex((c) => c.trackId === numericTrackId);
        if (idx >= 0) {
          rank = idx + 1;
        } else {
          rank = await findAppRank(track.keyword, numericTrackId, track.country);
        }
      }

      await supabaseAdmin
        .from("keyword_rank_history")
        .upsert(
          {
            keyword_track_id: track.id,
            date: today,
            rank,
            popularity: Math.round(popularity),
            difficulty: Math.round(difficulty),
            daily_searches: Math.round(downloads.dailySearches),
            opportunity,
          },
          { onConflict: "keyword_track_id,date" }
        );

      result.snapshotted++;

      // Detect significant rank change for alert
      const prevRank = prevRankMap[track.id] ?? null;
      if (rank !== null && prevRank !== null) {
        const delta = prevRank - rank; // positive = improved
        if (Math.abs(delta) >= RANK_ALERT_THRESHOLD) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const appName = (track.saved_apps as any)?.name ?? "Your app";
          result.alerts.push({
            userId: track.user_id,
            appName,
            keyword: track.keyword,
            country: track.country,
            previousRank: prevRank,
            currentRank: rank,
            delta,
          });
        }
      }

      // ~1 req/sec to avoid hammering iTunes API
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.error(`[keyword-scanner] Failed for "${track.keyword}" (${track.id}):`, err);
      result.errors++;
    }
  }

  return result;
}
