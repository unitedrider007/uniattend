import dotenv from "dotenv";
import pg from "pg";

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === "production") {
  console.error("❌ CRITICAL: DATABASE_URL environment variable is not set for production environment. Deployment will fail.");
}

export const pool = new Pool({
  connectionString: connectionString,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : undefined,
  // Serverless optimization: avoid holding massive pools in stateless ephemeral lambdas
  max: process.env.NODE_ENV === "production" ? 2 : 10,
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 5000
});

pool.on("connect", () => {
  // connection successful from pool
});

pool.on("error", (err) => {
  console.error("❌ [PostgreSQL] Idle client connection pool error:", err);
});
