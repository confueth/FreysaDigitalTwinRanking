import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { importAllCSVFiles } from "./csv-import";
import { storage } from "./storage";
import { pool } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup session
const PgStore = pgSession(session);
app.use(session({
  store: new PgStore({
    pool,
    tableName: 'sessions'
  }),
  secret: process.env.SESSION_SECRET || 'freysa-leaderboard-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    try {
      return originalResJson.apply(res, [bodyJson, ...args]);
    } catch (err) {
      console.error("Error in json response:", err);
      return res;
    }
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          if (logLine.length > 80) {
            logLine = logLine.slice(0, 79) + "…";
          }
        } catch (err) {
          console.error("Error stringifying response:", err);
          logLine += " :: [Complex object]";
        }
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);
  
  // Import CSV data on startup
  setTimeout(async () => {
    try {
      // Check if we already have snapshots from the CSV data
      const snapshots = await storage.getSnapshots();
      if (snapshots.length <= 1) { // Only the initial snapshot exists
        console.log("Importing CSV data on application startup...");
        await importAllCSVFiles(storage);
        console.log("CSV data import completed successfully");
      }
    } catch (error) {
      console.error("Error importing CSV data on startup:", error);
    }
  }, 5000); // Wait 5 seconds before importing

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    console.error(err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
