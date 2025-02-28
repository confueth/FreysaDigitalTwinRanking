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
      
      // Attempt to get the current agent data
      const currentAgent = await getLiveAgentDetail(username);
      
      if (!currentAgent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      // Generate synthetic historical data for demonstration purposes
      // In a real app, this would be fetched from the database
      const historyData = generateHistoricalData(currentAgent);
      
      res.json(historyData);
    } catch (error) {
      console.error(`Error fetching agent history ${req.params.username}:`, error);
      res.status(500).json({ error: "Failed to fetch agent history" });
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
  
  // Backward compatibility endpoints
  
  // Snapshot latest - for backwards compatibility
  app.get("/api/snapshots/latest", async (req: Request, res: Response) => {
    const snapshot = {
      id: 1,
      timestamp: new Date().toISOString(),
      description: "Live Data"
    };
    res.json(snapshot);
  });
  
  // Get stats for a snapshot - for backwards compatibility
  app.get("/api/snapshots/:id/stats", async (req: Request, res: Response) => {
    try {
      const stats = await getLiveStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
  
  // Get agents for a specific snapshot - for backwards compatibility
  app.get("/api/snapshots/:id/agents", async (req: Request, res: Response) => {
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

  // Return HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
