import { 
  agents, snapshots, tweets, type Agent, type InsertAgent, 
  type Snapshot, type InsertSnapshot, type Tweet, type InsertTweet,
  type LeaderboardEntry, type AgentDetails 
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // Snapshot operations
  createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot>;
  getSnapshots(): Promise<Snapshot[]>;
  getLatestSnapshot(): Promise<Snapshot | undefined>;
  getSnapshot(id: number): Promise<Snapshot | undefined>;
  
  // Agent operations
  createAgent(agent: InsertAgent): Promise<Agent>;
  getAgents(snapshotId: number, filters?: AgentFilters): Promise<Agent[]>;
  getLatestAgents(filters?: AgentFilters): Promise<Agent[]>;
  getAgent(snapshotId: number, mastodonUsername: string): Promise<Agent | undefined>;
  getAgentHistory(mastodonUsername: string): Promise<Agent[]>;
  
  // Tweet operations
  createTweet(tweet: InsertTweet): Promise<Tweet>;
  getTweets(agentId: number): Promise<Tweet[]>;
  
  // Stats operations
  getSnapshotStats(snapshotId: number): Promise<SnapshotStats>;
  
  // External data import
  importLeaderboardData(entries: LeaderboardEntry[], snapshotId: number): Promise<void>;
  importAgentDetails(username: string, details: AgentDetails, snapshotId: number): Promise<void>;
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

export interface SnapshotStats {
  totalAgents: number;
  avgScore: number;
  totalLikes: number;
  topGainers: Agent[];
  topLosers: Agent[];
}

export class MemStorage implements IStorage {
  private agentsData: Map<number, Agent>;
  private snapshotsData: Map<number, Snapshot>;
  private tweetsData: Map<number, Tweet>;
  private agentIdCounter: number;
  private snapshotIdCounter: number;
  private tweetIdCounter: number;

  constructor() {
    this.agentsData = new Map();
    this.snapshotsData = new Map();
    this.tweetsData = new Map();
    this.agentIdCounter = 1;
    this.snapshotIdCounter = 1;
    this.tweetIdCounter = 1;
  }

  async createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot> {
    const id = this.snapshotIdCounter++;
    const newSnapshot: Snapshot = {
      ...snapshot,
      id,
      timestamp: new Date(),
    };
    this.snapshotsData.set(id, newSnapshot);
    return newSnapshot;
  }

  async getSnapshots(): Promise<Snapshot[]> {
    return Array.from(this.snapshotsData.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getLatestSnapshot(): Promise<Snapshot | undefined> {
    const snapshots = await this.getSnapshots();
    return snapshots.length > 0 ? snapshots[0] : undefined;
  }

  async getSnapshot(id: number): Promise<Snapshot | undefined> {
    return this.snapshotsData.get(id);
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const id = this.agentIdCounter++;
    const newAgent: Agent = {
      ...agent,
      id,
    };
    this.agentsData.set(id, newAgent);
    return newAgent;
  }

  async getAgents(snapshotId: number, filters: AgentFilters = {}): Promise<Agent[]> {
    let result = Array.from(this.agentsData.values())
      .filter(agent => agent.snapshotId === snapshotId);
    
    // Apply search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(agent => 
        agent.mastodonUsername.toLowerCase().includes(search) || 
        (agent.city && agent.city.toLowerCase().includes(search))
      );
    }
    
    // Apply score range filter
    if (filters.minScore !== undefined) {
      result = result.filter(agent => agent.score >= (filters.minScore as number));
    }
    
    if (filters.maxScore !== undefined) {
      result = result.filter(agent => agent.score <= (filters.maxScore as number));
    }
    
    // Apply city filter
    if (filters.city) {
      result = result.filter(agent => agent.city === filters.city);
    }
    
    // Apply sorting
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'score':
          result.sort((a, b) => b.score - a.score);
          break;
        case 'score_asc':
          result.sort((a, b) => a.score - b.score);
          break;
        case 'followers':
          result.sort((a, b) => {
            const aFollowers = a.followersCount || 0;
            const bFollowers = b.followersCount || 0;
            return bFollowers - aFollowers;
          });
          break;
        case 'likes':
          result.sort((a, b) => {
            const aLikes = a.likesCount || 0;
            const bLikes = b.likesCount || 0;
            return bLikes - aLikes;
          });
          break;
        case 'retweets':
          result.sort((a, b) => {
            const aRetweets = a.retweetsCount || 0;
            const bRetweets = b.retweetsCount || 0;
            return bRetweets - aRetweets;
          });
          break;
        default:
          result.sort((a, b) => b.score - a.score);
      }
    } else {
      // Default sort by rank
      result.sort((a, b) => a.rank - b.rank);
    }
    
    // Apply pagination
    if (filters.page !== undefined && filters.limit !== undefined) {
      const startIndex = (filters.page - 1) * filters.limit;
      result = result.slice(startIndex, startIndex + filters.limit);
    }
    
    return result;
  }

  async getLatestAgents(filters: AgentFilters = {}): Promise<Agent[]> {
    const latestSnapshot = await this.getLatestSnapshot();
    if (!latestSnapshot) {
      return [];
    }
    return this.getAgents(latestSnapshot.id, filters);
  }

  async getAgent(snapshotId: number, mastodonUsername: string): Promise<Agent | undefined> {
    return Array.from(this.agentsData.values()).find(
      agent => agent.snapshotId === snapshotId && agent.mastodonUsername === mastodonUsername
    );
  }

  async getAgentHistory(mastodonUsername: string): Promise<Agent[]> {
    return Array.from(this.agentsData.values())
      .filter(agent => agent.mastodonUsername === mastodonUsername)
      .sort((a, b) => {
        const snapshotA = this.snapshotsData.get(a.snapshotId);
        const snapshotB = this.snapshotsData.get(b.snapshotId);
        if (!snapshotA || !snapshotB) return 0;
        return snapshotB.timestamp.getTime() - snapshotA.timestamp.getTime();
      });
  }

  async createTweet(tweet: InsertTweet): Promise<Tweet> {
    const id = this.tweetIdCounter++;
    const newTweet: Tweet = {
      ...tweet,
      id,
    };
    this.tweetsData.set(id, newTweet);
    return newTweet;
  }

  async getTweets(agentId: number): Promise<Tweet[]> {
    return Array.from(this.tweetsData.values())
      .filter(tweet => tweet.agentId === agentId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getSnapshotStats(snapshotId: number): Promise<SnapshotStats> {
    const agents = await this.getAgents(snapshotId);
    
    // Calculate total agents
    const totalAgents = agents.length;
    
    // Calculate average score
    const totalScore = agents.reduce((sum, agent) => sum + agent.score, 0);
    const avgScore = totalAgents > 0 ? Math.round(totalScore / totalAgents) : 0;
    
    // Calculate total likes
    const totalLikes = agents.reduce((sum, agent) => sum + (agent.likesCount || 0), 0);
    
    // Get top gainers (agents with largest score increase)
    const gainers = agents
      .filter(agent => agent.prevScore !== undefined && agent.score > agent.prevScore)
      .sort((a, b) => (b.score - (b.prevScore || 0)) - (a.score - (a.prevScore || 0)))
      .slice(0, 3);
    
    // Get top losers (agents with largest score decrease)
    const losers = agents
      .filter(agent => agent.prevScore !== undefined && agent.score < agent.prevScore)
      .sort((a, b) => ((a.prevScore || 0) - a.score) - ((b.prevScore || 0) - b.score))
      .slice(0, 3);
    
    return {
      totalAgents,
      avgScore,
      totalLikes,
      topGainers: gainers,
      topLosers: losers,
    };
  }

  async importLeaderboardData(entries: LeaderboardEntry[], snapshotId: number): Promise<void> {
    // Get existing agents from previous snapshot to calculate rank changes
    const previousSnapshot = await this.getPreviousSnapshot(snapshotId);
    let previousAgents: Agent[] = [];
    
    if (previousSnapshot) {
      previousAgents = await this.getAgents(previousSnapshot.id);
    }
    
    // Sort entries by score in descending order
    const sortedEntries = [...entries].sort((a, b) => b.score - a.score);
    
    // Create agents with rank information
    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      const rank = i + 1;
      
      // Find previous agent data if it exists
      const previousAgent = previousAgents.find(
        a => a.mastodonUsername === entry.mastodonUsername
      );
      
      // Create agent with previous rank and score
      await this.createAgent({
        snapshotId,
        mastodonUsername: entry.mastodonUsername,
        score: entry.score,
        prevScore: previousAgent?.score,
        avatarUrl: entry.avatarURL,
        city: entry.city,
        likesCount: entry.likesCount,
        followersCount: entry.followersCount,
        retweetsCount: entry.retweetsCount,
        rank,
        prevRank: previousAgent?.rank,
      });
    }
  }

  async importAgentDetails(username: string, details: AgentDetails, snapshotId: number): Promise<void> {
    // Find the agent in the current snapshot
    const agent = await this.getAgent(snapshotId, username);
    if (!agent) {
      return;
    }
    
    // Update agent with additional details
    const updatedAgent: Agent = {
      ...agent,
      walletAddress: details.walletAddress,
      walletBalance: details.walletBalance,
      mastodonBio: details.mastodonBio,
      repliesCount: details.repliesCount,
      bioUpdatedAt: details.bioUpdatedAt ? new Date(details.bioUpdatedAt) : undefined,
      ubiClaimedAt: details.ubiClaimedAt ? new Date(details.ubiClaimedAt) : undefined,
    };
    
    this.agentsData.set(agent.id, updatedAgent);
    
    // Import tweets if available
    if (details.tweets) {
      for (const tweetData of details.tweets) {
        await this.createTweet({
          agentId: agent.id,
          content: tweetData.content,
          timestamp: new Date(tweetData.timestamp),
          likesCount: tweetData.likesCount || 0,
          retweetsCount: tweetData.retweetsCount || 0,
        });
      }
    }
  }

  private async getPreviousSnapshot(currentSnapshotId: number): Promise<Snapshot | undefined> {
    const currentSnapshot = await this.getSnapshot(currentSnapshotId);
    if (!currentSnapshot) {
      return undefined;
    }
    
    const snapshots = await this.getSnapshots();
    const currentIndex = snapshots.findIndex(s => s.id === currentSnapshotId);
    
    if (currentIndex === -1 || currentIndex === snapshots.length - 1) {
      return undefined;
    }
    
    return snapshots[currentIndex + 1];
  }
}

export const storage = new MemStorage();
