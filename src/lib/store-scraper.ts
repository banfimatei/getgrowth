import * as cheerio from "cheerio";
import gplay from "google-play-scraper";
import type { AppData } from "./aso-rules";

interface SearchResult {
  id: string;
  name: string;
  developer: string;
  icon: string;
  rating: number;
  platform: "ios" | "android";
  url: string;
}

// ============================================================
// APPLE APP STORE (iTunes Lookup/Search API + scraping)
// ============================================================

export async function searchAppStore(query: string, country = "us"): Promise<SearchResult[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=${country}&entity=software&limit=10`;
  const resp = await fetch(url, { next: { revalidate: 300 } });
  if (!resp.ok) throw new Error(`App Store search failed: ${resp.status}`);

  const data = await resp.json();
  return (data.results || []).map((app: Record<string, unknown>) => ({
    id: String(app.trackId),
    name: String(app.trackName),
    developer: String(app.artistName),
    icon: String(app.artworkUrl100),
    rating: Number(app.averageUserRating || 0),
    platform: "ios" as const,
    url: String(app.trackViewUrl),
  }));
}

export async function fetchAppStoreData(appId: string, country = "us"): Promise<AppData> {
  const url = `https://itunes.apple.com/lookup?id=${appId}&country=${country}`;
  const resp = await fetch(url, { next: { revalidate: 300 } });
  if (!resp.ok) throw new Error(`App Store lookup failed: ${resp.status}`);

  const data = await resp.json();
  const app = data.results?.[0];
  if (!app) throw new Error("App not found");

  let subtitle = "";
  let promotionalText = "";
  let screenshotUrls: string[] = app.screenshotUrls || [];
  try {
    const storeUrl = app.trackViewUrl || `https://apps.apple.com/${country}/app/id${appId}`;
    const pageResp = await fetch(storeUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (pageResp.ok) {
      const html = await pageResp.text();
      const $ = cheerio.load(html);
      const subtitleEl = $("h2.subtitle").text().trim()
        || $(".product-header__subtitle").text().trim()
        || $(".app-header__subtitle").text().trim();
      if (subtitleEl) subtitle = subtitleEl;

      const promoEl = $('[data-test-id="promotional-text"]').text().trim()
        || $(".section--promotional-text p").text().trim();
      if (promoEl) promotionalText = promoEl;
    }
  } catch {
    // Scraping is best-effort; API data is primary
  }

  return {
    platform: "ios",
    title: app.trackName || "",
    subtitle: subtitle || app.subtitle || "",
    description: app.description || "",
    developerName: app.artistName || "",
    category: app.primaryGenreName || "",
    rating: app.averageUserRating || 0,
    ratingsCount: app.userRatingCount || 0,
    version: app.version || "",
    lastUpdated: app.currentVersionReleaseDate || app.releaseDate || "",
    screenshotCount: screenshotUrls.length,
    hasVideo: (app.previewUrls || []).length > 0 || false,
    price: app.formattedPrice || "Free",
    size: app.fileSizeBytes ? `${Math.round(Number(app.fileSizeBytes) / 1048576)} MB` : undefined,
    contentRating: app.contentAdvisoryRating || "",
    url: app.trackViewUrl || "",
    iconUrl: app.artworkUrl512 || app.artworkUrl100 || "",
    screenshots: screenshotUrls,
    promotionalText: promotionalText || undefined,
    whatsNew: app.releaseNotes || undefined,
  };
}

// ============================================================
// GOOGLE PLAY STORE (google-play-scraper package)
// ============================================================

export async function searchGooglePlay(query: string, country = "us"): Promise<SearchResult[]> {
  try {
    const apps = await gplay.search({
      term: query,
      num: 10,
      lang: "en",
      country,
    });

    return apps.map((app) => ({
      id: app.appId,
      name: app.title.substring(0, 80),
      developer: (app.developer || "").substring(0, 80),
      icon: app.icon || "",
      rating: app.score || 0,
      platform: "android" as const,
      url: app.url,
    }));
  } catch (error) {
    console.error("Google Play search error:", error);
    return [];
  }
}

export async function fetchGooglePlayData(appId: string, country = "us"): Promise<AppData> {
  const app = await gplay.app({ appId, lang: "en", country });

  const updatedDate = app.updated
    ? new Date(app.updated).toISOString()
    : "";

  return {
    platform: "android",
    title: app.title || "",
    shortDescription: (app.summary || "").substring(0, 80),
    description: app.description || "",
    developerName: app.developer || "",
    category: app.genre || "",
    rating: app.score || 0,
    ratingsCount: app.ratings || 0,
    version: app.version || "",
    lastUpdated: updatedDate,
    screenshotCount: (app.screenshots || []).length || 3,
    hasVideo: !!app.video,
    price: app.free ? "Free" : (app.priceText || "Paid"),
    size: app.size || undefined,
    contentRating: app.contentRating || undefined,
    installs: app.installs || undefined,
    url: app.url || `https://play.google.com/store/apps/details?id=${appId}`,
    iconUrl: app.icon || "",
    screenshots: app.screenshots || [],
    whatsNew: app.recentChanges || undefined,
  };
}

export async function searchBothStores(query: string, country = "us"): Promise<SearchResult[]> {
  const [iosResults, androidResults] = await Promise.allSettled([
    searchAppStore(query, country),
    searchGooglePlay(query, country),
  ]);

  const results: SearchResult[] = [];
  if (iosResults.status === "fulfilled") results.push(...iosResults.value);
  if (androidResults.status === "fulfilled") results.push(...androidResults.value);
  return results;
}
