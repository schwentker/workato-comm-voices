import {
  COMMUNITY_POSTS,
  type CommunityPlatform,
  type CommunityPost,
  type CommunityPostType,
  type CommunityRegion,
} from "../data/community-posts.js";
import { getNeonClient } from "../db/neon.js";
import { fetchRedditPosts } from "./reddit.js";
import { fetchSystematicPosts } from "./systematic.js";

export interface CommunityPostResult extends CommunityPost {
  source: string;
}

export interface CommunityPostFilters {
  platform?: CommunityPlatform | "all";
  region?: CommunityRegion | "all";
  type?: CommunityPostType | "all";
  limit?: number;
}

function withSource(posts: CommunityPost[], source: string): CommunityPostResult[] {
  return posts.map((post) => ({ ...post, source: post.source ?? source }));
}

async function fetchDbPosts(platform: string, limit: number): Promise<CommunityPost[]> {
  try {
    const db = getNeonClient();
    const rows = await db<{ id: string; platform: string; author: string; region: string; content: string; type: string; timestamp: Date; source: string }[]>`
      SELECT id, platform, author, region, content, type, timestamp, source
      FROM posts
      WHERE ${platform === "all" ? db`TRUE` : db`platform = ${platform}`}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      id: r.id,
      external_id: r.id,
      platform: r.platform as CommunityPlatform,
      author: r.author,
      region: (r.region ?? "unknown") as CommunityRegion,
      content: r.content,
      type: (r.type ?? "discussion") as CommunityPostType,
      timestamp: new Date(r.timestamp).toISOString(),
      source: r.source ?? "db",
    }));
  } catch (err) {
    console.error("[community-posts] DB fallback failed:", err);
    return [];
  }
}

export async function getCommunityPosts({
  platform = "all",
  region = "all",
  type = "all",
  limit,
}: CommunityPostFilters = {}): Promise<CommunityPostResult[]> {
  if (platform === "reddit") {
    let posts = await fetchRedditPosts(limit ?? 25);
    if (posts.length === 0) {
      posts = await fetchDbPosts("reddit", limit ?? 25);
    }
    return withSource(posts, "live");
  }

  const [redditPosts, systematicPosts] = await Promise.all([
    platform === "all" ? fetchRedditPosts(10).then((p) => p.length > 0 ? p : fetchDbPosts("reddit", 10)) : Promise.resolve([]),
    fetchSystematicPosts().catch(() => []),
  ]);

  const mergedPosts = [
    ...withSource(COMMUNITY_POSTS, "synthetic"),
    ...withSource(redditPosts, "reddit_live"),
    ...withSource(systematicPosts, "systematic"),
  ]
    .filter((post) => {
      const platformMatches = platform === "all" || post.platform === platform;
      const regionMatches = region === "all" || post.region === region;
      const typeMatches = type === "all" || post.type === type;
      return platformMatches && regionMatches && typeMatches;
    })
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

  const effectiveLimit = limit && limit > 0 ? limit : (platform === "all" ? 50 : undefined);
  if (effectiveLimit) {
    return mergedPosts.slice(0, effectiveLimit);
  }

  return mergedPosts;
}
