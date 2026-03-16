export const COMMUNITY_PLATFORMS = ["systematic", "discord", "reddit", "all"] as const;
export const COMMUNITY_REGIONS = ["india", "europe", "us", "japan", "brazil", "unknown", "all"] as const;
export const COMMUNITY_TYPES = ["question", "feature_request", "announcement", "all"] as const;

export type CommunityPlatform = Exclude<(typeof COMMUNITY_PLATFORMS)[number], "all">;
export type CommunityRegion = Exclude<(typeof COMMUNITY_REGIONS)[number], "all">;
export type CommunityPostType = Exclude<(typeof COMMUNITY_TYPES)[number], "all">;

export interface CommunityPost {
  id: string;
  platform: CommunityPlatform;
  author: string;
  region: CommunityRegion;
  content: string;
  type: CommunityPostType;
  timestamp: string;
}

export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: "p001",
    platform: "systematic",
    author: "Priya Sharma",
    region: "india",
    content: "Getting 502 errors connecting to Salesforce after the update. Anyone else?",
    type: "question",
    timestamp: "2026-03-14T08:23:00Z",
  },
  {
    id: "p002",
    platform: "discord",
    author: "Lars Eriksson",
    region: "europe",
    content: "Would love a native Teams connector supporting adaptive cards.",
    type: "feature_request",
    timestamp: "2026-03-14T07:45:00Z",
  },
  {
    id: "p003",
    platform: "systematic",
    author: "Marcus Johnson",
    region: "us",
    content: "Just automated invoice approvals end to end. 40 hours saved.",
    type: "announcement",
    timestamp: "2026-03-13T18:00:00Z",
  },
  {
    id: "p004",
    platform: "discord",
    author: "Kenji Tanaka",
    region: "japan",
    content: "Built a Workday to SAP sync recipe in under 2 hours using AI copilot.",
    type: "announcement",
    timestamp: "2026-03-13T23:10:00Z",
  },
  {
    id: "p005",
    platform: "systematic",
    author: "Ana Souza",
    region: "brazil",
    content: "Is there a way to loop through CSV and trigger sub-recipes per row?",
    type: "question",
    timestamp: "2026-03-13T21:30:00Z",
  },
  {
    id: "p006",
    platform: "discord",
    author: "Divya Nair",
    region: "india",
    content: "Request: bulk recipe export across workspaces would save our team hours.",
    type: "feature_request",
    timestamp: "2026-03-13T18:00:00Z",
  },
  {
    id: "p007",
    platform: "systematic",
    author: "Sophie Bernard",
    region: "europe",
    content: "Anyone integrated Workato with Mistral AI yet? Looking for examples.",
    type: "question",
    timestamp: "2026-03-13T11:05:00Z",
  },
  {
    id: "p008",
    platform: "discord",
    author: "Taro Yamamoto",
    region: "japan",
    content: "Genie Studio needs better error messaging when skills fail.",
    type: "feature_request",
    timestamp: "2026-03-13T09:30:00Z",
  },
  {
    id: "p009",
    platform: "systematic",
    author: "Carlos Lima",
    region: "brazil",
    content: "Step by step: connecting legacy ERP to Workato using the HTTP connector.",
    type: "announcement",
    timestamp: "2026-03-12T20:15:00Z",
  },
  {
    id: "p010",
    platform: "discord",
    author: "Sarah Chen",
    region: "us",
    content: "Best practices for handling API rate limits inside a recipe loop?",
    type: "question",
    timestamp: "2026-03-12T17:40:00Z",
  },
  {
    id: "p011",
    platform: "systematic",
    author: "Rahul Verma",
    region: "india",
    content: "Need a way to test recipes with mock data without consuming real API calls.",
    type: "feature_request",
    timestamp: "2026-03-12T12:00:00Z",
  },
  {
    id: "p012",
    platform: "discord",
    author: "Emma Wilson",
    region: "us",
    content: "Just passed Workato certification. The recipe debugging tools are underrated.",
    type: "announcement",
    timestamp: "2026-03-12T09:20:00Z",
  },
  {
    id: "p013",
    platform: "systematic",
    author: "David Park",
    region: "us",
    content: "How do I pass dynamic parameters between parent and callable recipes?",
    type: "question",
    timestamp: "2026-03-11T22:10:00Z",
  },
  {
    id: "p014",
    platform: "discord",
    author: "Giulia Romano",
    region: "europe",
    content: "Would love a recipe marketplace where community can share certified templates.",
    type: "feature_request",
    timestamp: "2026-03-11T16:45:00Z",
  },
  {
    id: "p015",
    platform: "systematic",
    author: "Michael Torres",
    region: "us",
    content: "Our Workato + Netsuite integration just went live after 3 weeks. Happy to answer questions.",
    type: "announcement",
    timestamp: "2026-03-11T14:00:00Z",
  },
];
