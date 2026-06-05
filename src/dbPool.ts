if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

import pg from "pg";
const { Pool } = pg;
// Load connection string from environment context
const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === "production") {
  console.error("❌ CRITICAL: DATABASE_URL environment variable is not set for production environment. Deployment will fail.");
  process.exit(1);
}

export const pool = new Pool({
  connectionString: connectionString,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : undefined
});

pool.on("connect", () => {
  // connection successful from pool
});

pool.on("error", (err) => {
  console.error("❌ [PostgreSQL] Idle client connection pool error:", err);
});
