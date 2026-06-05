import dotenv from "dotenv";
dotenv.config();
console.log("DATABASE_URL =", process.env.DATABASE_URL);

import pg from "pg";
const { Pool } = pg;
// Load connection string from environment context
const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === "production") {
  console.warn("⚠️ [PostgreSQL] WARNING: DATABASE_URL environment variable is missing.");
}

export const pool = new Pool({
  connectionString: connectionString || "postgresql://postgres:sql@localhost:5432/uams_db",
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
