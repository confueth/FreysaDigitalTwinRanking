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
 * Checks if a snapshot has been created today
 * @param storage Storage implementation
 * @returns true if a snapshot was created today, false otherwise
 */
async function hasSnapshotForToday(storage: IStorage): Promise<boolean> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Beginning of today
    
    // Get all snapshots
    const snapshots = await storage.getSnapshots();
    
    // Check if any snapshot was created today
    return snapshots.some(snapshot => {
      const snapshotDate = new Date(snapshot.timestamp);
      snapshotDate.setHours(0, 0, 0, 0); // Beginning of the snapshot day
      return snapshotDate.getTime() === today.getTime();
    });
  } catch (error) {
    console.error('Error checking for today\'s snapshot:', error);
    return false;
  }
}

/**
 * Configure a scheduled job to create daily snapshots
 * @param storage Storage implementation
 */
export function scheduleSnapshots(storage: IStorage): void {
  // Run a check every hour to see if we have a snapshot for today
  cron.schedule('0 * * * *', async () => {
    console.log('Running hourly snapshot check');
    const hasSnapshotToday = await hasSnapshotForToday(storage);
    
    if (!hasSnapshotToday) {
      console.log('No snapshot for today found, creating one now');
      await createSnapshot(storage, `Daily snapshot - ${new Date().toLocaleDateString()}`);
    } else {
      console.log('Snapshot for today already exists, skipping');
    }
  });
  
  // Also create a snapshot on startup if there is none for today
  initializeSnapshot(storage);
}

/**
 * Create an initial snapshot if no snapshots exist for today
 * @param storage Storage implementation
 */
async function initializeSnapshot(storage: IStorage): Promise<void> {
  try {
    // First check if we have any snapshots at all
    const snapshots = await storage.getSnapshots();
    
    if (!snapshots || snapshots.length === 0) {
      console.log('No snapshots found at all. Creating initial snapshot...');
      await createSnapshot(storage, 'Initial snapshot');
      return;
    }
    
    // Then check if we have a snapshot for today
    const hasSnapshotToday = await hasSnapshotForToday(storage);
    
    if (!hasSnapshotToday) {
      console.log('No snapshot for today found. Creating initial snapshot for today...');
      await createSnapshot(storage, `Initial snapshot - ${new Date().toLocaleDateString()}`);
    } else {
      console.log('Snapshot for today already exists. No initialization needed.');
    }
  } catch (error) {
    console.error('Error initializing snapshot:', error);
  }
}