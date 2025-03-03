import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import path from 'path';
import fs from 'fs';
import { getLiveLeaderboardData, getLiveAgentDetail, filterAgents, getLiveStats, getAvailableCities } from './live-api';
import { storage } from './storage';
import { createSnapshot } from './snapshot-service';

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
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      };
      
      // Get live data from API with fallback to snapshot data
      let liveData;
      try {
        console.log("Fetching fresh leaderboard data");
        liveData = await getLiveLeaderboardData();
      } catch (apiError) {
        console.error("Error fetching live data, will attempt to use snapshot data", apiError);
        
        // Fallback to latest snapshot data if live API fails
        const latestSnapshot = await storage.getLatestSnapshot();
        if (latestSnapshot) {
          console.log(`Falling back to snapshot #${latestSnapshot.id} data`);
          liveData = await storage.getAgents(latestSnapshot.id);
        } else {
          throw new Error("No fallback data available");
        }
      }
      
      // Apply filters
      const { agents, totalCount } = filterAgents(liveData, filters);
      
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
        
        // Try to find a snapshot from approximately 24 hours ago
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        let closestSnapshot = null;
        let minTimeDiff = Infinity;
        
        // Find the snapshot closest to 24 hours ago
        for (const snapshot of snapshots) {
          const timeDiff = Math.abs(snapshot.timestamp.getTime() - oneDayAgo.getTime());
          if (timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            closestSnapshot = snapshot;
          }
        }
        
        // If we found a usable snapshot and it's not the same as the current one
        if (closestSnapshot && agent.snapshotId !== closestSnapshot.id) {
          console.log(`Using snapshot #${closestSnapshot.id} for previous day comparison`);
          
          // Get the agent data from that snapshot
          const previousDayAgent = await storage.getAgent(closestSnapshot.id, username);
          
          if (previousDayAgent) {
            // Add previous day data for comparison
            agent.prevScore = previousDayAgent.score;
            agent.prevRank = previousDayAgent.rank;
            // Record when the previous data was collected
            agent.prevTimestamp = closestSnapshot.timestamp.toISOString();
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

  // Get agent history data
  app.get("/api/agents/:username/history", async (req: Request, res: Response) => {
    try {
      const username = req.params.username;
      
      // First check if we have this agent in our database
      const historyData = await storage.getAgentHistory(username);
      
      if (historyData && historyData.length > 0) {
        // Convert agent data to expected API format
        const formattedData = historyData.map(agent => {
          // Create snapshot timestamp from creation time if available, or use current time
          const timestamp = agent.bioUpdatedAt 
            ? agent.bioUpdatedAt.toISOString() 
            : new Date().toISOString();
          
          return {
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
            bioUpdatedAt: agent.bioUpdatedAt?.toISOString(),
            ubiClaimedAt: agent.ubiClaimedAt?.toISOString(),
            timestamp: timestamp
          };
        });
        
        return res.json(formattedData);
      }
      
      // If we don't have historical data, get at least the current agent
      let currentAgent;
      try {
        currentAgent = await getLiveAgentDetail(username);
      } catch (apiError) {
        console.error(`Error fetching live agent data for ${username}, will try snapshot fallback`, apiError);
        
        // Try to get the agent from the most recent snapshot
        const latestSnapshot = await storage.getLatestSnapshot();
        if (latestSnapshot) {
          const agentFromSnapshot = await storage.getAgent(latestSnapshot.id, username);
          if (agentFromSnapshot) {
            console.log(`Using agent data from snapshot #${latestSnapshot.id}`);
            
            // Convert to the expected format
            currentAgent = {
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
              bioUpdatedAt: agentFromSnapshot.bioUpdatedAt?.toISOString(),
              ubiClaimedAt: agentFromSnapshot.ubiClaimedAt?.toISOString()
            };
          }
        }
      }
      
      if (!currentAgent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      // Return just the current data point
      const current = {
        ...currentAgent,
        timestamp: new Date().toISOString()
      };
      
      res.json([current]);
    } catch (error) {
      console.error(`Error fetching agent history ${req.params.username}:`, error);
      res.status(500).json({ 
        error: "Failed to fetch agent history",
        message: "Please try again later. Using fallback snapshot data when available."
      });
    }
  });
  
  // Helper function to generate synthetic historical data
  function generateHistoricalData(currentAgent: any) {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const data = [];
    
    // Include the current data as the most recent entry
    const current = {
      ...currentAgent,
      timestamp: now.toISOString()
    };
    data.push(current);
    
    // Generate data for the past 30 days at 3-day intervals
    for (let i = 1; i <= 10; i++) {
      const date = new Date(now.getTime() - (i * 3 * oneDay));
      
      // Start with the currentAgent values as a base
      const historicalEntry = { ...currentAgent };
      
      // Add timestamp
      historicalEntry.timestamp = date.toISOString();
      
      // Adjust score gradually (smaller values in the past)
      const randomFactor = 0.97 + (Math.random() * 0.06); // 0.97 to 1.03
      historicalEntry.score = Math.round(currentAgent.score * Math.pow(randomFactor - (i * 0.015), i));
      
      // Adjust followers
      if (historicalEntry.followersCount) {
        historicalEntry.followersCount = Math.round(
          currentAgent.followersCount * Math.pow(0.95 + (Math.random() * 0.05), i)
        );
      }
      
      // Adjust likes
      if (historicalEntry.likesCount) {
        historicalEntry.likesCount = Math.round(
          currentAgent.likesCount * Math.pow(0.94 + (Math.random() * 0.06), i)
        );
      }
      
      // Adjust retweets
      if (historicalEntry.retweetsCount) {
        historicalEntry.retweetsCount = Math.round(
          currentAgent.retweetsCount * Math.pow(0.93 + (Math.random() * 0.07), i)
        );
      }
      
      data.push(historicalEntry);
    }
    
    return data;
  }

  // Get stats
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      let stats;
      
      try {
        // First try to get live stats
        stats = await getLiveStats();
      } catch (apiError) {
        console.error("Error fetching live stats, will attempt to use snapshot data", apiError);
        
        // Fallback to latest snapshot stats
        const latestSnapshot = await storage.getLatestSnapshot();
        if (latestSnapshot) {
          console.log(`Falling back to snapshot #${latestSnapshot.id} stats data`);
          stats = await storage.getSnapshotStats(latestSnapshot.id);
        } else {
          throw new Error("No fallback stats data available");
        }
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ 
        error: "Failed to fetch stats",
        message: "Please try again later. Using fallback snapshot data when available."
      });
    }
  });

  // Get cities for filtering
  app.get("/api/cities", async (req: Request, res: Response) => {
    try {
      let cities: string[] = [];
      
      try {
        // First try to get live cities data
        cities = getAvailableCities();
      } catch (apiError) {
        console.error("Error getting available cities, will try fallback", apiError);
        
        // If the cache fails, try to extract cities from the latest snapshot
        const latestSnapshot = await storage.getLatestSnapshot();
        if (latestSnapshot) {
          console.log(`Using cities from snapshot #${latestSnapshot.id}`);
          const agents = await storage.getAgents(latestSnapshot.id);
          
          // Extract unique cities
          const citySet = new Set<string>();
          agents.forEach(agent => {
            if (agent.city) {
              citySet.add(agent.city);
            }
          });
          
          cities = Array.from(citySet);
        }
      }
      
      // Sort alphabetically
      cities.sort();
      
      res.json(cities);
    } catch (error) {
      console.error("Error fetching cities:", error);
      res.status(500).json({ 
        error: "Failed to fetch cities",
        message: "Please try again later. Using fallback data when available."
      });
    }
  });
  
  // Manual snapshot creation endpoint
  app.post("/api/snapshots", async (req: Request, res: Response) => {
    try {
      const description = req.body.description || `Manual snapshot - ${new Date().toLocaleString()}`;
      const snapshotId = await createSnapshot(storage, description);
      
      if (snapshotId) {
        res.status(201).json({ 
          id: snapshotId, 
          message: `Snapshot created successfully`,
          description
        });
      } else {
        res.status(500).json({ error: "Failed to create snapshot" });
      }
    } catch (error) {
      console.error("Error creating snapshot:", error);
      res.status(500).json({ error: "Failed to create snapshot" });
    }
  });
  
  // Backward compatibility endpoints
  
  // Get all snapshots
  app.get("/api/snapshots", async (req: Request, res: Response) => {
    try {
      const snapshots = await storage.getSnapshots();
      
      // Format snapshots for API consistency
      const formattedSnapshots = snapshots.map(snapshot => ({
        id: snapshot.id,
        timestamp: snapshot.timestamp.toISOString(),
        description: snapshot.description || "Snapshot"
      }));
      
      res.json(formattedSnapshots);
    } catch (error) {
      console.error("Error fetching snapshots:", error);
      res.status(500).json({ error: "Failed to fetch snapshots" });
    }
  });
  
  // Get latest snapshot
  app.get("/api/snapshots/latest", async (req: Request, res: Response) => {
    try {
      const latestSnapshot = await storage.getLatestSnapshot();
      
      if (latestSnapshot) {
        res.json({
          id: latestSnapshot.id,
          timestamp: latestSnapshot.timestamp.toISOString(),
          description: latestSnapshot.description || "Latest Snapshot"
        });
      } else {
        // If no snapshots exist yet, return default
        res.json({
          id: 1,
          timestamp: new Date().toISOString(),
          description: "Live Data"
        });
      }
    } catch (error) {
      console.error("Error fetching latest snapshot:", error);
      res.status(500).json({ error: "Failed to fetch latest snapshot" });
    }
  });
  
  // Get stats for a snapshot
  app.get("/api/snapshots/:id/stats", async (req: Request, res: Response) => {
    try {
      const snapshotId = parseInt(req.params.id);
      
      // If the ID is invalid, return an error
      if (isNaN(snapshotId)) {
        return res.status(400).json({ error: "Invalid snapshot ID" });
      }
      
      // Check if the snapshot exists
      const snapshot = await storage.getSnapshot(snapshotId);
      if (!snapshot) {
        return res.status(404).json({ error: "Snapshot not found" });
      }
      
      // Get the snapshot stats
      const stats = await storage.getSnapshotStats(snapshotId);
      
      res.json(stats);
    } catch (error) {
      console.error(`Error fetching stats for snapshot ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch snapshot stats" });
    }
  });
  
  // Get agents for a specific snapshot
  app.get("/api/snapshots/:id/agents", async (req: Request, res: Response) => {
    try {
      const snapshotId = parseInt(req.params.id);
      
      // If the ID is invalid, return an error
      if (isNaN(snapshotId)) {
        return res.status(400).json({ error: "Invalid snapshot ID" });
      }
      
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
      
      // Check if the snapshot exists
      const snapshot = await storage.getSnapshot(snapshotId);
      if (!snapshot) {
        // If snapshot doesn't exist, default to live data
        console.log(`Snapshot ${snapshotId} not found, using live data instead`);
        const liveData = await getLiveLeaderboardData();
        const { agents, totalCount } = filterAgents(liveData, filters);
        
        // Set pagination metadata in headers
        res.setHeader('X-Total-Count', totalCount.toString());
        res.setHeader('X-Page', (filters.page || 1).toString());
        res.setHeader('X-Page-Size', (filters.limit || 50).toString());
        
        return res.json(agents);
      }
      
      // Get snapshot agents
      const agents = await storage.getAgents(snapshotId, filters);
      const totalCount = agents.length; // We need a more efficient way to get count for pagination
      
      // Format the agents for the API
      const formattedAgents = agents.map(agent => ({
        id: agent.id.toString(),
        mastodonUsername: agent.mastodonUsername,
        score: agent.score,
        prevScore: agent.prevScore,
        avatarUrl: agent.avatarUrl,
        city: agent.city,
        likesCount: agent.likesCount,
        followersCount: agent.followersCount,
        retweetsCount: agent.retweetsCount,
        repliesCount: agent.repliesCount || null,
        rank: agent.rank,
        prevRank: agent.prevRank,
        walletAddress: agent.walletAddress,
        walletBalance: agent.walletBalance,
        mastodonBio: agent.mastodonBio,
        bioUpdatedAt: agent.bioUpdatedAt?.toISOString(),
        ubiClaimedAt: agent.ubiClaimedAt?.toISOString(),
        snapshotId: agent.snapshotId
      }));
      
      // Set pagination metadata in headers
      res.setHeader('X-Total-Count', totalCount.toString());
      res.setHeader('X-Page', (filters.page || 1).toString());
      res.setHeader('X-Page-Size', (filters.limit || 50).toString());
      
      res.json(formattedAgents);
    } catch (error) {
      console.error(`Error fetching agents for snapshot ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch agents data" });
    }
  });

  // Return HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
