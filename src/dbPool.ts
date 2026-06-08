import dotenv from "dotenv";
import pg from "pg";

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

const hasSupabaseUrl = connectionString && (
  connectionString.includes("supabase.co") || 
  connectionString.includes("supabase.com") || 
  connectionString.includes("pooler.supabase.com")
);

export const pool = new Pool({
  connectionString: connectionString || undefined,
  ssl: (process.env.NODE_ENV === "production" || hasSupabaseUrl)
    ? { rejectUnauthorized: false }
    : undefined,
  // Supabase / Neon pooled connection settings increased to 50 for safety
  max: 50,
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 5000
});

pool.on("connect", () => {
  // connection successful from pool
});

pool.on("error", (err) => {
  console.error("❌ [PostgreSQL] Idle client connection pool error:", err);
});
