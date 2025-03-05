import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Connect to PostgreSQL
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
});

// Set timezone to America/New_York (EST/EDT) for all queries
pool.on('connect', async (client) => {
  await client.query('SET timezone = \'America/New_York\'');
});

export const db = drizzle({ client: pool, schema });
