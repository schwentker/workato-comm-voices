import { type CommunityPost } from "../data/community-posts.js";
import { persistPost } from "../db/neon.js";

interface RedditListingChild {
  data: {
    id: string;
    author: string;
    title: string;
    selftext?: string;
    created_utc: number;
  };
}

interface RedditListingResponse {
  data?: {
    children?: RedditListingChild[];
  };
}

export async function fetchRedditPosts(limit = 10): Promise<CommunityPost[]> {
  try {
    const response = await fetch(
      `https://www.reddit.com/r/workato/new.json?limit=${limit}`,
      { headers: { "User-Agent": "workato-community-mcp/1.0" } }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Reddit posts: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as RedditListingResponse;
    const children = payload.data?.children ?? [];

    const posts: CommunityPost[] = children.map(({ data }) => ({
      id: `reddit_${data.id}`,
      platform: "reddit",
      author: data.author,
      region: "unknown",
      content: data.title + (data.selftext ? ` ${data.selftext.slice(0, 200)}` : ""),
      type: data.title.endsWith("?") ? "question" : "announcement",
      timestamp: new Date(data.created_utc * 1000).toISOString(),
    }));

    await Promise.all(
      posts.map((post) =>
        persistPost(post).catch((error) => {
          console.error(`[reddit] Failed to persist post ${post.id}`, error);
        })
      )
    );

    return posts;
  } catch (error) {
    console.error("[reddit] Failed to fetch Reddit posts", error);
    return [];
  }
}
