import { type CommunityPost } from "../data/community-posts.js";

const SYSTEMATIC_BOARD_URL =
  "https://systematic.workato.com/t5/workato-pros-discussion-board/bd-p/workato-pros-discussion";

interface ParsedFeedItem {
  id: string;
  author: string;
  title: string;
  publishedAt: string;
}

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function stripCdata(value: string): string {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function getTagValue(block: string, tagName: string): string | undefined {
  const match = block.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i"));
  if (!match?.[1]) return undefined;
  return decodeXmlEntities(stripCdata(match[1].trim()));
}

function parseRssFeed(xml: string, limit: number): ParsedFeedItem[] {
  const itemMatches = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0, limit);

  return itemMatches.map((match, index) => {
    const item = match[0];
    const title = getTagValue(item, "title") ?? "Untitled";
    const author = getTagValue(item, "author") ?? getTagValue(item, "dc:creator") ?? "unknown";
    const guid = getTagValue(item, "guid") ?? getTagValue(item, "link") ?? `systematic-${index}`;
    const publishedAt = getTagValue(item, "pubDate") ?? new Date(0).toISOString();

    return {
      id: guid,
      author,
      title,
      publishedAt: new Date(publishedAt).toISOString(),
    };
  });
}

function normalizeSystematicPosts(items: ParsedFeedItem[]): CommunityPost[] {
  return items.map((item) => ({
    id: item.id,
    platform: "systematic",
    author: item.author,
    region: "unknown",
    content: item.title,
    type: item.title.trim().endsWith("?") ? "question" : "announcement",
    timestamp: item.publishedAt,
  }));
}

async function tryFetch(url: string): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: {
        Accept: "application/json, application/rss+xml, application/xml, text/xml, text/html",
      },
    });
  } catch {
    return null;
  }
}

export async function fetchSystematicPosts(limit = 10): Promise<CommunityPost[]> {
  const candidates = [
    SYSTEMATIC_BOARD_URL,
    `${SYSTEMATIC_BOARD_URL}/rss/board?board.id=workato-pros-discussion`,
    `${SYSTEMATIC_BOARD_URL}/rss/message?board.id=workato-pros-discussion`,
  ];

  for (const url of candidates) {
    const response = await tryFetch(url);

    if (!response?.ok) {
      continue;
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { posts?: ParsedFeedItem[] };
      return normalizeSystematicPosts((payload.posts ?? []).slice(0, limit));
    }

    if (
      contentType.includes("application/rss+xml") ||
      contentType.includes("application/xml") ||
      contentType.includes("text/xml")
    ) {
      const xml = await response.text();
      return normalizeSystematicPosts(parseRssFeed(xml, limit));
    }

    if (contentType.includes("text/html")) {
      // Systematic requires auth - using synthetic data.
      return [];
    }
  }

  // Systematic requires auth - using synthetic data.
  return [];
}
