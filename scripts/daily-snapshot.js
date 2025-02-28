/**
 * Daily snapshot script for the Freysa Digital Twin Leaderboard
 * 
 * This script performs the following:
 * 1. Fetches the current leaderboard data from the Freysa API
 * 2. Creates a new snapshot in the database
 * 3. Imports the leaderboard data into the database
 * 
 * To run this script manually: node scripts/daily-snapshot.js
 * Ideally, this script should be scheduled to run daily using a cron job or similar scheduler
 */

const axios = require('axios');
const { db } = require('../server/db');
const { storage } = require('../server/storage');
const { getLiveLeaderboardData, getLiveAgentDetail } = require('../server/live-api');

// Constants for the Freysa API endpoints
const LEADERBOARD_API = 'https://digital-clone-production.onrender.com/digital-clones/leaderboards?full=true';
const AGENT_DETAIL_API = 'https://digital-clone-production.onrender.com/digital-clones/clones/';

async function takeSnapshot() {
  try {
    console.log('Starting daily snapshot process...');

    // Generate a formatted date for the snapshot description
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const description = `Automated daily snapshot - ${formattedDate}`;

    console.log(`Creating snapshot: ${description}`);

    // Create a new snapshot in the database
    const snapshot = await storage.createSnapshot({
      description,
      timestamp: now
    });

    console.log(`Snapshot created with ID: ${snapshot.id}`);

    // Fetch the current leaderboard data
    console.log('Fetching leaderboard data from Freysa API...');
    const leaderboardData = await getLiveLeaderboardData();
    
    console.log(`Fetched ${leaderboardData.length} agents from leaderboard`);

    // Import the leaderboard data into the database
    console.log('Importing leaderboard data into the database...');
    const leaderboardEntries = leaderboardData.map(agent => ({
      mastodonUsername: agent.mastodonUsername,
      score: agent.score,
      avatarURL: agent.avatarUrl,
      city: agent.city,
      likesCount: agent.likesCount,
      followersCount: agent.followersCount,
      retweetsCount: agent.retweetsCount,
      rank: agent.rank || 0
    }));

    await storage.importLeaderboardData(leaderboardEntries, snapshot.id);
    console.log('Leaderboard data imported successfully');

    // For top 10 agents, fetch detailed information
    console.log('Fetching detailed information for top agents...');
    const topAgents = leaderboardData.slice(0, 10);
    
    for (const agent of topAgents) {
      try {
        console.log(`Fetching details for agent: ${agent.mastodonUsername}`);
        const agentDetail = await getLiveAgentDetail(agent.mastodonUsername);
        
        if (agentDetail) {
          await storage.importAgentDetails(
            agent.mastodonUsername,
            {
              mastodonBio: agentDetail.mastodonBio,
              walletAddress: agentDetail.walletAddress,
              walletBalance: agentDetail.walletBalance,
              bioUpdatedAt: agentDetail.bioUpdatedAt,
              ubiClaimedAt: agentDetail.ubiClaimedAt
            },
            snapshot.id
          );
          
          // If the agent has tweets, store them as well
          if (agentDetail.tweets && agentDetail.tweets.length > 0) {
            const agentFromDb = await storage.getAgent(snapshot.id, agent.mastodonUsername);
            
            if (agentFromDb) {
              for (const tweet of agentDetail.tweets) {
                await storage.createTweet({
                  agentId: agentFromDb.id,
                  content: tweet.content,
                  timestamp: new Date(tweet.timestamp),
                  likesCount: tweet.likesCount,
                  retweetsCount: tweet.retweetsCount
                });
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching details for agent ${agent.mastodonUsername}:`, error.message);
        // Continue with the next agent
      }
      
      // Add a small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('Daily snapshot process completed successfully!');
    return snapshot;
  } catch (error) {
    console.error('Error taking daily snapshot:', error);
    throw error;
  }
}

// If this script is run directly (not imported)
if (require.main === module) {
  takeSnapshot()
    .then(() => {
      console.log('Snapshot completed, exiting process');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error during snapshot:', error);
      process.exit(1);
    });
}

module.exports = { takeSnapshot };