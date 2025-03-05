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

// Connect to PostgreSQL and ensure timezone is set to EST
const connectionStringWithTZ = `${process.env.DATABASE_URL}?options=timezone%3Damerica%2Fnew_york`;
export const pool = new Pool({ 
  connectionString: connectionStringWithTZ,
});

// Set timezone to EST for all queries
pool.on('connect', (client) => {
  client.query('SET timezone = \'EST\'');
});

export const db = drizzle({ client: pool, schema });
