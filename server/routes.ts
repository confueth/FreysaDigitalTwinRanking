import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { z } from "zod";
import { leaderboardEntrySchema, agentDetailsSchema, insertSnapshotSchema } from "@shared/schema";
import cron from "node-cron";

// API endpoints
const LEADERBOARD_API = "https://digital-clone-production.onrender.com/digital-clones/leaderboards?full=true";
const AGENT_DETAILS_API = "https://digital-clone-production.onrender.com/digital-clones/clones/";

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

  // Get all snapshots
  app.get("/api/snapshots", async (req: Request, res: Response) => {
    const snapshots = await storage.getSnapshots();
    res.json(snapshots);
  });

  // Get latest snapshot
  app.get("/api/snapshots/latest", async (req: Request, res: Response) => {
    const snapshot = await storage.getLatestSnapshot();
    if (!snapshot) {
      return res.status(404).json({ error: "No snapshots available" });
    }
    res.json(snapshot);
  });

  // Get specific snapshot
  app.get("/api/snapshots/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid snapshot ID" });
    }
    
    const snapshot = await storage.getSnapshot(id);
    if (!snapshot) {
      return res.status(404).json({ error: "Snapshot not found" });
    }
    
    res.json(snapshot);
  });

  // Get agents for a specific snapshot with filtering
  app.get("/api/snapshots/:id/agents", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid snapshot ID" });
    }
    
    const snapshot = await storage.getSnapshot(id);
    if (!snapshot) {
      return res.status(404).json({ error: "Snapshot not found" });
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
    
    const agents = await storage.getAgents(id, filters);
    res.json(agents);
  });

  // Get latest agents with filtering
  app.get("/api/agents", async (req: Request, res: Response) => {
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
    
    const agents = await storage.getLatestAgents(filters);
    res.json(agents);
  });

  // Get agent details
  app.get("/api/agents/:username", async (req: Request, res: Response) => {
    const username = req.params.username;
    const latestSnapshot = await storage.getLatestSnapshot();
    
    if (!latestSnapshot) {
      return res.status(404).json({ error: "No snapshots available" });
    }
    
    const agent = await storage.getAgent(latestSnapshot.id, username);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }
    
    // Get agent's tweets
    const tweets = await storage.getTweets(agent.id);
    
    res.json({
      ...agent,
      tweets,
    });
  });

  // Get agent history across snapshots
  app.get("/api/agents/:username/history", async (req: Request, res: Response) => {
    const username = req.params.username;
    const history = await storage.getAgentHistory(username);
    
    if (history.length === 0) {
      return res.status(404).json({ error: "Agent history not found" });
    }
    
    res.json(history);
  });

  // Get stats for a snapshot
  app.get("/api/snapshots/:id/stats", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid snapshot ID" });
    }
    
    const snapshot = await storage.getSnapshot(id);
    if (!snapshot) {
      return res.status(404).json({ error: "Snapshot not found" });
    }
    
    const stats = await storage.getSnapshotStats(id);
    res.json(stats);
  });

  // Get cities for filtering
  app.get("/api/cities", async (req: Request, res: Response) => {
    const latestSnapshot = await storage.getLatestSnapshot();
    
    if (!latestSnapshot) {
      return res.status(404).json({ error: "No snapshots available" });
    }
    
    const agents = await storage.getAgents(latestSnapshot.id);
    const cities = [...new Set(agents.map(agent => agent.city).filter(Boolean))];
    
    res.json(cities);
  });

  // Take a new snapshot manually
  app.post("/api/snapshots", async (req: Request, res: Response) => {
    try {
      const result = insertSnapshotSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid snapshot data" });
      }
      
      const snapshot = await takeSnapshot(result.data.description || "Manual snapshot");
      res.json(snapshot);
    } catch (error) {
      console.error("Error taking snapshot:", error);
      res.status(500).json({ error: "Failed to take snapshot" });
    }
  });

  // Schedule automatic snapshots every hour
  setupAutomaticSnapshots();

  const httpServer = createServer(app);
  return httpServer;
}

// Function to fetch leaderboard data and create a snapshot
async function takeSnapshot(description: string): Promise<any> {
  try {
    // Create a new snapshot
    const snapshot = await storage.createSnapshot({ description });
    
    // Fetch leaderboard data
    const response = await axios.get(LEADERBOARD_API);
    const leaderboardData = response.data;
    
    // Validate and parse leaderboard data
    const validatedEntries = z.array(leaderboardEntrySchema).parse(leaderboardData);
    
    // Import leaderboard data
    await storage.importLeaderboardData(validatedEntries, snapshot.id);
    
    // For the top 10 agents, fetch and store additional details
    const agents = await storage.getAgents(snapshot.id, { limit: 10 });
    
    for (const agent of agents) {
      try {
        // Fetch agent details
        const detailsResponse = await axios.get(`${AGENT_DETAILS_API}${agent.mastodonUsername}`);
        const agentDetails = detailsResponse.data;
        
        // Validate and parse agent details
        const validatedDetails = agentDetailsSchema.parse(agentDetails);
        
        // Import agent details
        await storage.importAgentDetails(agent.mastodonUsername, validatedDetails, snapshot.id);
      } catch (error) {
        console.error(`Error fetching details for agent ${agent.mastodonUsername}:`, error);
      }
    }
    
    return snapshot;
  } catch (error) {
    console.error("Error taking snapshot:", error);
    throw error;
  }
}

// Setup automatic snapshots every hour
function setupAutomaticSnapshots() {
  // Schedule a snapshot every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    try {
      const timestamp = new Date().toISOString();
      console.log(`Taking automatic snapshot at ${timestamp}`);
      await takeSnapshot(`Automatic snapshot - ${timestamp}`);
      console.log("Automatic snapshot completed successfully");
    } catch (error) {
      console.error("Automatic snapshot failed:", error);
    }
  });
  
  // Take initial snapshot when server starts
  setTimeout(async () => {
    try {
      if ((await storage.getSnapshots()).length === 0) {
        console.log("Taking initial snapshot...");
        await takeSnapshot("Initial snapshot");
        console.log("Initial snapshot completed successfully");
      }
    } catch (error) {
      console.error("Initial snapshot failed:", error);
    }
  }, 2000);
}
