import { type CommunityPost } from "../data/community-posts.js";

const SFW_BLOCKLIST = ["nsfw", "porn", "xxx", "nude", "naked", "sex", "adult content"];

function classifyType(title: string): CommunityPost["type"] {
  const t = title.toLowerCase();
  if (/error|issue|broken|fail|bug|not working/.test(t)) return "integration_pain";
  if (/feature|request|wish|would be nice|add support/.test(t)) return "feature_request";
  if (/how|help|\?/.test(t)) return "question";
  if (/tip|trick|guide|tutorial|how i|sharing/.test(t)) return "discussion";
  return "discussion";
}

export async function fetchRedditPosts(limit = 25): Promise<CommunityPost[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/search.json?q=workato&sort=new&limit=${limit}&t=week`,
      { headers: { "User-Agent": "workato-comm-voices/1.0 (community signal tool)" } },
    );

    if (!res.ok) return [];

    const json = (await res.json()) as any;
    const children = json?.data?.children ?? [];

    return children
      .map((c: any) => c.data)
      .filter((p: any) => {
        if (p.over_18) return false;
        if (p.author === "[deleted]") return false;
        if (p.selftext === "[removed]" || p.selftext === "[deleted]") return false;
        if ((p.score ?? 0) < -5) return false;
        const text = `${p.title} ${p.selftext ?? ""}`.toLowerCase();
        if (SFW_BLOCKLIST.some((w: string) => text.includes(w))) return false;
        return true;
      })
      .map(
        (p: any): CommunityPost => ({
          id: `reddit_${p.id}`,
          external_id: p.id,
          platform: "reddit",
          author: (p.author ?? "unknown").slice(0, 50),
          region: "unknown",
          content: p.title + (p.selftext ? " — " + (p.selftext as string).slice(0, 300) : ""),
          type: classifyType(p.title ?? ""),
          timestamp: new Date((p.created_utc ?? 0) * 1000).toISOString(),
          source: "live",
        }),
      );
  } catch (err) {
    console.error("Reddit fetch failed (non-blocking):", err);
    return [];
  }
}
