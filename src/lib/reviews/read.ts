export type ImportedReview = { name: string; quote: string; stars?: number; date?: string };
export type ReviewSummary = { rating: number; count: number; label: string };

type Found = { reviews: ImportedReview[]; summary?: ReviewSummary };

export async function readReviewPages(urls: string[]): Promise<Found> {
  const reviews: ImportedReview[] = [];
  let summary: ReviewSummary | undefined;
  for (const url of urls) {
    const html = await fetchPage(url);
    if (!html) continue;
    const found = parseReviewHtml(html);
    reviews.push(...found.reviews);
    summary ??= found.summary;
  }
  const unique = reviews.filter((review, index) => reviews.findIndex((item) => item.name === review.name && item.quote === review.quote) === index);
  return { reviews: unique.slice(0, 12), summary };
}

async function fetchPage(url: string) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0", accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return "";
    return await response.text();
  } catch {
    return "";
  }
}

function parseReviewHtml(html: string): Found {
  const reviews: ImportedReview[] = [];
  let summary: ReviewSummary | undefined;
  const blocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of blocks) {
    const json = block.replace(/<\/?script[^>]*>/gi, "");
    try {
      collect(JSON.parse(json), reviews, (next) => { summary ??= next; });
    } catch {
      continue;
    }
  }
  return { reviews, summary };
}

function collect(value: unknown, reviews: ImportedReview[], setSummary: (summary: ReviewSummary) => void) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collect(item, reviews, setSummary);
    return;
  }
  const record = value as Record<string, unknown>;
  const type = String(record["@type"] ?? "");
  if (type === "Review" || type === "Critique") {
    const quote = text(record.reviewBody ?? record.description);
    const name = text(record.author && typeof record.author === "object" ? (record.author as { name?: unknown }).name : record.author);
    const stars = number((record.reviewRating as { ratingValue?: unknown } | undefined)?.ratingValue);
    const date = text(record.datePublished).slice(0, 40);
    if (quote && name) reviews.push({ name: name.slice(0, 80), quote: quote.slice(0, 600), stars: stars && stars >= 1 && stars <= 5 ? Math.round(stars) : undefined, date: date || undefined });
  }
  if (type === "AggregateRating") {
    const rating = number(record.ratingValue);
    const count = number(record.reviewCount ?? record.ratingCount);
    if (rating != null && count != null) setSummary({ rating, count: Math.round(count), label: "Google reviews" });
  }
  for (const child of Object.values(record)) collect(child, reviews, setSummary);
}

function text(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function number(value: unknown) {
  const parsed = Number(typeof value === "string" ? value : value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}
