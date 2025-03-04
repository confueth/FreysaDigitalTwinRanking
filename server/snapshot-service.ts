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
  description?: string
): Promise<number | null> {
  // If no description is provided, generate one with the current date (in UTC)
  if (!description) {
    const date = new Date();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();
    description = `Daily snapshot - ${month}/${day}/${year}`;
  }
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
    
    // Get detailed data for all agents (no limit)
    for (const agent of agents) {
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
    // Get today's date in UTC
    const today = new Date();
    // Set to beginning of the day in UTC
    today.setUTCHours(0, 0, 0, 0);
    
    // Get all snapshots
    const snapshots = await storage.getSnapshots();
    
    // Check if any snapshot was created today (using UTC)
    return snapshots.some(snapshot => {
      const snapshotDate = new Date(snapshot.timestamp);
      // Set to beginning of the snapshot day in UTC
      snapshotDate.setUTCHours(0, 0, 0, 0);
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
  // Create a snapshot at the end of each day (11:55 PM)
  cron.schedule('55 23 * * *', async () => {
    console.log('Running end-of-day snapshot creation');
    const hasSnapshotToday = await hasSnapshotForToday(storage);
    
    if (!hasSnapshotToday) {
      console.log('Creating end-of-day snapshot');
      const date = new Date();
      const month = date.getUTCMonth() + 1;
      const day = date.getUTCDate();
      const year = date.getUTCFullYear();
      await createSnapshot(storage, `End of day snapshot - ${month}/${day}/${year}`);
    } else {
      console.log('Snapshot already exists for today, updating it');
      // Get the most recent snapshot
      const snapshots = await storage.getSnapshots();
      if (snapshots && snapshots.length > 0) {
        const latestSnapshot = snapshots[0];
        
        // Delete the existing snapshot
        await storage.deleteSnapshot(latestSnapshot.id);
        
        // Create a new one for today with updated data
        const date = new Date();
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();
        const year = date.getUTCFullYear();
        await createSnapshot(storage, `End of day snapshot - ${month}/${day}/${year}`);
      }
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
      const date = new Date();
      const month = date.getUTCMonth() + 1;
      const day = date.getUTCDate();
      const year = date.getUTCFullYear();
      await createSnapshot(storage, `Snapshot - ${month}/${day}/${year}`);
    } else {
      console.log('Snapshot for today already exists. No initialization needed.');
    }
  } catch (error) {
    console.error('Error initializing snapshot:', error);
  }
}

/**
 * Find a snapshot from the previous day compared to the current date
 * @param storage Storage implementation
 * @returns The snapshot from the previous day or the closest one before today
 */
export async function findPreviousDaySnapshot(storage: IStorage): Promise<{ id: number, timestamp: Date } | null> {
  try {
    // Get all snapshots
    const snapshots = await storage.getSnapshots();
    
    // If no snapshots, return null
    if (!snapshots || snapshots.length === 0) {
      return null;
    }
    
    // Define today
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Set to beginning of today
    
    // Sort snapshots by timestamp (newest first)
    snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Find the most recent snapshot before today
    let previousDaySnapshot = null;
    
    for (const snapshot of snapshots) {
      const snapshotDate = new Date(snapshot.timestamp);
      snapshotDate.setUTCHours(0, 0, 0, 0); // Compare just the date part
      
      // If this snapshot is from before today, it's our candidate
      if (snapshotDate.getTime() < today.getTime()) {
        previousDaySnapshot = snapshot;
        break; // Take the first one (most recent) before today
      }
    }
    
    if (previousDaySnapshot) {
      console.log(`Found previous day snapshot #${previousDaySnapshot.id} from ${previousDaySnapshot.timestamp}`);
    } else {
      console.log('No previous day snapshot found');
    }
    
    return previousDaySnapshot;
  } catch (error) {
    console.error('Error finding previous day snapshot:', error);
    return null;
  }
}
