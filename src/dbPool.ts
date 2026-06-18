import dotenv from "dotenv";
import pg from "pg";

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const { Pool } = pg;

let connectionString = process.env.DATABASE_URL;

// Optimize Supabase Connection Pooler to use port 6543 (Transaction Mode) instead of 5432 (Session Mode)
// Session Mode is restricted to 15 connections on free/developer tiers, whereas Transaction Mode can handle thousands.
if (connectionString && connectionString.includes("pooler.supabase.com")) {
  try {
    const parsedUrl = new URL(connectionString);
    if (parsedUrl.port === "5432" || !parsedUrl.port) {
      console.log("🔄 [dbPool] Automatically converting Supabase Pooler port from 5432 (session) to 6543 (transaction) to prevent connection limits...");
      parsedUrl.port = "6543";
      connectionString = parsedUrl.toString();
    }
  } catch (error: any) {
    console.error("⚠️ [dbPool] Failed to auto-convert database URL port:", error.message);
  }
}

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
  // Safe concurrent connection limit for transaction-pooled environments
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000
});

pool.on("connect", () => {
  // connection successful from pool
});

pool.on("error", (err) => {
  console.error("❌ [PostgreSQL] Idle client connection pool error:", err);
});
