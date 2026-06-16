import { pool } from "./src/dbPool.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

async function runSeeding() {
  console.log("🌱 [PostgreSQL] Checking database seeding...");
  try {
    const adminEmail = "admin@nfsu.gov.in";
    const checkAdmin = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [adminEmail]);

    if (checkAdmin.rowCount === 0) {
      console.log("🔒 Seeding secure default administrator user...");
      const bootstrapPassword = crypto.randomBytes(16).toString("hex");
      const passwordHash = await bcrypt.hash(bootstrapPassword, 12);
      await pool.query(
        "INSERT INTO users (id, email, password_hash, role, target_id, must_change_password) VALUES ($1, $2, $3, $4, $5, $6)",
        ["admin-system-1", adminEmail, passwordHash, "ADMIN", null, true]
      );
      console.log(`✅ Default administrator created successfully:\n  - Email: ${adminEmail}\n  - Password: ${bootstrapPassword}\n  [ACTION REQUIRED] Password must be changed upon first login.`);
    } else {
      console.log("ℹ️ Default administrator user already exists.");
    }
    
    console.log("🌱 Database seeding completed.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding database failed:", err);
    process.exit(1);
  }
}

runSeeding();
