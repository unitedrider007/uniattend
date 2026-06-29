import { pool } from "./src/dbPool.js";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";

async function runMigration() {
  console.log("🐘 [PostgreSQL] Initializing manual production database migration...");
  try {
    const schemaPath = path.join(process.cwd(), "schema.sql");
    if (!fs.existsSync(schemaPath)) {
      throw new Error("schema.sql not found at project root!");
    }

    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    console.log("⚙️ Running schema.sql queries...");
    await pool.query(schemaSql);

    console.log("⚙️ Ensuring database schema additions...");
    // Add announcements and substitute_assignments just in case
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
          id VARCHAR(255) PRIMARY KEY,
          teacher_id VARCHAR(255) REFERENCES teachers(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          target_id VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS substitute_assignments (
          id VARCHAR(255) PRIMARY KEY,
          teacher_id VARCHAR(255) REFERENCES teachers(id) ON DELETE CASCADE,
          substitute_id VARCHAR(255) REFERENCES teachers(id) ON DELETE CASCADE,
          subject_id VARCHAR(255) REFERENCES subjects(id) ON DELETE CASCADE,
          created_at TIMESTAMP NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          UNIQUE(teacher_id, subject_id, is_active)
      );
    `);

    // Create timetable table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS timetable (
          id VARCHAR(255) PRIMARY KEY,
          batch_id VARCHAR(255) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
          subject_id VARCHAR(255) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
          teacher_id VARCHAR(255) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
          day_of_week VARCHAR(50) NOT NULL,
          start_time VARCHAR(50) NOT NULL,
          end_time VARCHAR(50) NOT NULL,
          classroom VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(batch_id, day_of_week, start_time)
      );
    `);

    try {
      await pool.query("ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;");
    } catch (rlsErr) {
      // safe to ignore
    }

    // Add refresh_tokens table for secure token handling
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
          token VARCHAR(500) PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMP NOT NULL
      );
    `);

    // Add Row Level Security on refresh_tokens table
    try {
      await pool.query("ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;");
    } catch (rlsErr) {
      // safe to ignore if already enabled
    }

    try {
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE;");
    } catch (colErr) {
      // safe to ignore if already exists or fails
    }

    console.log("⚙️ Ensuring proper database index optimizations...");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_students_enrollment ON students(enrollment_number);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_teachers_employee ON teachers(employee_id);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_attendance_composite ON attendance_records(student_id, subject_id, date);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);");

    console.log("🔒 [Security Migration] Flushing legacy plain/raw refresh tokens table...");
    await pool.query("TRUNCATE TABLE refresh_tokens CASCADE;");

    console.log("🔒 [Security Migration] Scanning and converting all unhashed plaintext passwords in database to bcrypt...");
    const usersRes = await pool.query("SELECT id, email, password_hash FROM users");
    let convertedCount = 0;
    for (const row of usersRes.rows) {
      const hash = row.password_hash;
      const looksHashed = hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$");
      if (!looksHashed) {
        console.log(`🔑 Migration converting plaintext password for user: ${row.email}`);
        const strongHash = await bcrypt.hash(hash, 12);
        await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [strongHash, row.id]);
        convertedCount++;
      }
    }
    console.log(`✅ [Security Migration] Converted ${convertedCount} user records of plaintext passwords to secure bcrypt hashes.`);

    console.log("✅ [PostgreSQL] Migration successfully executed.");
    process.exit(0);
  } catch (err) {
    console.error("❌ [PostgreSQL] Manual migration failed:", err);
    process.exit(1);
  }
}

runMigration();
