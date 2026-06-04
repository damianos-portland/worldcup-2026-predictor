// Apify transport — runs the free `azzouzana/sofascore-scraper-pro` actor, which
// scrapes Sofascore through its own anti-bot/proxies and returns parsed JSON
// ({ url, data: { event, incidents, ... } } per input URL). This is the
// production-safe path: it works from datacenter hosts (Render/Railway) where a
// direct Sofascore request is Cloudflare-blocked.
const TOKEN = process.env.APIFY_TOKEN;
const ACTOR = process.env.SOFA_ACTOR || "azzouzana~sofascore-scraper-pro";

export type ScrapeItem = { url?: string; data?: { event?: any; incidents?: any[] } };

/** Scrape a batch of Sofascore match URLs in a single synchronous actor run. */
export async function scrapeMatchUrls(urls: string[]): Promise<ScrapeItem[]> {
  if (!urls.length) return [];
  if (!TOKEN) throw new Error("APIFY_TOKEN is required when SOFA_TRANSPORT=apify");

  const endpoint = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${TOKEN}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startUrls: urls }),
  });
  if (!res.ok) {
    throw new Error(`Apify actor ${ACTOR} failed: HTTP ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as ScrapeItem[];
}
