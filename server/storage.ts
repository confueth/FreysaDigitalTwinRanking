import { 
  agents, snapshots, tweets, users, type Agent, type InsertAgent, 
  type Snapshot, type InsertSnapshot, type Tweet, type InsertTweet,
  type LeaderboardEntry, type AgentDetails, type User, type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User operations
  createUser(insertUser: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  verifyAdminCredentials(username: string, password: string): Promise<boolean>;
  
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
  private usersData: Map<number, User>;
  private agentIdCounter: number;
  private snapshotIdCounter: number;
  private tweetIdCounter: number;
  private userIdCounter: number;

  constructor() {
    this.agentsData = new Map();
    this.snapshotsData = new Map();
    this.tweetsData = new Map();
    this.usersData = new Map();
    this.agentIdCounter = 1;
    this.snapshotIdCounter = 1;
    this.tweetIdCounter = 1;
    this.userIdCounter = 1;
  }
  
  // User operations
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
      isAdmin: insertUser.isAdmin || false,
    };
    this.usersData.set(id, newUser);
    return newUser;
  }
  
  async getUser(id: number): Promise<User | undefined> {
    return this.usersData.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(
      user => user.username === username
    );
  }
  
  async verifyAdminCredentials(username: string, password: string): Promise<boolean> {
    const user = await this.getUserByUsername(username);
    if (!user || !user.isAdmin) {
      return false;
    }
    
    // In memory implementation we just compare passwords directly
    // In real implementation we would use bcrypt.compare
    return user.password === password;
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

/**
 * Database Storage Implementation
 * Uses PostgreSQL for data persistence
 */
export class DatabaseStorage implements IStorage {
  
  // User operations
  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword
      })
      .returning();
    
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    
    return user || undefined;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    
    return user || undefined;
  }

  async verifyAdminCredentials(username: string, password: string): Promise<boolean> {
    const user = await this.getUserByUsername(username);
    
    if (!user || !user.isAdmin) {
      return false;
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    return passwordMatch;
  }
  
  // Snapshot operations
  async createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot> {
    const [newSnapshot] = await db
      .insert(snapshots)
      .values(snapshot)
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
    
    return snapshot || undefined;
  }
  
  async getSnapshot(id: number): Promise<Snapshot | undefined> {
    const [snapshot] = await db
      .select()
      .from(snapshots)
      .where(eq(snapshots.id, id));
    
    return snapshot || undefined;
  }
  
  async deleteSnapshot(id: number): Promise<boolean> {
    // Thanks to cascade delete, this will also delete all agents and tweets
    const result = await db
      .delete(snapshots)
      .where(eq(snapshots.id, id))
      .returning({ id: snapshots.id });
    
    return result.length > 0;
  }
  
  // Agent operations
  async createAgent(agent: InsertAgent): Promise<Agent> {
    const [newAgent] = await db
      .insert(agents)
      .values(agent)
      .returning();
    
    return newAgent;
  }
  
  async getAgents(snapshotId: number, filters: AgentFilters = {}): Promise<Agent[]> {
    let query = db
      .select()
      .from(agents)
      .where(eq(agents.snapshotId, snapshotId));
    
    // Apply search filter
    if (filters.search) {
      query = query.where(
        or(
          like(agents.mastodonUsername, `%${filters.search}%`),
          like(agents.city || '', `%${filters.search}%`),
          like(agents.mastodonBio || '', `%${filters.search}%`)
        )
      );
    }
    
    // Apply score range filter
    if (filters.minScore !== undefined) {
      query = query.where(gte(agents.score, filters.minScore));
    }
    
    if (filters.maxScore !== undefined) {
      query = query.where(lte(agents.score, filters.maxScore));
    }
    
    // Apply city filter
    if (filters.city) {
      query = query.where(eq(agents.city || '', filters.city));
    }
    
    // Apply sorting
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'score_asc':
          query = query.orderBy(asc(agents.score));
          break;
        case 'score':
          query = query.orderBy(desc(agents.score));
          break;
        case 'followers':
          query = query.orderBy(desc(agents.followersCount || 0));
          break;
        case 'likes':
          query = query.orderBy(desc(agents.likesCount || 0));
          break;
        case 'retweets':
          query = query.orderBy(desc(agents.retweetsCount || 0));
          break;
      }
    } else {
      // Default sort by score
      query = query.orderBy(desc(agents.score));
    }
    
    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;
    
    return query.limit(limit).offset(offset);
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
    
    return agent || undefined;
  }
  
  async getAgentHistory(mastodonUsername: string): Promise<Agent[]> {
    // Get all snapshots of a specific agent, ordered by timestamp
    return db
      .select({
        ...agents,
        timestamp: snapshots.timestamp
      })
      .from(agents)
      .innerJoin(snapshots, eq(agents.snapshotId, snapshots.id))
      .where(eq(agents.mastodonUsername, mastodonUsername))
      .orderBy(desc(snapshots.timestamp));
  }
  
  // Tweet operations
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
  
  // Stats operations
  async getSnapshotStats(snapshotId: number): Promise<SnapshotStats> {
    // Get total agents
    const [{ count: totalAgents }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agents)
      .where(eq(agents.snapshotId, snapshotId));
    
    // Get average score
    const [{ avg: avgScore }] = await db
      .select({ avg: sql<number>`avg(${agents.score})` })
      .from(agents)
      .where(eq(agents.snapshotId, snapshotId));
    
    // Get sum of likes
    const [{ sum: totalLikes }] = await db
      .select({ sum: sql<number>`sum(${agents.likesCount})` })
      .from(agents)
      .where(eq(agents.snapshotId, snapshotId));
    
    // Get previous snapshot for comparison
    const snapshot = await this.getSnapshot(snapshotId);
    if (!snapshot) {
      return {
        totalAgents: 0,
        avgScore: 0,
        totalLikes: 0,
        topGainers: [],
        topLosers: []
      };
    }
    
    // Get previous snapshot
    const [prevSnapshot] = await db
      .select()
      .from(snapshots)
      .where(lt(snapshots.timestamp, snapshot.timestamp))
      .orderBy(desc(snapshots.timestamp))
      .limit(1);
    
    // Get top gainers and losers
    const topGainers: Agent[] = [];
    const topLosers: Agent[] = [];
    
    if (prevSnapshot) {
      // Find agents with the biggest score changes
      const agentsWithChanges = await db
        .select({
          ...agents,
          prevScore: db
            .select({ score: agents.score })
            .from(agents)
            .where(
              and(
                eq(agents.snapshotId, prevSnapshot.id),
                eq(agents.mastodonUsername, agents.mastodonUsername)
              )
            )
            .as('prev_agent')
        })
        .from(agents)
        .where(eq(agents.snapshotId, snapshotId))
        .orderBy(desc(sql`${agents.score} - COALESCE(prev_agent.score, 0)`))
        .limit(10);
      
      // Add top gainers (already sorted by gain)
      for (const agent of agentsWithChanges.slice(0, 5)) {
        if (agent.prevScore && agent.score > agent.prevScore) {
          topGainers.push(agent);
        }
      }
      
      // Find top losers
      const topLosersData = await db
        .select({
          ...agents,
          prevScore: db
            .select({ score: agents.score })
            .from(agents)
            .where(
              and(
                eq(agents.snapshotId, prevSnapshot.id),
                eq(agents.mastodonUsername, agents.mastodonUsername)
              )
            )
            .as('prev_agent')
        })
        .from(agents)
        .where(eq(agents.snapshotId, snapshotId))
        .orderBy(asc(sql`${agents.score} - COALESCE(prev_agent.score, 0)`))
        .limit(5);
      
      for (const agent of topLosersData) {
        if (agent.prevScore && agent.score < agent.prevScore) {
          topLosers.push(agent);
        }
      }
    }
    
    return {
      totalAgents: totalAgents || 0,
      avgScore: Math.round(avgScore || 0),
      totalLikes: totalLikes || 0,
      topGainers,
      topLosers
    };
  }
  
  // Data import operations
  async importLeaderboardData(entries: LeaderboardEntry[], snapshotId: number): Promise<void> {
    // Get the previous snapshot to calculate previous ranks and scores
    const [prevSnapshot] = await db
      .select()
      .from(snapshots)
      .where(lt(snapshots.id, snapshotId))
      .orderBy(desc(snapshots.timestamp))
      .limit(1);
    
    // Import each entry
    let rank = 1;
    for (const entry of entries) {
      let prevScore = null;
      let prevRank = null;
      
      // Find previous data for this agent if available
      if (prevSnapshot) {
        const [prevAgent] = await db
          .select()
          .from(agents)
          .where(
            and(
              eq(agents.snapshotId, prevSnapshot.id),
              eq(agents.mastodonUsername, entry.mastodonUsername)
            )
          );
        
        if (prevAgent) {
          prevScore = prevAgent.score;
          prevRank = prevAgent.rank;
        }
      }
      
      // Create agent entry
      await this.createAgent({
        snapshotId,
        mastodonUsername: entry.mastodonUsername,
        score: entry.score,
        avatarUrl: entry.avatarURL || null,
        city: entry.city || null,
        likesCount: entry.likesCount || null,
        followersCount: entry.followersCount || null,
        retweetsCount: entry.retweetsCount || null,
        rank,
        prevRank,
        prevScore
      });
      
      rank++;
    }
  }
  
  async importAgentDetails(username: string, details: AgentDetails, snapshotId: number): Promise<void> {
    // Update the agent with additional details
    const [agent] = await db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.snapshotId, snapshotId),
          eq(agents.mastodonUsername, username)
        )
      );
    
    if (!agent) {
      return;
    }
    
    // Update with new details
    await db
      .update(agents)
      .set({
        mastodonBio: details.mastodonBio || null,
        walletAddress: details.walletAddress || null,
        walletBalance: details.walletBalance || null,
        bioUpdatedAt: details.bioUpdatedAt ? new Date(details.bioUpdatedAt) : null,
        ubiClaimedAt: details.ubiClaimedAt ? new Date(details.ubiClaimedAt) : null
      })
      .where(eq(agents.id, agent.id));
    
    // Import tweets if available
    if (details.tweets && details.tweets.length > 0) {
      for (const tweet of details.tweets) {
        await this.createTweet({
          agentId: agent.id,
          content: tweet.content,
          timestamp: new Date(tweet.timestamp),
          likesCount: tweet.likesCount || 0,
          retweetsCount: tweet.retweetsCount || 0
        });
      }
    }
  }
}

// Use DatabaseStorage instead of MemStorage
// Use an instance of the DatabaseStorage as our storage implementation
export const storage = new DatabaseStorage();
