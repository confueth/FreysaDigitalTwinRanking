import { getLiveLeaderboardData, getLiveAgentDetail } from './live-api';
import { IStorage } from './storage';
import { LeaderboardEntry, AgentDetails, Snapshot } from '@shared/schema'; // Assuming Snapshot type is available
import cron from 'node-cron';
import { getStartOfDayEST, formatDateEST, convertToEST } from './date-utils';

let isSnapshotInProgress = false;

/**
 * Creates a new snapshot with the current leaderboard data.
 * This function now focuses solely on CREATING a new snapshot entry and importing data into it.
 * @param storage Storage implementation
 * @param description Optional description for the snapshot
 * @returns The ID of the created snapshot, or null if creation failed or was skipped.
 */
export async function createSnapshot(
  storage: IStorage,
  description?: string
): Promise<number | null> {
  // Generate default description if none provided
  if (!description) {
    const estDate = convertToEST(new Date());
    // Robust split assuming various separators like / , space
    const [month, day, year] = estDate.split(/[\/,\s]+/);
    description = `Daily snapshot - ${month}/${day}/${year}`;
  }

  // Prevent concurrent snapshot creation attempts
  if (isSnapshotInProgress) {
    console.warn('Snapshot creation is already in progress. Skipping this attempt.');
    return null;
  }

  try {
    isSnapshotInProgress = true;
    console.log(`Attempting to create new snapshot: "${description}"`);

    // --- Create the new snapshot record FIRST ---
    // Note: The actual timestamp will be set by the storage layer upon creation.
    const newSnapshot = await storage.createSnapshot({ description });
    console.log(`Created snapshot record with ID: #${newSnapshot.id}`);

    // --- Find the most recent snapshot from *before* today (EST) ---
    const previousDaySnapshot = await findPreviousDaySnapshot(storage, newSnapshot.id); // Pass new ID to exclude itself
    const prevSnapshotId = previousDaySnapshot ? previousDaySnapshot.id : undefined;
    console.log(`Previous day snapshot ID for comparison: ${prevSnapshotId ?? 'None'}`);

    // --- Get Live Data ---
    const agents = await getLiveLeaderboardData();

    if (!agents || agents.length === 0) {
      console.error(`Failed to get leaderboard data for snapshot #${newSnapshot.id}. Snapshot created but may be empty.`);
      // Consider deleting the empty snapshot record here if desired:
      // await storage.deleteSnapshot(newSnapshot.id);
      // return null;
      // Or leave it as an empty marker:
      return newSnapshot.id; // Return ID even if empty, indicates an attempt was made
    }

    console.log(`Fetched ${agents.length} agents for snapshot #${newSnapshot.id}`);

    // --- Import Leaderboard Data into the NEW snapshot ---
    const entries: LeaderboardEntry[] = agents.map(agent => ({
      mastodonUsername: agent.mastodonUsername,
      score: agent.score,
      avatarURL: agent.avatarUrl,
      city: agent.city,
      likesCount: agent.likesCount,
      followersCount: agent.followersCount,
      retweetsCount: agent.retweetsCount
    }));

    // Import data specifically into the newly created snapshot ID
    await storage.importLeaderboardData(entries, newSnapshot.id, prevSnapshotId);
    console.log(`Imported leaderboard entries for snapshot #${newSnapshot.id}`);

    // --- Import Detailed Agent Data into the NEW snapshot ---
    console.log(`Fetching and importing agent details for snapshot #${newSnapshot.id}...`);
    let detailFetchErrors = 0;
    for (const agent of agents) {
      try {
        // Add a small delay *before* each API call to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 150)); // Increased delay slightly

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
            bioUpdatedAt: details.bioUpdatedAt, // Ensure these fields exist in your API response/schema
            ubiClaimedAt: details.ubiClaimedAt, // Ensure these fields exist in your API response/schema
            tweets: details.tweets
          };

          // Import details specifically into the new snapshot ID, linking to previous day if found
          await storage.importAgentDetails(
            agent.mastodonUsername,
            agentDetails,
            newSnapshot.id,
            prevSnapshotId // Pass previous snapshot ID for history tracking
          );
        } else {
           console.warn(`No details found for ${agent.mastodonUsername}`);
        }
      } catch (error) {
        detailFetchErrors++;
        console.error(`Error fetching/importing details for ${agent.mastodonUsername} in snapshot #${newSnapshot.id}:`, error);
        // Continue with the next agent even if one fails
      }
    }
     if (detailFetchErrors > 0) {
         console.warn(`Completed importing details for snapshot #${newSnapshot.id} with ${detailFetchErrors} errors.`);
     } else {
         console.log(`Successfully imported all agent details for snapshot #${newSnapshot.id}.`);
     }

    console.log(`Snapshot #${newSnapshot.id} creation process completed successfully with ${entries.length} agents.`);
    return newSnapshot.id;

  } catch (error) {
    console.error('Error during the overall snapshot creation process:', error);
    // If a snapshot record was created but the process failed later,
    // it might be left in an incomplete state. Decide if cleanup is needed.
    return null; // Indicate failure
  } finally {
    isSnapshotInProgress = false; // Ensure this always runs
    console.log('Snapshot creation process finished.');
  }
}

/**
 * Checks if a snapshot record exists whose creation timestamp falls on the current EST calendar date.
 * @param storage Storage implementation
 * @returns Promise<boolean> true if a snapshot was created today (EST), false otherwise
 */
