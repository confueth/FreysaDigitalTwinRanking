
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

// Global variable to track if we've already logged timezone info
let timezoneDone = false;

// Set timezone to America/New_York (EST/EDT) for all queries
pool.on('connect', async (client) => {
  try {
    await client.query('SET timezone = \'America/New_York\'');
    
    // Only log this message once
    if (!timezoneDone) {
      console.log('Connected to database with timezone set to America/New_York');
      timezoneDone = true;
    }
  } catch (err) {
    console.error('Error setting timezone on connection:', err);
  }
});

// Execute a query to verify timezone setting - separate from connection event
// to avoid race conditions
(async () => {
  try {
    // Allow some time for connection pool to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const client = await pool.connect();
    try {
      await client.query('SET timezone = \'America/New_York\'');
      const result = await client.query('SHOW timezone;');
      const timezone = result.rows[0].TimeZone || result.rows[0].timezone;
      
      if (timezone) {
        console.log('Database timezone set to:', timezone);
      } else {
        console.error('Unable to determine timezone. Column present:', Object.keys(result.rows[0]).join(', '));
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error verifying database timezone:', err);
  }
})();

export const db = drizzle({ client: pool, schema });
