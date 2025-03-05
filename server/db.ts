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
  console.log('Connected to database with timezone set to America/New_York');
});

// Execute a query to set timezone immediately
(async () => {
  try {
    const client = await pool.connect();
    try {
      await client.query('SET timezone = \'America/New_York\'');
      const result = await client.query('SHOW timezone;');
      console.log('Database timezone set to:', result.rows[0].timezone);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error setting database timezone:', err);
  }
})();

export const db = drizzle({ client: pool, schema });
