import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import path from 'path';
import fs from 'fs';
import { getLiveLeaderboardData, getLiveAgentDetail, filterAgents, getLiveStats, getAvailableCities } from './live-api';
import type { MinimalAgent } from './live-api'; // Import the MinimalAgent type
import { storage } from './storage';
import { createSnapshot } from './snapshot-service';
import { getStartOfDayEST, formatDateEST, convertToEST } from './date-utils';

async function findPreviousDaySnapshot(storage: any) {
    const snapshots = await storage.getSnapshots();
    if (!snapshots || snapshots.length === 0) return null;

    // Define today in EST timezone
    const today = getStartOfDayEST();
    
    // Sort snapshots by timestamp (newest first)
    snapshots.sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Find the most recent snapshot before today
    let previousSnapshot = null;
    
    for (const snapshot of snapshots) {
        // Convert snapshot date to EST timezone and get start of day
        const snapshotDate = new Date(snapshot.timestamp);
        const snapshotDateEST = getStartOfDayEST(snapshotDate);
        
        // If this snapshot is from before today, it's our candidate
        if (snapshotDateEST.getTime() < today.getTime()) {
            previousSnapshot = snapshot;
            break; // Take the first one (most recent) before today
        }
    }
    
    if (previousSnapshot) {
        console.log(`Found previous day snapshot #${previousSnapshot.id} from ${formatDateEST(previousSnapshot.timestamp)}`);
    } else {
        console.log('No previous day snapshot found');
    }
    
    return previousSnapshot;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup API routes
  app.use("/api", async (req, res, next) => {
    try {
      await next();
    } catch (error) {
      console.error("API error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all agents with filtering
  app.get("/api/agents", async (req: Request, res: Response) => {
    try {
      // Parse query filters
      const filters = {
        search: req.query.search as string | undefined,
        minScore: req.query.minScore ? parseInt(req.query.minScore as string) : undefined,
        maxScore: req.query.maxScore ? parseInt(req.query.maxScore as string) : undefined,
        city: req.query.city as string | undefined,
        sortBy: req.query.sortBy as "score" | "score_asc" | "followers" | "likes" | "retweets" | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? (parseInt(req.query.limit as string) === 0 ? 100000 : parseInt(req.query.limit as string)) : 50,
      };

      // Get live data from API with fallback to snapshot data
      let liveData;
      let currentSnapshotId: number | null = null;

      try {
        console.log("Fetching fresh leaderboard data");
        liveData = await getLiveLeaderboardData();

        // If the live API returned an empty array, fall back to snapshot data
        if (!liveData || liveData.length === 0) {
          console.log("Live API returned empty data, falling back to snapshot");
          const latestSnapshot = await storage.getLatestSnapshot();
          if (latestSnapshot) {
            console.log(`Using snapshot #${latestSnapshot.id} data as fallback for empty live data`);
            liveData = await storage.getAgents(latestSnapshot.id);
            currentSnapshotId = latestSnapshot.id;
          } else {
            console.error("No snapshot data available for fallback");
          }
        } else {
          // For live data, we'll compare with latest snapshot
          const latestSnapshot = await storage.getLatestSnapshot();
          if (latestSnapshot) {
            currentSnapshotId = latestSnapshot.id;
          }
        }
      } catch (apiError) {
        console.error("Error fetching live data, will attempt to use snapshot data", apiError);

        // Fallback to latest snapshot data if live API fails
        const latestSnapshot = await storage.getLatestSnapshot();
        if (latestSnapshot) {
          console.log(`Falling back to snapshot #${latestSnapshot.id} data`);
          liveData = await storage.getAgents(latestSnapshot.id);
          currentSnapshotId = latestSnapshot.id;
        } else {
          throw new Error("No fallback data available");
        }
      }

      // Now let's add previous day comparison data
      try {
        // For both live and snapshot data, we want to find a previous day snapshot for comparison
        // Get all snapshots sorted by timestamp
        const snapshots = await storage.getSnapshots();

        // Sort snapshots by time (latest first)
        snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Find a snapshot from the previous day for comparison in EST timezone
        const today = getStartOfDayEST(); // Get beginning of today in EST timezone

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1); // Set to previous day in EST

        // Find the snapshot closest to yesterday
        let previousSnapshot = null;
        let minTimeDiff = Infinity;

        for (const snapshot of snapshots) {
          const snapshotDate = new Date(snapshot.timestamp);
          // Convert to EST timezone to ensure consistent date comparison
          const snapshotDateEST = getStartOfDayEST(snapshotDate);

          // Check if this snapshot is from yesterday (in EST)
          if (snapshotDateEST.getTime() === yesterday.getTime()) {
            previousSnapshot = snapshot;
            break; // Perfect match found
          }

          // If no exact match, find the closest one before today
          const timeDiff = today.getTime() - snapshotDateEST.getTime();
          if (timeDiff > 0 && timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            previousSnapshot = snapshot;
          }
        }

        // If we found a previous snapshot
        if (previousSnapshot && previousSnapshot.id !== currentSnapshotId) {
          console.log(`Using snapshot #${previousSnapshot.id} for previous day comparison for all agents`);

          // Get all agents from the previous snapshot
          const previousAgents = await storage.getAgents(previousSnapshot.id);

          // Create a lookup map for faster access
          const prevAgentMap = new Map();
          previousAgents.forEach(agent => {
            prevAgentMap.set(agent.mastodonUsername.toLowerCase(), agent);
          });

          // Update each agent with previous data
          liveData = liveData.map(agent => {
            const prevAgent = prevAgentMap.get(agent.mastodonUsername.toLowerCase());
            if (prevAgent) {
              return {
                ...agent,
                prevScore: prevAgent.score,
                prevRank: prevAgent.rank,
                // Convert timestamp to EST for consistent display
                prevTimestamp: convertToEST(previousSnapshot.timestamp)
              };
            }
            return agent;
          });
        }
      } catch (historyError) {
        // If there's an error getting historical data, log it but continue
        console.error("Error adding previous day comparison data to agents:", historyError);
        // We'll still return the agent data without the comparison
      }

      // Apply filters - ensure all agents have string IDs and handle DB-sourced data
      const normalizedLiveData = liveData.map(agent => {
        // Add timestamp for DB-sourced agents if not present
        // This handles the case where Agent from database doesn't have timestamp property
        const normalizedAgent: MinimalAgent = {
          ...agent,
          id: typeof agent.id === 'number' ? agent.id.toString() : agent.id,
          timestamp: agent.hasOwnProperty('timestamp') ? agent.timestamp : new Date()
        };
        return normalizedAgent;
      });
      
      const { agents, totalCount } = filterAgents(normalizedLiveData, filters);

      // Set pagination metadata in headers
      res.setHeader('X-Total-Count', totalCount.toString());
      res.setHeader('X-Page', (filters.page || 1).toString());
      res.setHeader('X-Page-Size', (filters.limit || 50).toString());

      res.json(agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ 
        error: "Failed to fetch agents data",
        message: "Please try again later. Using fallback snapshot data when available." 
      });
    }
  });

  // Get agent details
  app.get("/api/agents/:username", async (req: Request, res: Response) => {
    try {
      const username = req.params.username;
      let agent;

      try {
        // First attempt to get live data
        agent = await getLiveAgentDetail(username);
      } catch (apiError) {
        console.error(`Error fetching live agent data for ${username}, attempting to use snapshot data`, apiError);

        // Fallback to latest snapshot data
        const latestSnapshot = await storage.getLatestSnapshot();
        if (latestSnapshot) {
          console.log(`Falling back to snapshot #${latestSnapshot.id} data for agent ${username}`);
          agent = await storage.getAgent(latestSnapshot.id, username);
        } else {
          throw new Error("No fallback data available");
        }
      }

      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      // Now let's add 24-hour comparison data - find an older snapshot from ~24 hours ago
      try {
        // Get all snapshots sorted by timestamp
        const snapshots = await storage.getSnapshots();

        // Sort snapshots by time (latest first)
        snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Find a snapshot from the previous day for comparison in EST timezone
        const today = getStartOfDayEST(); // Get beginning of today in EST timezone

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1); // Set to previous day in EST

        // Find the snapshot closest to yesterday
        let previousSnapshot = null;
        let minTimeDiff = Infinity;

        for (const snapshot of snapshots) {
          const snapshotDate = new Date(snapshot.timestamp);
          // Convert to EST timezone for consistent date comparison
          const snapshotDateEST = getStartOfDayEST(snapshotDate);

          // Check if this snapshot is from yesterday (in EST)
          if (snapshotDateEST.getTime() === yesterday.getTime()) {
            previousSnapshot = snapshot;
            break; // Perfect match found
          }

          // If no exact match, find the closest one before today
          const timeDiff = today.getTime() - snapshotDateEST.getTime();
          if (timeDiff > 0 && timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            previousSnapshot = snapshot;
          }
        }

        // Check if we have a valid previous snapshot before formatting its date
        console.log(`Using snapshot #${previousSnapshot?.id} from ${previousSnapshot?.timestamp ? formatDateEST(previousSnapshot.timestamp) : 'unknown'} for previous day comparison`);

        // If we found the specific snapshot and it's not the same as the current one
        if (previousSnapshot && agent.snapshotId !== previousSnapshot.id) {
          // Get the agent data from that snapshot
          const previousDayAgent = await storage.getAgent(previousSnapshot.id, username);

          if (previousDayAgent) {
            // Add previous day data for comparison
            agent.prevScore = previousDayAgent.score;
            agent.prevRank = previousDayAgent.rank;
            // Record when the previous data was collected in EST timezone
            agent.prevTimestamp = convertToEST(previousSnapshot.timestamp);
          }
        }
      } catch (historyError) {
        // If there's an error getting historical data, log it but continue
        console.error(`Error fetching historical comparison data for ${username}:`, historyError);
        // We'll still return the agent data without the comparison
      }

      res.json(agent);
    } catch (error) {
      console.error(`Error fetching agent ${req.params.username}:`, error);
      res.status(500).json({ 
        error: "Failed to fetch agent data",
        message: "Please try again later. Using fallback snapshot data when available."
      });
    }
  });

  // Get agent history data with enhanced performance and data completeness
  app.get("/api/agents/:username/history", async (req: Request, res: Response) => {
    try {
      const username = req.params.username;

      // First check if we have this agent in our database
      const historyData = await storage.getAgentHistory(username);

      // Create a map to eliminate duplicates and ensure consistent data
      const historyMap = new Map();

      // Add history data from the database if available
      if (historyData && historyData.length > 0) {
        // Process and format each historical entry
        historyData.forEach(agent => {
          // Create snapshot timestamp from creation time if available, or use current time
          // Determine the appropriate timestamp to use
          let timestamp;
          if (agent.bioUpdatedAt) {
            timestamp = convertToEST(agent.bioUpdatedAt);
          } else if ('timestamp' in agent && agent.timestamp instanceof Date) {
            timestamp = convertToEST(agent.timestamp);
          } else {
            timestamp = convertToEST(new Date());
          }

          // Use the timestamp as the key to avoid duplicates
          historyMap.set(timestamp, {
            id: agent.id.toString(),
            mastodonUsername: agent.mastodonUsername,
            score: agent.score,
            prevScore: agent.prevScore,
            avatarUrl: agent.avatarUrl,
            city: agent.city,
            likesCount: agent.likesCount,
            followersCount: agent.followersCount,
            retweetsCount: agent.retweetsCount,
            repliesCount: agent.repliesCount,
            rank: agent.rank,
            prevRank: agent.prevRank,
            walletAddress: agent.walletAddress,
            walletBalance: agent.walletBalance,
            mastodonBio: agent.mastodonBio,
            bioUpdatedAt: agent.bioUpdatedAt ? convertToEST(agent.bioUpdatedAt) : undefined,
            ubiClaimedAt: agent.ubiClaimedAt ? convertToEST(agent.ubiClaimedAt) : undefined,
            timestamp: timestamp
          });
        });
      }

      // If we have very few data points, try to get more from snapshots
      if (historyMap.size < 5) {
        try {
          // Get all available snapshots
          const snapshots = await storage.getSnapshots();

          // Sort snapshots by time (latest first)
          snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

          // Find previous day snapshot for comparison
          const previousSnapshot = await findPreviousDaySnapshot(storage);

          // Get agent data from each snapshot to add more historical points
          for (const snapshot of snapshots) {
            // Skip if we already processed this snapshot in the historyData
            if (historyData.some(h => h.snapshotId === snapshot.id)) {
              continue;
            }

            try {
              const agentFromSnapshot = await storage.getAgent(snapshot.id, username);
              if (agentFromSnapshot) {
                // Convert timestamp to EST for consistent display
                const timestamp = convertToEST(snapshot.timestamp);

                // Use the timestamp as the key to avoid duplicates
                if (!historyMap.has(timestamp)) {
                  historyMap.set(timestamp, {
                    id: agentFromSnapshot.id.toString(),
                    mastodonUsername: agentFromSnapshot.mastodonUsername,
                    score: agentFromSnapshot.score,
                    prevScore: agentFromSnapshot.prevScore,
                    avatarUrl: agentFromSnapshot.avatarUrl,
                    city: agentFromSnapshot.city,
                    likesCount: agentFromSnapshot.likesCount,
                    followersCount: agentFromSnapshot.followersCount,
                    retweetsCount: agentFromSnapshot.retweetsCount,
                    repliesCount: agentFromSnapshot.repliesCount,
                    rank: agentFromSnapshot.rank,
                    prevRank: agentFromSnapshot.prevRank,
                    walletAddress: agentFromSnapshot.walletAddress,
                    walletBalance: agentFromSnapshot.walletBalance,
                    mastodonBio: agentFromSnapshot.mastodonBio,
                    bioUpdatedAt: agentFromSnapshot.bioUpdatedAt ? convertToEST(agentFromSnapshot.bioUpdatedAt) : undefined,
                    ubiClaimedAt: agentFromSnapshot.ubiClaimedAt ? convertToEST(agentFromSnapshot.ubiClaimedAt) : undefined,
                    timestamp: timestamp
                  });
                }
              }
            } catch (error) {
              console.error(`Error getting agent ${username} from snapshot ${snapshot.id}:`, error);
              // Continue with other snapshots
            }
          }
        } catch (error) {
          console.error(`Error fetching additional historical data for ${username}:`, error);
          // Continue with what we have
        }
      }

      // Convert the map values to an array
      const history = Array.from(historyMap.values());

      // Sort by timestamp (newest first)
      history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.json(history);
    } catch (error) {
      console.error(`Error fetching history for agent ${req.params.username}:`, error);
      res.status(500).json({ 
        error: "Failed to fetch agent history",
        message: "Please try again later." 
      });
    }
  });

  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const stats = await getLiveStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      
      // Try to get stats from latest snapshot
      try {
        const latestSnapshot = await storage.getLatestSnapshot();
        if (latestSnapshot) {
          console.log(`Falling back to snapshot #${latestSnapshot.id} stats`);
          const snapshotStats = await storage.getSnapshotStats(latestSnapshot.id);
          res.json(snapshotStats);
        } else {
          throw new Error("No snapshot data available");
        }
      } catch (fallbackError) {
        console.error("Error fetching fallback stats:", fallbackError);
        res.status(500).json({ 
          error: "Failed to fetch stats",
          message: "Please try again later." 
        });
      }
    }
  });

  app.get("/api/cities", async (req: Request, res: Response) => {
    try {
      const cities = getAvailableCities();
      res.json(cities);
    } catch (error) {
      console.error("Error fetching cities:", error);
      res.status(500).json({ 
        error: "Failed to fetch city data",
        message: "Please try again later." 
      });
    }
  });

  // Create a new snapshot from the current leaderboard data
  app.post("/api/snapshots", async (req: Request, res: Response) => {
    try {
      const description = req.body.description || `Manual snapshot created at ${formatDateEST(new Date())}`;
      
      // Create the snapshot - this will convert timestamps to EST internally
      const snapshot = await createSnapshot(storage, description);
      
      res.status(201).json(snapshot);
    } catch (error) {
      console.error("Error creating snapshot:", error);
      res.status(500).json({ 
        error: "Failed to create snapshot",
        message: "Please try again later." 
      });
    }
  });

  // Get all snapshots
  app.get("/api/snapshots", async (req: Request, res: Response) => {
    try {
      const snapshots = await storage.getSnapshots();
      
      // Format snapshot timestamps in EST timezone for consistent display
      const formattedSnapshots = snapshots.map(snapshot => ({
        ...snapshot,
        formattedTimestamp: formatDateEST(snapshot.timestamp),
        timestamp: snapshot.timestamp
      }));
      
      res.json(formattedSnapshots);
    } catch (error) {
      console.error("Error fetching snapshots:", error);
      res.status(500).json({ 
        error: "Failed to fetch snapshots",
        message: "Please try again later." 
      });
    }
  });

  // Get latest snapshot
  app.get("/api/snapshots/latest", async (req: Request, res: Response) => {
    try {
      const snapshot = await storage.getLatestSnapshot();
      if (!snapshot) {
        return res.status(404).json({ error: "No snapshots available" });
      }
      
      // Format timestamp in EST timezone for consistent display
      const formattedSnapshot = {
        ...snapshot,
        formattedTimestamp: formatDateEST(snapshot.timestamp),
        timestamp: snapshot.timestamp
      };
      
      res.json(formattedSnapshot);
    } catch (error) {
      console.error("Error fetching latest snapshot:", error);
      res.status(500).json({ 
        error: "Failed to fetch latest snapshot",
        message: "Please try again later." 
      });
    }
  });

  // Get snapshot stats
  app.get("/api/snapshots/:id/stats", async (req: Request, res: Response) => {
    try {
      const snapshotId = parseInt(req.params.id);
      const stats = await storage.getSnapshotStats(snapshotId);
      res.json(stats);
    } catch (error) {
      console.error(`Error fetching stats for snapshot ${req.params.id}:`, error);
      res.status(500).json({ 
        error: "Failed to fetch snapshot stats",
        message: "Please try again later." 
      });
    }
  });

  // Get agents for a specific snapshot
  app.get("/api/snapshots/:id/agents", async (req: Request, res: Response) => {
    try {
      const snapshotId = parseInt(req.params.id);
      
      // Parse query filters
      const filters = {
        search: req.query.search as string | undefined,
        minScore: req.query.minScore ? parseInt(req.query.minScore as string) : undefined,
        maxScore: req.query.maxScore ? parseInt(req.query.maxScore as string) : undefined,
        city: req.query.city as string | undefined,
        sortBy: req.query.sortBy as "score" | "score_asc" | "followers" | "likes" | "retweets" | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      };
      
      // Get agents from the database
      const agents = await storage.getAgents(snapshotId, filters);
      
      // Apply any additional filtering and sorting that might not be handled at the DB level
      const { agents: filteredAgents, totalCount } = filterAgents(agents, filters);
      
      // Set pagination metadata
      res.setHeader('X-Total-Count', totalCount.toString());
      res.setHeader('X-Page', (filters.page || 1).toString());
      res.setHeader('X-Page-Size', (filters.limit || 50).toString());
      
      res.json(filteredAgents);
    } catch (error) {
      console.error(`Error fetching agents for snapshot ${req.params.id}:`, error);
      res.status(500).json({ 
        error: "Failed to fetch snapshot agents",
        message: "Please try again later." 
      });
    }
  });

  // Create HTTP server
  const server = createServer(app);
  return server;
}