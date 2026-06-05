# Step-by-Step Deployment & PostgreSQL Database Integration Guide

This guide describes how to run, locally test, link a persistent PostgreSQL database, and build/deploy the **National Forensic Sciences University (NFSU), Delhi Campus - University Attendance Management System (UAMS)**.

---

## 🏛️ Section 1: Local Development Sandbox Startup

Before linking external state processors, launch the default application sandbox locally. The default setup includes a modular in-memory relational database model to facilitate client/server validation.

### 1. Prerequisites
Ensure you have the following installed on your developer machine:
*   **Node.js**: v18.0.0 or higher (v22 LTS is highly recommended).
*   **npm**: (Node Package Manager).
*   **PostgreSQL**: v14 or newer, running locally or accessed securely via a hosted endpoint (e.g., Supabase, Amazon RDS, Google Cloud SQL).

### 2. Dependency Setup
Extract the release package into your development space, navigate to the folder, and install all package trees:
```bash
# Safely install runtime framework dependencies
npm install
```

### 3. Local Configuration
Create an active local environment file to house runtime variables:
```bash
cp .env.example .env
```

Open `.env` and configure your credentials:
```env
PORT=3000
NODE_ENV=development

# PostgreSQL connection URI (replace with your active credentials)
DATABASE_URL="postgresql://postgres:yourprivatepassword@localhost:5432/uams_db"
```

### 4. Running the Dev Server
Launch the combined Express web server and Vite compiler on port `3000`:
```bash
npm run dev
```
Once booted, open your browser page to:
👉 **`http://localhost:3000`**

---

## 💾 Section 2: PostgreSQL Integration & Verification

To scale the platform for campus execution and persistent audits, follow these steps to link PostgreSQL.

### Step 1: Install PostgreSQL Client Libraries
Install the official Postgres Client library and TypeScript definitions:
```bash
npm install pg
npm install --save-dev @types/pg
```

### Step 2: Establish the Database Connection Pool (`dbPool.ts`)
Create a connection configuration file at `/src/dbPool.ts` (or at the root tier) to manage database connections efficiently:
```typescript
// dbPool.ts
import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/uams_db";

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" 
    ? { rejectUnauthorized: false } // Required for cloud environments like Heroku/Render/AWS
    : false
});

// Verify connection configuration on startup
pool.on("connect", () => {
  console.log("🐘 PostgreSQl Database client linked successfully.");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected database pool connection failure:", err);
});

export default pool;
```

---

### Step 3: Create the PostgreSQL Database Schema
To initialize the academic directory structure in your database, execute the sql schema file `./schema.sql` located at the root of this project tree.

Run the schema using your command-line CLI tool (e.g., `psql`):
```bash
# Execute the schema.sql file against your active database instance
psql -U postgres -d uams_db -f schema.sql
```

Alternatively, you can open `schema.sql`, copy its contents, and execute them as a query within PGAdmin, Supabase SQL Editor, DBeaver, or another SQL administration GUI.

---

### Step 4: Write Database Seeder Script (Optional, for fast initial setup)
Create a helper script `/scripts/seed-db.ts` to automatically populate your active PostgreSQL database with compliant default credentials:

```typescript
// scripts/seed-db.ts
import pool from "../dbPool";

async function seedDatabase() {
  const client = await pool.connect();
  try {
    console.log("🌱 Starting PostgreSQL directory seeding...");
    await client.query("BEGIN");

    // Clear old testing sets
    await client.query("TRUNCATE audit_logs, attendance_records, students, teachers, batches, departments, users RESTART IDENTITY CASCADE;");

    // Insert Department
    await client.query(`
      INSERT INTO departments (id, code, name, color) VALUES 
      ('dept-cs-111', 'DFS-CS', 'Digital Forensics & Cyber Security', 'indigo')
    `);

    // Insert Batch
    await client.query(`
      INSERT INTO batches (id, department_id, name, academic_year, semester) VALUES
      ('batch-cs-a-555', 'dept-cs-111', 'M.Sc. Cyber Security A-1', '2026', 3)
    `);

    // Insert Faculty (Teacher)
    await client.query(`
      INSERT INTO teachers (id, employee_id, full_name, email, phone, department_id) VALUES
      ('t-101', 'NFSU-EMP301', 'Prof. Raj Sharma', 'raj.sharma@nfsu.gov.in', '+91-98765-43210', 'dept-cs-111')
    `);

    // Insert Scholars (Student)
    await client.query(`
      INSERT INTO students (id, enrollment_number, roll_number, full_name, email, phone, batch_id, semester) VALUES
      ('s-101', 'NFSU2026101', 'CYBER-SE-01', 'Kartik Ranjan', 'kartik.ranjan.msc@nfsu.gov.in', '+91-98761-00001', 'batch-cs-a-555', 3)
    `);

    // Insert Authentication SSO Users
    await client.query(`
      INSERT INTO users (id, email, password_hash, role, target_id) VALUES
      ('u-admin', 'director.delhi@nfsu.gov.in', 'admin123', 'ADMIN', NULL),
      ('u-teacher', 'raj.sharma@nfsu.gov.in', 'teacher123', 'TEACHER', 't-101'),
      ('u-student', 'kartik.ranjan.msc@nfsu.gov.in', 'student123', 'STUDENT', 's-101')
    `);

    await client.query("COMMIT");
    console.log("✅ PostgreSQL seeding finished. Academic structures are fully operational!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding database aborted due to error:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
```

