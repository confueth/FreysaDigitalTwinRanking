import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import csv from 'csv-parser';
import { LeaderboardEntry, AgentDetails } from '@shared/schema';
import { IStorage } from './storage';

interface CSVLeaderboardEntry {
  mastodonUsername: string;
  score: string;
  avatarURL?: string;
  city?: string;
  likesCount?: string;
  followersCount?: string;
  retweetsCount?: string;
  rank?: string;
  walletAddress?: string;
  walletBalance?: string;
  bioUpdatedAt?: string;
  ubiClaimedAt?: string;
  mastodonBio?: string;
}

/**
 * Imports leaderboard data from a CSV file
 * @param storage Storage implementation
 * @param filePath Path to the CSV file
 * @param description Description for the snapshot
 * @param overrideDate Optional date override for the snapshot timestamp
 */
export async function importLeaderboardFromCSV(
  storage: IStorage,
  filePath: string,
  description: string,
  overrideDate?: Date
): Promise<number> {
  return new Promise((resolve, reject) => {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`CSV file not found: ${filePath}`));
    }

    console.log(`Importing leaderboard data from ${filePath}...`);
    
    // Create a snapshot for this import with the provided description
    // Note: The timestamp is handled internally within the createSnapshot method
    const snapshotPromise = storage.createSnapshot({ 
      description: description || `CSV Import - ${path.basename(filePath)}`
    });
    
    const results: CSVLeaderboardEntry[] = [];
    
    createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: CSVLeaderboardEntry) => {
        results.push(data);
      })
      .on('end', async () => {
        try {
          const snapshot = await snapshotPromise;
          console.log(`Created snapshot #${snapshot.id} for CSV import`);
          
          // Convert CSV entries to leaderboard entries
          const entries: LeaderboardEntry[] = results.map((row, index) => ({
            mastodonUsername: row.mastodonUsername,
            score: parseFloat(row.score) || 0,
            avatarURL: row.avatarURL || null,
            city: row.city || null,
            likesCount: row.likesCount ? parseInt(row.likesCount, 10) : null,
            followersCount: row.followersCount ? parseInt(row.followersCount, 10) : null,
            retweetsCount: row.retweetsCount ? parseInt(row.retweetsCount, 10) : null,
            rank: row.rank ? parseInt(row.rank, 10) : index + 1
          }));
          
          // Import the data
          await storage.importLeaderboardData(entries, snapshot.id);
          console.log(`Successfully imported ${entries.length} entries from CSV`);
          
          // Process agent details if available
          for (const entry of results) {
            if (entry.mastodonBio || entry.walletAddress || entry.ubiClaimedAt || entry.bioUpdatedAt) {
              const details: AgentDetails = {
                mastodonUsername: entry.mastodonUsername,
                score: parseFloat(entry.score) || 0,
                mastodonBio: entry.mastodonBio || null,
                walletAddress: entry.walletAddress || null,
                walletBalance: entry.walletBalance || null,
                city: entry.city || null,
                likesCount: entry.likesCount ? parseInt(entry.likesCount, 10) : null,
                followersCount: entry.followersCount ? parseInt(entry.followersCount, 10) : null,
                retweetsCount: entry.retweetsCount ? parseInt(entry.retweetsCount, 10) : null,
                repliesCount: null,
                bioUpdatedAt: entry.bioUpdatedAt ? new Date(entry.bioUpdatedAt) : null,
                ubiClaimedAt: entry.ubiClaimedAt ? new Date(entry.ubiClaimedAt) : null,
              };
              
              await storage.importAgentDetails(entry.mastodonUsername, details, snapshot.id);
            }
          }
          
          resolve(snapshot.id);
        } catch (error) {
          console.error('Error importing CSV data:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        reject(error);
      });
  });
}

/**
 * Lists all available CSV files in the data directory
 */
export function listAvailableCSVFiles(): string[] {
  const dataDir = path.join(process.cwd(), 'data');
  
  if (!fs.existsSync(dataDir)) {
    console.warn('Data directory does not exist');
    return [];
  }
  
  return fs.readdirSync(dataDir)
    .filter(file => file.endsWith('.csv'))
    .map(file => path.join(dataDir, file));
}

/**
 * Helper function to extract date from filename (format: leaderboard_YYYY_MM_DD.csv)
 */
export function extractDateFromFilename(filename: string): Date | null {
  const match = path.basename(filename).match(/leaderboard_(\d{4})_(\d{2})_(\d{2})\.csv/);
  if (match) {
    const [_, year, month, day] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  return null;
}

/**
 * Import all CSV files in the data directory
 */
export async function importAllCSVFiles(storage: IStorage): Promise<void> {
  const files = listAvailableCSVFiles();
  
  if (files.length === 0) {
    console.log('No CSV files found to import');
    return;
  }
  
  console.log(`Found ${files.length} CSV files to import`);
  
  for (const file of files) {
    try {
      const date = extractDateFromFilename(file);
      const description = date 
        ? `Leaderboard Snapshot - ${date.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})}` 
        : `Import from ${path.basename(file)}`;
      
      await importLeaderboardFromCSV(storage, file, description, date || undefined);
      console.log(`Successfully imported ${file}`);
    } catch (error) {
      console.error(`Error importing ${file}:`, error);
    }
  }
}