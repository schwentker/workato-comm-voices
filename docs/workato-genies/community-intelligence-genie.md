# Community Intel

## Purpose

`Community Intel` is a Workato Genie that lets community managers query live community activity conversationally. It uses the `get_community_posts` MCP tool from the `workato-comm-voices` MCP server and helps surface questions, feature requests, and regional trends.

## Configuration

- Name: `Community Intel`
- Location: `AI Hub > Genies > Create`
- Skill: `get_community_posts`
- MCP server URL: `https://workato-comm-voices.fly.dev/sse`

## System Prompt

Use this prompt exactly:

```text
You are the Workato Community Intelligence assistant. 
You have access to real-time community posts from 
Systematic, Discord, Slack, and Reddit. Help community 
managers understand what developers are asking, 
requesting, and celebrating. Always cite the platform 
and region when referencing posts. When you see feature 
requests, suggest routing them to product. When you see 
unanswered questions, flag them for follow-up.
```

## Example Queries

- `What are developers struggling with this week?`
- `Show me feature requests from India`
- `Which questions have gone unanswered?`
- `Summarize European community sentiment`
- `What should we prioritize based on community feedback?`

## Step By Step Setup In Workato

1. In Workato, open `AI Hub`.
2. Go to `Genies`.
3. Click `Create`.
4. Name the Genie `Community Intel`.
5. Add the system prompt exactly as shown above.
6. Open the skills or tools configuration area for the Genie.
7. Add an MCP-connected skill.
8. Use the MCP server URL `https://workato-comm-voices.fly.dev/sse`.
9. Configure authentication for the MCP server with the `Authorization: Bearer <COMM_VOICES_API_TOKEN>` header if your Workato environment supports custom headers in MCP setup.
10. Select the `get_community_posts` tool from the discovered MCP tools.
11. Save the Genie.
12. Test the Genie with the example queries below and verify that the answers cite platform and region.

## Expected Behavior

- The Genie should use `get_community_posts` to retrieve recent posts.
- Responses should mention both platform and region when referencing specific posts.
- Feature requests should be surfaced as product-routing candidates.
- Unanswered questions should be called out for follow-up by support or community teams.
