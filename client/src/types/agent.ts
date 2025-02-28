export interface Agent {
  id: number;
  snapshotId: number;
  mastodonUsername: string;
  score: number;
  prevScore?: number;
  avatarUrl?: string;
  city?: string;
  likesCount?: number;
  followersCount?: number;
  retweetsCount?: number;
  repliesCount?: number;
  rank: number;
  prevRank?: number;
  walletAddress?: string;
  walletBalance?: string;
  mastodonBio?: string;
  bioUpdatedAt?: string;
  ubiClaimedAt?: string;
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
  totalLikes: number;
  topGainers: Agent[];
  topLosers: Agent[];
}

export interface AgentFilters {
  search?: string;
  minScore?: number;
  maxScore?: number;
  city?: string;
  sortBy?: 'score' | 'score_asc' | 'followers' | 'likes' | 'retweets';
  page?: number;
  limit?: number;
}
