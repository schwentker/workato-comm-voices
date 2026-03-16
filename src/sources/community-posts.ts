import {
  COMMUNITY_POSTS,
  type CommunityPlatform,
  type CommunityPost,
  type CommunityPostType,
  type CommunityRegion,
} from "../data/community-posts.js";
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

const SYNTHETIC_REDDIT_POSTS: CommunityPost[] = [
  {
    id: "r001",
    platform: "reddit",
    author: "workflow_builder42",
    region: "unknown",
    content: "Anyone using Workato with Reddit lead intake workflows?",
    type: "question",
    timestamp: "2026-03-14T05:10:00Z",
  },
  {
    id: "r002",
    platform: "reddit",
    author: "ops_automator",
    region: "unknown",
    content: "Shared our first Workato deployment checklist with the team",
    type: "announcement",
    timestamp: "2026-03-13T15:45:00Z",
  },
];

function withSource(posts: CommunityPost[], source: string): CommunityPostResult[] {
  return posts.map((post) => ({ ...post, source }));
}

export async function getCommunityPosts({
  platform = "all",
  region = "all",
  type = "all",
  limit,
}: CommunityPostFilters = {}): Promise<CommunityPostResult[]> {
  const [redditPosts, systematicPosts] = await Promise.all([
    fetchRedditPosts().catch(() => SYNTHETIC_REDDIT_POSTS),
    fetchSystematicPosts().catch(() => []),
  ]);

  const mergedPosts = [
    ...withSource(COMMUNITY_POSTS, "synthetic"),
    ...withSource(redditPosts, redditPosts === SYNTHETIC_REDDIT_POSTS ? "synthetic" : "reddit"),
    ...withSource(systematicPosts, "systematic"),
  ]
    .filter((post) => {
      const platformMatches = platform === "all" || post.platform === platform;
      const regionMatches = region === "all" || post.region === region;
      const typeMatches = type === "all" || post.type === type;
      return platformMatches && regionMatches && typeMatches;
    })
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

  if (limit && limit > 0) {
    return mergedPosts.slice(0, limit);
  }

  return mergedPosts;
}
