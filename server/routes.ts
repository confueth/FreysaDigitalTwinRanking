import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import path from 'path';
import fs from 'fs';
import { getLiveLeaderboardData, getLiveAgentDetail, filterAgents, getLiveStats, getAvailableCities } from './live-api';
import { adminLoginSchema } from '../shared/schema';
import { storage } from './storage';

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
  
  // Admin authentication routes
  app.post("/api/admin/register", async (req: Request, res: Response) => {
    try {
      // Parse and validate the user data
      const userData = adminLoginSchema.parse(req.body);
      
      // Check if a user with the same username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Create the new admin user
      const newUser = await storage.createUser({
        username: userData.username,
        password: userData.password,
        isAdmin: true,
      });
      
      // Return the user data (without the password)
      const { password, ...userWithoutPassword } = newUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating admin user:", error);
      res.status(400).json({ 
        error: "Invalid user data", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      // Parse and validate the login data
      const loginData = adminLoginSchema.parse(req.body);
      
      // Verify the credentials
      const isValid = await storage.verifyAdminCredentials(
        loginData.username,
        loginData.password
      );
      
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Get the user data
      const user = await storage.getUserByUsername(loginData.username);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Set up the session
      if (req.session) {
        req.session.userId = user.id;
        req.session.isAdmin = user.isAdmin;
      }
      
      // Return the user data (without the password)
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(400).json({ 
        error: "Invalid login data", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  app.post("/api/admin/logout", (req: Request, res: Response) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).json({ error: "Failed to logout" });
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
      });
    } else {
      res.json({ message: "Not logged in" });
    }
  });
  
  app.get("/api/admin/me", (req: Request, res: Response) => {
    if (req.session && req.session.userId) {
      res.json({
        userId: req.session.userId,
        isAdmin: req.session.isAdmin || false,
      });
    } else {
      res.status(401).json({ error: "Not authenticated" });
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
      
      // Get live data from API
      const liveData = await getLiveLeaderboardData();
      
      // Apply filters
      const { agents, totalCount } = filterAgents(liveData, filters);
      
      // Set pagination metadata in headers
      res.setHeader('X-Total-Count', totalCount.toString());
      res.setHeader('X-Page', (filters.page || 1).toString());
      res.setHeader('X-Page-Size', (filters.limit || 50).toString());
      
      res.json(agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ error: "Failed to fetch agents data" });
    }
  });

  // Get agent details
  app.get("/api/agents/:username", async (req: Request, res: Response) => {
    try {
      const username = req.params.username;
      const agent = await getLiveAgentDetail(username);
      
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      res.json(agent);
    } catch (error) {
      console.error(`Error fetching agent ${req.params.username}:`, error);
      res.status(500).json({ error: "Failed to fetch agent data" });
    }
  });

  // Get agent history data
  app.get("/api/agents/:username/history", async (req: Request, res: Response) => {
    try {
      const username = req.params.username;
      
      // Get the agent data from the database
      const historyData = await storage.getAgentHistory(username);
      
      if (historyData.length === 0) {
        // If we don't have any history, just return the current data
        const currentAgent = await getLiveAgentDetail(username);
        
        if (!currentAgent) {
          return res.status(404).json({ error: "Agent not found" });
        }
        
        // Return just the current data with timestamp
        res.json([{
          ...currentAgent,
          timestamp: new Date().toISOString()
        }]);
      } else {
        // Return the historical data
        res.json(historyData);
      }
    } catch (error) {
      console.error(`Error fetching agent history ${req.params.username}:`, error);
      res.status(500).json({ error: "Failed to fetch agent history" });
    }
  });

  // Get stats
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const stats = await getLiveStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Get cities for filtering
  app.get("/api/cities", async (req: Request, res: Response) => {
    try {
      const cities = getAvailableCities();
      res.json(cities);
    } catch (error) {
      console.error("Error fetching cities:", error);
      res.status(500).json({ error: "Failed to fetch cities" });
    }
  });
  
  // Snapshot endpoints
  
  // Get all snapshots
  app.get("/api/snapshots", async (req: Request, res: Response) => {
    try {
      const snapshots = await storage.getSnapshots();
      res.json(snapshots);
    } catch (error) {
      console.error("Error fetching snapshots:", error);
      res.status(500).json({ error: "Failed to fetch snapshots" });
    }
  });
  
  // Create a new snapshot (admin only)
  app.post("/api/snapshots", async (req: Request, res: Response) => {
    // Check if user is logged in and is an admin
    if (!req.session?.userId || !req.session?.isAdmin) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const { description } = req.body;
      const snapshot = await storage.createSnapshot({
        timestamp: new Date(),
        description: description || null,
        createdBy: req.session.userId
      });
      
      res.json(snapshot);
    } catch (error) {
      console.error("Error creating snapshot:", error);
      res.status(500).json({ error: "Failed to create snapshot" });
    }
  });
  
  // Delete a snapshot (admin only)
  app.delete("/api/snapshots/:id", async (req: Request, res: Response) => {
    // Check if user is logged in and is an admin
    if (!req.session?.userId || !req.session?.isAdmin) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSnapshot(id);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Snapshot not found" });
      }
    } catch (error) {
      console.error("Error deleting snapshot:", error);
      res.status(500).json({ error: "Failed to delete snapshot" });
    }
  });
  
  // Snapshot latest - for backwards compatibility
  app.get("/api/snapshots/latest", async (req: Request, res: Response) => {
    try {
      const snapshot = await storage.getLatestSnapshot();
      if (snapshot) {
        res.json(snapshot);
      } else {
        // If no snapshot exists, return a mock snapshot for compatibility
        res.json({
          id: 1,
          timestamp: new Date().toISOString(),
          description: "Live Data"
        });
      }
    } catch (error) {
      console.error("Error fetching latest snapshot:", error);
      // Fall back to mock data on error
      res.json({
        id: 1,
        timestamp: new Date().toISOString(),
        description: "Live Data"
      });
    }
  });
  
  // Get stats for a snapshot
  app.get("/api/snapshots/:id/stats", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // If snapshot exists, get its stats
      const snapshot = await storage.getSnapshot(id);
      if (snapshot) {
        const stats = await storage.getSnapshotStats(id);
        res.json(stats);
      } else {
        // Fallback to live stats
        const liveStats = await getLiveStats();
        res.json(liveStats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
  
  // Get agents for a specific snapshot 
  app.get("/api/snapshots/:id/agents", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
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
      
      // If the snapshot exists, get its agents
      const snapshot = await storage.getSnapshot(id);
      let agents;
      let totalCount;
      
      if (snapshot) {
        // Get agents for this snapshot
        agents = await storage.getAgents(id, filters);
        totalCount = agents.length;
      } else {
        // Fallback to live data
        const liveData = await getLiveLeaderboardData();
        const filtered = filterAgents(liveData, filters);
        agents = filtered.agents;
        totalCount = filtered.totalCount;
      }
      
      // Set pagination metadata in headers
      res.setHeader('X-Total-Count', totalCount.toString());
      res.setHeader('X-Page', (filters.page || 1).toString());
      res.setHeader('X-Page-Size', (filters.limit || 50).toString());
      
      res.json(agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ error: "Failed to fetch agents data" });
    }
  });

  // Return HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