Execute this script by running:
```bash
npx tsx scripts/seed-db.ts
```

---

### Step 5: Test Database Connection Instantly
Verify that code files can connect to your local or cloud database without firing the full application. Create a basic verification script `test-conn.ts` in your root folder:

```typescript
// test-conn.ts
import pool from "./dbPool";

async function verifyConnection() {
  try {
    console.log("Establishing database handshake...");
    const res = await pool.query("SELECT NOW(), version();");
    console.log("✅ Verification Success!");
    console.log("Server current time:", res.rows[0].now);
    console.log("PostgreSQL server details:", res.rows[0].version);
  } catch (error) {
    console.error("❌ Handshake connection failed:", error);
  } finally {
    await pool.end();
  }
}

verifyConnection();
```

To run the connection test script:
```bash
npx tsx test-conn.ts
```

---

## 🧪 Section 3: Professional Local App Testing Workflow

Once the database configuration is confirmed, execute thorough manual testing. Use the built-in **Institutional Demo Portals** panel located directly under the login card for speedy authorization.

### 👥 Test Scenarios by User Role

#### 1. Administrator Testing Model (`director.delhi@nfsu.gov.in`)
*   **Verification Objective**: Validate general oversight, statistics dashboards, and department compliance calculations.
*   **Action Steps**:
    1.  Log in as **Campus Director** (autofill option available).
    2.  Check the total enrollment parameters, faculties registered, and overall average attendance metrics.
    3.  Confirm that charts display compliance details correctly, and check for the red danger warning banner indicating overall attendance is below 80%.

#### 2. Faculty / Professor Testing Model (`raj.sharma@nfsu.gov.in`)
*   **Verification Objective**: Validate starting lists, mark attendance sheets, and check audit compliance logs.
*   **Action Steps**:
    1.  Authenticate as **Dean Professor** Raj Sharma.
    2.  Click on **Mark Attendance** (in Desktop view) or select the **Marking** icon tab (in Mobile/Tablet view).
    3.  Select a subject/class and mark student present/absent states. Click the **Submit Biometric Ledger** button.
    4.  Navigate to **Correct Attendance** to modify existing session values. Note that updating triggers a mandatory correction modal requiring you to input professional remarks (e.g., *"Medical certificate submitted"*). This logs audits to PostgreSQL.
    5.  Navigate to **Audit Logs** to verify changes are logged.

#### 3. Scholar / Student Testing Model (`kartik.ranjan.msc@nfsu.gov.in`)
*   **Verification Objective**: Verify personalized lecture schedules, review overall attendance percentages, and check sessional warning banners.
*   **Action Steps**:
    1.  Authenticate as Graduate Student Kartik Ranjan.
    2.  Confirm that overall attendance matches database values (e.g., 78.5% visually rendered as an analytical progress ring).
    3.  Verify the prominent red header warning alerting the scholar that their status has fallen below the Delhi State Government mandate of 80% attendance.
    4.  Click on the **Timeline** tab to review previous biometric records.

---

## 📱 Section 4: Testing Mobile vs. Desktop Responsiveness

The application is fully adaptive. Ensure you test both major viewport sizes:

### 🖥️ Desktop Testing (Default)
*   **Expected Behavior**: Generous grid layouts with sidebar panels and permanent navigation elements. The header is locked to the top block.

### 📱 Tablet/Mobile Testing
*   **Expected Behavior**:
    *   To inspect mobile mode, right-click and select **Inspect -> Toggle Device Emulation** (choose a standard device e.g. iPhone 15, Pixel 8).
    *   The app adjusts dynamically, hiding complex grids and showing an elegant **tabbed bottom navigation menu** pinned to the screen at all times (`fixed bottom-0`).
    *   The header remains locked at the top of the interface (`fixed top-0 left-0 right-0`), and main page content smoothly scrolls in between.

---

## 🚀 Section 5: Production Build & Asset Compiling

When releasing to actual servers, run the local compilation pipeline to bundle resources:

```bash
# Triggers client assets compiling & backend node bundling
npm run build
```

This performs two major compilation tasks automatically:
1.  **Frontend Compilation**: Compiles React components, Tailwind styling frameworks, and lucide vectors into optimized static outputs inside `./dist`.
2.  **Backend Bundling**: Compiles our custom TypeScript `server.ts` entry point, producing a fast, self-contained **`dist/server.cjs`** target.

To test the compiled production build locally before uploading to your cloud container:
```bash
# Launch the production code locally in isolated production mode
npm run start
```
Verify that the output running on standard port `3000` is stable and functions exactly like development mode.

---
*UAMS Security Engineering Team • Academic DevOps and Security Division, National Forensic Sciences University, Ministry of Home Affairs, Government of India*
