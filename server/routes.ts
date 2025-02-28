import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import path from 'path';
import fs from 'fs';
import { getLiveLeaderboardData, getLiveAgentDetail, filterAgents, getLiveStats, getAvailableCities } from './live-api';

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

  // This is a placeholder for compatibility
  app.get("/api/agents/:username/history", async (req: Request, res: Response) => {
    try {
      const username = req.params.username;
      const agent = await getLiveAgentDetail(username);
      
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      // Return current agent as a single-item array for backwards compatibility
      res.json([agent]);
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
