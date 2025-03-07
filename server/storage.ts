import { 
  agents, snapshots, tweets, type Agent, type InsertAgent, 
  type Snapshot, type InsertSnapshot, type Tweet, type InsertTweet,
  type LeaderboardEntry, type AgentDetails 
} from "@shared/schema";
import { db } from './db';
import { eq, desc, asc, and, like, or, gte, lte, sql, isNull } from 'drizzle-orm';

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // Snapshot operations
  createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot>;
  getSnapshots(): Promise<Snapshot[]>;
  getLatestSnapshot(): Promise<Snapshot | undefined>;
  getSnapshot(id: number): Promise<Snapshot | undefined>;
  deleteSnapshot(id: number): Promise<boolean>;
  
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
  sortBy?: 'score' | 'score_asc' | 'followers' | 'likes' | 'retweets' | 'score_change';
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
  
  async deleteSnapshot(id: number): Promise<boolean> {
    // Get all agents for this snapshot
    const agents = await this.getAgents(id);
    
    // Delete all agents for this snapshot
    for (const agent of agents) {
      this.agentsData.delete(agent.id);
    }
    
    // Delete the snapshot
    return this.snapshotsData.delete(id);
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
        case 'score_change':
          result.sort((a, b) => {
            const changeA = a.prevScore !== undefined ? a.score - a.prevScore : 0;
            const changeB = b.prevScore !== undefined ? b.score - b.prevScore : 0;
            return changeB - changeA; // High to low
          });
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
    
    // Apply pagination if limit > 0 (otherwise return all results)
    if (filters.page !== undefined && filters.limit !== undefined && filters.limit > 0) {
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
    // Get all agents for this username
    const agents = Array.from(this.agentsData.values())
      .filter(agent => agent.mastodonUsername === mastodonUsername);

    // Map to add the snapshot timestamp to each agent
    return agents.map(agent => {
      const snapshot = this.snapshotsData.get(agent.snapshotId);
      return {
        ...agent,
        timestamp: snapshot ? snapshot.timestamp.toISOString() : new Date().toISOString()
      };
    }).sort((a, b) => {
      // Sort by timestamp (newest first)
      const timestampA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timestampB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timestampB - timestampA;
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

// Database implementation of the storage interface

export class DatabaseStorage implements IStorage {
  async createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot> {
    const [newSnapshot] = await db
      .insert(snapshots)
      .values({
        description: snapshot.description || null
      })
      .returning();
    
    return newSnapshot;
  }

  async getSnapshots(): Promise<Snapshot[]> {
    return db
      .select()
      .from(snapshots)
      .orderBy(desc(snapshots.timestamp));
  }

  async getLatestSnapshot(): Promise<Snapshot | undefined> {
    const [snapshot] = await db
      .select()
      .from(snapshots)
      .orderBy(desc(snapshots.timestamp))
      .limit(1);
    
    return snapshot;
  }

  async getSnapshot(id: number): Promise<Snapshot | undefined> {
    const [snapshot] = await db
      .select()
      .from(snapshots)
      .where(eq(snapshots.id, id));
    
    return snapshot;
  }

  async deleteSnapshot(id: number): Promise<boolean> {
    try {
      // First, delete all agents associated with this snapshot
      await db
        .delete(agents)
        .where(eq(agents.snapshotId, id));
      
      // Then delete the snapshot itself
      const result = await db
        .delete(snapshots)
        .where(eq(snapshots.id, id));
      
      return true;
    } catch (error) {
      console.error("Error deleting snapshot:", error);
      return false;
    }
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const [newAgent] = await db
      .insert(agents)
      .values({
        ...agent,
        prevScore: agent.prevScore || null,
        avatarUrl: agent.avatarUrl || null,
        city: agent.city || null,
        likesCount: agent.likesCount || null,
        followersCount: agent.followersCount || null,
        retweetsCount: agent.retweetsCount || null,
        repliesCount: agent.repliesCount || null,
        prevRank: agent.prevRank || null,
        walletAddress: agent.walletAddress || null,
        walletBalance: agent.walletBalance || null,
        mastodonBio: agent.mastodonBio || null,
        bioUpdatedAt: agent.bioUpdatedAt || null,
        ubiClaimedAt: agent.ubiClaimedAt || null
      })
      .returning();
    
    return newAgent;
  }

  async getAgents(snapshotId: number, filters: AgentFilters = {}): Promise<Agent[]> {
    // Base query
    let queryBuilder = db.select().from(agents).where(eq(agents.snapshotId, snapshotId));
    
    // Apply search filter
    if (filters.search) {
      const search = `%${filters.search.toLowerCase()}%`;
      queryBuilder = queryBuilder.where(
        or(
          like(sql`LOWER(${agents.mastodonUsername})`, search),
          like(sql`LOWER(${agents.city})`, search)
        )
      );
    }
    
    // Apply score range filter
    if (filters.minScore !== undefined) {
      queryBuilder = queryBuilder.where(gte(agents.score, filters.minScore));
    }
    
    if (filters.maxScore !== undefined) {
      queryBuilder = queryBuilder.where(lte(agents.score, filters.maxScore));
    }
    
    // Apply city filter
    if (filters.city) {
      queryBuilder = queryBuilder.where(eq(agents.city, filters.city));
    }
    
    // Apply sorting
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'score':
          queryBuilder = queryBuilder.orderBy(desc(agents.score));
          break;
        case 'score_asc':
          queryBuilder = queryBuilder.orderBy(asc(agents.score));
          break;
        case 'score_change':
          // For score_change, we need to post-process the results since 
          // we can't express this complex calculation in SQL easily
          // We'll fetch all agents and sort them in memory
          const allAgents = await queryBuilder;
          return allAgents
            .filter(agent => agent.prevScore !== null) // Only agents with previous scores
            .sort((a, b) => {
              const changeA = a.prevScore !== null ? a.score - a.prevScore : 0;
              const changeB = b.prevScore !== null ? b.score - b.prevScore : 0;
              return changeB - changeA; // High to low
            })
            .slice(
              filters.page && filters.limit ? (filters.page - 1) * filters.limit : 0,
              filters.page && filters.limit ? (filters.page - 1) * filters.limit + filters.limit : undefined
            );
        case 'followers':
          queryBuilder = queryBuilder.orderBy(desc(agents.followersCount));
          break;
        case 'likes':
          queryBuilder = queryBuilder.orderBy(desc(agents.likesCount));
          break;
        case 'retweets':
          queryBuilder = queryBuilder.orderBy(desc(agents.retweetsCount));
          break;
        default:
          queryBuilder = queryBuilder.orderBy(asc(agents.rank));
      }
    } else {
      // Default sort by rank
      queryBuilder = queryBuilder.orderBy(asc(agents.rank));
    }
    
    // Apply pagination if limit > 0 (otherwise return all results)
    if (filters.page !== undefined && filters.limit !== undefined && filters.limit > 0) {
      const offset = (filters.page - 1) * filters.limit;
      queryBuilder = queryBuilder.limit(filters.limit).offset(offset);
    }
    
    // Execute and return agents
    return await queryBuilder;
  }

  async getLatestAgents(filters: AgentFilters = {}): Promise<Agent[]> {
    const latestSnapshot = await this.getLatestSnapshot();
    if (!latestSnapshot) {
      return [];
    }
    return this.getAgents(latestSnapshot.id, filters);
  }

  async getAgent(snapshotId: number, mastodonUsername: string): Promise<Agent | undefined> {
    const [agent] = await db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.snapshotId, snapshotId),
          eq(agents.mastodonUsername, mastodonUsername)
        )
      );
    
    return agent;
  }

  async getAgentHistory(mastodonUsername: string): Promise<Agent[]> {
    // Get all snapshots ordered by timestamp desc (newest first)
    const snapshotsList = await this.getSnapshots();
    
    // Sort snapshots chronologically (newest first)
    snapshotsList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Get agent records for each snapshot
    const results: Agent[] = [];
    
    for (const snapshot of snapshotsList) {
      const agent = await this.getAgent(snapshot.id, mastodonUsername);
      if (agent) {
        // Add timestamp from snapshot to agent for better display
        results.push({
          ...agent,
          timestamp: snapshot.timestamp.toISOString() // Add ISO string timestamp
        });
      }
    }
    
    return results;
  }

  async createTweet(tweet: InsertTweet): Promise<Tweet> {
    const [newTweet] = await db
      .insert(tweets)
      .values(tweet)
      .returning();
    
    return newTweet;
  }

  async getTweets(agentId: number): Promise<Tweet[]> {
    return db
      .select()
      .from(tweets)
      .where(eq(tweets.agentId, agentId))
      .orderBy(desc(tweets.timestamp));
  }

  async getSnapshotStats(snapshotId: number): Promise<SnapshotStats> {
    // Get all agents for this snapshot
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
      .filter(agent => agent.prevScore !== null && agent.score > agent.prevScore)
      .sort((a, b) => (b.score - (b.prevScore || 0)) - (a.score - (a.prevScore || 0)))
      .slice(0, 3);
    
    // Get top losers (agents with largest score decrease)
    const losers = agents
      .filter(agent => agent.prevScore !== null && agent.score < agent.prevScore)
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
        prevScore: previousAgent?.prevScore || null,
        avatarUrl: entry.avatarURL || null,
        city: entry.city || null,
        likesCount: entry.likesCount || null,
        followersCount: entry.followersCount || null,
        retweetsCount: entry.retweetsCount || null,
        rank,
        prevRank: previousAgent?.rank || null,
      });
    }
  }

  async importAgentDetails(username: string, details: AgentDetails, snapshotId: number): Promise<void> {
    // Find the agent in the current snapshot
    const agent = await this.getAgent(snapshotId, username);
    if (!agent) {
      return;
    }
    
    // Helper function to safely parse dates
    const safeDate = (dateString: string | undefined) => {
      if (!dateString) return null;
      try {
        // Validate if the string can be parsed to a valid date
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          return null;
        }
        return date;
      } catch (e) {
        console.error(`Invalid date value: ${dateString}`);
        return null;
      }
    };
    
    // Update agent with additional details
    await db
      .update(agents)
      .set({
        walletAddress: details.walletAddress || null,
        walletBalance: details.walletBalance || null,
        mastodonBio: details.mastodonBio || null,
        repliesCount: details.repliesCount || null,
        bioUpdatedAt: safeDate(details.bioUpdatedAt),
        ubiClaimedAt: safeDate(details.ubiClaimedAt),
      })
      .where(eq(agents.id, agent.id));
    
    // Import tweets if available
    if (details.tweets) {
      for (const tweetData of details.tweets) {
        try {
          // Validate tweet timestamp
          const timestamp = safeDate(tweetData.timestamp);
          if (timestamp) {
            await this.createTweet({
              agentId: agent.id,
              content: tweetData.content,
              timestamp,
              likesCount: tweetData.likesCount || 0,
              retweetsCount: tweetData.retweetsCount || 0,
            });
          }
        } catch (e) {
          console.error(`Error importing tweet: ${e.message}`);
          // Continue with other tweets
        }
      }
    }
  }

  private async getPreviousSnapshot(currentSnapshotId: number): Promise<Snapshot | undefined> {
    const currentSnapshot = await this.getSnapshot(currentSnapshotId);
    if (!currentSnapshot) {
      return undefined;
    }
    
    // Get the snapshot created before the current one
    const [previousSnapshot] = await db
      .select()
      .from(snapshots)
      .where(sql`${snapshots.timestamp} < ${currentSnapshot.timestamp}`)
      .orderBy(desc(snapshots.timestamp))
      .limit(1);
    
    return previousSnapshot;
  }
}

// Replace the memory storage with database storage
export const storage = new DatabaseStorage();