async function hasSnapshotForToday(storage: IStorage): Promise<boolean> {
  try {
    const todayStartEST = getStartOfDayEST(); // Gets 00:00:00.000 EST for today
    const tomorrowStartEST = new Date(todayStartEST);
    tomorrowStartEST.setDate(tomorrowStartEST.getDate() + 1); // Gets 00:00:00.000 EST for tomorrow

    // Optimization: If storage supports date range queries, use them.
    // Otherwise, fetch recent snapshots and check.
    // Fetching a small number (e.g., last 5) should be sufficient usually.
    const recentSnapshots = await storage.getSnapshots({ limit: 5 }); // Assuming getSnapshots can take options

    if (!recentSnapshots || recentSnapshots.length === 0) {
      return false;
    }

    // Check if any recent snapshot's timestamp falls within today EST
    return recentSnapshots.some(snapshot => {
      const snapshotTimestamp = new Date(snapshot.timestamp); // Ensure it's a Date object
      // Check if snapshot time is >= today's start EST AND < tomorrow's start EST
      return snapshotTimestamp.getTime() >= todayStartEST.getTime() &&
             snapshotTimestamp.getTime() < tomorrowStartEST.getTime();
    });
  } catch (error) {
    console.error('Error checking for today\'s snapshot:', error);
    return false; // Safer to assume none exists if check fails
  }
}

/**
 * Configures the scheduled job to create daily snapshots using node-cron.
 * The job runs near the end of the day in the America/New_York timezone.
 * It will ONLY create a snapshot if one does not already exist for the current EST date.
 * @param storage Storage implementation
 */
export function scheduleSnapshots(storage: IStorage): void {
  console.log('Setting up scheduled snapshot creation (daily at 23:59 EST/EDT)...');

  // Schedule to run at 11:59 PM in America/New_York Timezone (handles EST/EDT)
  cron.schedule('59 23 * * *', async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled end-of-day snapshot check...`);

    try {
      const alreadyExists = await hasSnapshotForToday(storage);

      if (!alreadyExists) {
        console.log('No snapshot found for today (EST). Creating end-of-day snapshot.');
        // Generate description using current EST date just before creating
        const estDate = convertToEST(new Date());
        const [month, day, year] = estDate.split(/[\/,\s]+/);
        const description = `End-of-day snapshot - ${month}/${day}/${year}`;
        await createSnapshot(storage, description); // Call the creation function
      } else {
        console.log('Snapshot for today (EST) already exists. Skipping scheduled creation.');
        // DO NOTHING - This prevents the duplicate data import
      }
    } catch (error) {
      console.error('Error during scheduled snapshot creation:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/New_York" // IMPORTANT: Ensures job runs relative to EST/EDT
  });

  // Also run initialization check on startup
  initializeSnapshot(storage);
}

/**
 * Performs an initial check on application startup.
 * Creates a snapshot if no snapshots exist at all, or if no snapshot exists for the current EST day.
 * @param storage Storage implementation
 */
async function initializeSnapshot(storage: IStorage): Promise<void> {
  console.log('Performing initial snapshot check on startup...');
  try {
    // Check if *any* snapshots exist first.
    // Optimization: A count query or fetching just 1 snapshot might be better.
    const snapshots = await storage.getSnapshots({ limit: 1 });

    if (!snapshots || snapshots.length === 0) {
      console.log('No snapshots found in the database. Creating initial snapshot...');
      await createSnapshot(storage, 'Initial snapshot');
      return; // Exit after creating the very first one
    }

    // If snapshots exist, check specifically for today (EST)
    const hasToday = await hasSnapshotForToday(storage);

    if (!hasToday) {
      console.log('No snapshot found for today (EST). Creating snapshot for today...');
      const estDate = convertToEST(new Date());
      const [month, day, year] = estDate.split(/[\/,\s]+/);
      const description = `Snapshot - ${month}/${day}/${year} (Startup Check)`;
      await createSnapshot(storage, description);
    } else {
      console.log('Snapshot for today (EST) already exists. No initialization needed.');
    }
  } catch (error) {
    console.error('Error during initial snapshot check:', error);
  }
}

/**
 * Finds the most recent snapshot created *before* the start of the current EST day.
 * @param storage Storage implementation
 * @param excludeSnapshotId Optional: An ID to exclude from the search (e.g., the snapshot currently being created).
 * @returns The snapshot object { id: number, timestamp: Date } or null if none found.
 */
export async function findPreviousDaySnapshot(storage: IStorage, excludeSnapshotId?: number): Promise<Snapshot | null> {
  try {
    const allSnapshots = await storage.getSnapshots(); // Fetch all, consider limiting if performance is an issue

    if (!allSnapshots || allSnapshots.length === 0) {
      return null;
    }

    // Define the start of today in EST
    const todayStartEST = getStartOfDayEST();

    // Filter out the snapshot currently being created (if specified) and sort newest first
    const relevantSnapshots = allSnapshots
      .filter(s => s.id !== excludeSnapshotId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Find the first snapshot whose timestamp is before the start of today EST
    const previousSnapshot = relevantSnapshots.find(snapshot => {
      const snapshotTimestamp = new Date(snapshot.timestamp);
      return snapshotTimestamp.getTime() < todayStartEST.getTime();
    });

    if (previousSnapshot) {
      console.log(`Found previous day snapshot: ID #${previousSnapshot.id} from ${formatDateEST(new Date(previousSnapshot.timestamp))}`);
      return previousSnapshot;
    } else {
      console.log('No snapshot found from before today (EST).');
      return null;
    }
  } catch (error) {
    console.error('Error finding previous day snapshot:', error);
    return null;
  }
}