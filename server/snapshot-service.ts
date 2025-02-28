import { getLiveLeaderboardData, getLiveAgentDetail } from './live-api';
import { IStorage } from './storage';
import { LeaderboardEntry, AgentDetails } from '@shared/schema';
import cron from 'node-cron';

let isSnapshotInProgress = false;

/**
 * Creates a new snapshot with the current leaderboard data
 * @param storage Storage implementation
 * @param description Optional description for the snapshot
 */
export async function createSnapshot(
  storage: IStorage, 
  description: string = `Daily snapshot - ${new Date().toLocaleDateString()}`
): Promise<number | null> {
  if (isSnapshotInProgress) {
    console.log('A snapshot is already in progress. Skipping...');
    return null;
  }

  try {
    isSnapshotInProgress = true;
    console.log(`Creating new snapshot: ${description}`);
    
    // Create a new snapshot entry
    const snapshot = await storage.createSnapshot({ description });
    
    // Get live leaderboard data
    const agents = await getLiveLeaderboardData();
    
    if (!agents || agents.length === 0) {
      console.error('Failed to get leaderboard data for snapshot');
      return null;
    }
    
    console.log(`Got ${agents.length} agents for snapshot #${snapshot.id}`);
    
    // Convert to LeaderboardEntry format
    const entries: LeaderboardEntry[] = agents.map(agent => ({
      mastodonUsername: agent.mastodonUsername,
      score: agent.score,
      avatarURL: agent.avatarUrl,
      city: agent.city,
      likesCount: agent.likesCount,
      followersCount: agent.followersCount,
      retweetsCount: agent.retweetsCount
    }));
    
    // Import the data
    await storage.importLeaderboardData(entries, snapshot.id);
    
    // Get detailed data for top agents (limit to avoid hitting API rate limits)
    const topAgents = agents.slice(0, 50);
    
    for (const agent of topAgents) {
      try {
        const details = await getLiveAgentDetail(agent.mastodonUsername);
        if (details) {
          const agentDetails: AgentDetails = {
            mastodonUsername: details.mastodonUsername,
            score: details.score,
            mastodonBio: details.mastodonBio,
            walletAddress: details.walletAddress,
            walletBalance: details.walletBalance,
            likesCount: details.likesCount,
            followersCount: details.followersCount,
            retweetsCount: details.retweetsCount,
            repliesCount: details.repliesCount,
            city: details.city,
            bioUpdatedAt: details.bioUpdatedAt,
            ubiClaimedAt: details.ubiClaimedAt,
            tweets: details.tweets
          };
          
          await storage.importAgentDetails(agent.mastodonUsername, agentDetails, snapshot.id);
        }
      } catch (error) {
        console.error(`Error fetching details for ${agent.mastodonUsername}:`, error);
      }
      
      // Add a small delay to avoid hitting API rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Snapshot #${snapshot.id} created successfully with ${entries.length} agents`);
    return snapshot.id;
  } catch (error) {
    console.error('Error creating snapshot:', error);
    return null;
  } finally {
    isSnapshotInProgress = false;
  }
}

/**
 * Configure a scheduled job to create daily snapshots
 * @param storage Storage implementation
 */
export function scheduleSnapshots(storage: IStorage): void {
  // Schedule a daily snapshot at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running scheduled daily snapshot');
    await createSnapshot(storage);
  });
  
  // Also create a snapshot on startup if there are none
  initializeSnapshot(storage);
}

/**
 * Create an initial snapshot if no snapshots exist
 * @param storage Storage implementation
 */
async function initializeSnapshot(storage: IStorage): Promise<void> {
  try {
    const snapshots = await storage.getSnapshots();
    
    if (!snapshots || snapshots.length === 0) {
      console.log('No snapshots found. Creating initial snapshot...');
      await createSnapshot(storage, 'Initial snapshot');
    } else {
      console.log(`Found ${snapshots.length} existing snapshots. No initialization needed.`);
    }
  } catch (error) {
    console.error('Error initializing snapshot:', error);
  }
}