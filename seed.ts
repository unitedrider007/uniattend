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

    if (process.env.NODE_ENV !== "production") {
      // Seed test HOD account for easy evaluation
      const hodEmail = "hod@nfsu.gov.in";
      const checkHod = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [hodEmail]);
      if (checkHod.rowCount === 0) {
        console.log("🔒 Seeding easy-access HOD administrator...");
        const passwordHash = await bcrypt.hash("hod12345", 12);
        await pool.query(
          "INSERT INTO users (id, email, password_hash, role, target_id, must_change_password) VALUES ($1, $2, $3, $4, $5, $6)",
          ["hod-test-1", hodEmail, passwordHash, "ADMIN", null, false]
        );
        console.log(`✅ Test HOD created:\n  - Email: ${hodEmail}\n  - Password: HOD_PASSWORD_hod12345`);
      }

      // Seed test Executive account for easy evaluation
      const execEmail = "executive@nfsu.gov.in";
      const checkExec = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [execEmail]);
      if (checkExec.rowCount === 0) {
        console.log("🔒 Seeding easy-access Executive user...");
        const passwordHash = await bcrypt.hash("executive12345", 12);
        await pool.query(
          "INSERT INTO users (id, email, password_hash, role, target_id, must_change_password) VALUES ($1, $2, $3, $4, $5, $6)",
          ["exec-test-1", execEmail, passwordHash, "EXECUTIVE", null, false]
        );
        console.log(`✅ Test Executive created:\n  - Email: ${execEmail}\n  - Password: EXECUTIVE_PASSWORD_executive12345`);
      }
    }
    
    console.log("🌱 Database seeding completed.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding database failed:", err);
    process.exit(1);
  }
}

runSeeding();
