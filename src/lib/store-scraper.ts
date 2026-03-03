import * as cheerio from "cheerio";
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
  };
}

// ============================================================
// GOOGLE PLAY STORE (scraping)
// ============================================================

export async function searchGooglePlay(query: string, country = "us"): Promise<SearchResult[]> {
  const url = `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps&hl=en&gl=${country}`;

  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!resp.ok) throw new Error(`Google Play search failed: ${resp.status}`);

    const html = await resp.text();
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    $("a[href*='/store/apps/details']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const idMatch = href.match(/id=([^&]+)/);
      if (!idMatch) return;

      const id = idMatch[1];
      if (results.some(r => r.id === id)) return;

      const parentCard = $(el).closest("div[class]");
      const name = parentCard.find("span.DdYX5").first().text().trim()
        || parentCard.find("[class*='title']").first().text().trim()
        || $(el).text().trim();
      const developer = parentCard.find("span.wMUdtb").first().text().trim()
        || parentCard.find("[class*='developer']").first().text().trim();
      const img = parentCard.find("img").first().attr("src") || "";
      const ratingText = parentCard.find("[aria-label*='star']").first().attr("aria-label") || "";
      const ratingMatch = ratingText.match(/([\d.]+)/);

      if (name && id) {
        results.push({
          id,
          name: name.substring(0, 80),
          developer: developer.substring(0, 80),
          icon: img,
          rating: ratingMatch ? parseFloat(ratingMatch[1]) : 0,
          platform: "android",
          url: `https://play.google.com/store/apps/details?id=${id}`,
        });
      }
    });

    return results.slice(0, 10);
  } catch (error) {
    console.error("Google Play search error:", error);
    return [];
  }
}

export async function fetchGooglePlayData(appId: string, country = "us"): Promise<AppData> {
  const url = `https://play.google.com/store/apps/details?id=${appId}&hl=en&gl=${country}`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!resp.ok) throw new Error(`Google Play fetch failed: ${resp.status}`);
  const html = await resp.text();
  const $ = cheerio.load(html);

  const title = $('h1[itemprop="name"]').text().trim()
    || $("h1").first().text().trim()
    || "";

  const descriptionEl = $('div[data-g-id="description"]').first();
  const description = descriptionEl.length
    ? descriptionEl.text().trim()
    : $('meta[name="description"]').attr("content") || "";

  const developerName = $('a[href*="/store/apps/developer"]').first().text().trim()
    || $('span:contains("Offered by")').next().text().trim()
    || "";

  const ratingText = $('div[itemprop="starRating"]').find('[aria-label*="star"]').attr("aria-label")
    || $('[class*="rating"] [aria-label]').first().attr("aria-label")
    || "";
  const ratingMatch = ratingText.match(/([\d.]+)/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

  const ratingsCountText = $('[class*="rating"] span:contains("review")').text()
    || $('span:contains("reviews")').first().text()
    || "";
  const ratingsCountMatch = ratingsCountText.replace(/[,.\s]/g, "").match(/(\d+)/);
  const ratingsCount = ratingsCountMatch ? parseInt(ratingsCountMatch[1]) : 0;

  const category = $('a[itemprop="genre"]').text().trim()
    || $('span:contains("Category")').next().text().trim()
    || "";

  const lastUpdatedText = $('div:contains("Updated on")').last().text()
    || "";
  const dateMatch = lastUpdatedText.match(/(\w+ \d+, \d{4})/);
  const lastUpdated = dateMatch ? dateMatch[1] : "";

  const screenshotImgs = $('img[srcset*="screenshot"], img[alt*="screenshot"], div[data-g-id="screenshots"] img');
  const screenshotCount = Math.max(screenshotImgs.length, 0);
  const screenshots: string[] = [];
  screenshotImgs.each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    if (src) screenshots.push(src);
  });

  const hasVideo = $('button[aria-label*="video"], div[data-trailer]').length > 0
    || html.includes("youtube.com/embed")
    || html.includes("play.google.com/video");

  const priceText = $('meta[itemprop="price"]').attr("content")
    || $('span:contains("$")').first().text()
    || "Free";

  const installsText = $('div:contains("Downloads")').last().text()
    || "";
  const installsMatch = installsText.match(/([\d,]+\+?)\s*downloads/i);

  const shortDescription = $('meta[name="description"]').attr("content") || "";

  return {
    platform: "android",
    title,
    shortDescription: shortDescription.substring(0, 80),
    description,
    developerName,
    category,
    rating,
    ratingsCount,
    version: "",
    lastUpdated,
    screenshotCount: screenshotCount || 3, // Google Play always has at least some
    hasVideo,
    price: priceText.includes("0") || priceText.toLowerCase().includes("free") ? "Free" : priceText,
    size: undefined,
    contentRating: undefined,
    installs: installsMatch ? installsMatch[1] : undefined,
    url,
    iconUrl: $('img[itemprop="image"]').attr("src") || "",
    screenshots,
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
