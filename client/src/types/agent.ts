export interface Agent {
  id: number | string;
  snapshotId: number;
  mastodonUsername: string;
  score: number;
  prevScore?: number;
  prevRank?: number;
  prevTimestamp?: string; // When the previous data was captured
  avatarUrl?: string;
  city?: string;
  likesCount?: number;
  followersCount?: number;
  retweetsCount?: number;
  repliesCount?: number;
  rank: number;
  walletAddress?: string;
  walletBalance?: string;
  mastodonBio?: string;
  bioUpdatedAt?: string;
  ubiClaimedAt?: string;
  timestamp?: string; // Added for history/analytics purposes
  tweets?: Tweet[]; // Agent can include tweets directly from API
}

export interface AgentWithTweets extends Agent {
  tweets: Tweet[];
}

export interface Tweet {
  id: number;
  agentId: number;
  content: string;
  timestamp: string;
  likesCount: number;
  retweetsCount: number;
}

export interface Snapshot {
  id: number;
  timestamp: string;
  description?: string;
}

export interface SnapshotStats {
  totalAgents: number;
  avgScore: number;
  topGainers: Agent[];
  topLosers: Agent[];
}

export interface AgentFilters {
  search?: string;
  minScore?: number;
  maxScore?: number;
  city?: string;
  sortBy?: 'score' | 'score_asc' | 'followers' | 'likes' | 'retweets' | 'score_change';
  page?: number;
  limit?: number;
}
