import { type CommunityPost } from "../data/community-posts.js";

interface RedditListingChild {
  data: {
    id: string;
    author: string;
    title: string;
    created_utc: number;
  };
}

interface RedditListingResponse {
  data?: {
    children?: RedditListingChild[];
  };
}

export async function fetchRedditPosts(limit = 10): Promise<CommunityPost[]> {
  const response = await fetch(`https://www.reddit.com/r/workato/new.json?limit=${limit}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch Reddit posts: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as RedditListingResponse;
  const children = payload.data?.children ?? [];

  return children.map(({ data }) => ({
    id: data.id,
    platform: "reddit",
    author: data.author,
    region: "unknown",
    content: data.title,
    type: data.title.trim().endsWith("?") ? "question" : "announcement",
    timestamp: new Date(data.created_utc * 1000).toISOString(),
  }));
}
