import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { pool } from "./src/dbPool.js";
import { authenticateToken, authorize, AuthenticatedRequest } from "./src/authMiddleware.js";
import {
  loginSchema,
  studentSchema,
  teacherSchema,
  departmentSchema,
  batchSchema,
  subjectSchema,
  markAttendanceSchema,
  editAttendanceSchema,
  announcementSchema,
  assignSubstituteSchema,
  validateRequest
} from "./src/validations.js";

interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  targetId?: string;
}

const mapUser = (r: any) => r ? { id: r.id, email: r.email, role: r.role, targetId: r.target_id } : null;
const mapDept = (r: any) => r ? { id: r.id, name: r.name, code: r.code, description: r.description || "", color: r.color || "indigo" } : null;
const mapBatch = (r: any) => r ? { id: r.id, name: r.name, semester: Number(r.semester), academicYear: r.academic_year, departmentId: r.department_id } : null;
const mapTeach = (r: any) => r ? { id: r.id, employeeId: r.employee_id, fullName: r.full_name, email: r.email, phone: r.phone || "", departmentId: r.department_id, profilePhotoUrl: r.profile_photo_url || "", isActive: r.is_active } : null;
const mapStu = (r: any) => r ? { id: r.id, enrollmentNumber: r.enrollment_number, rollNumber: r.roll_number, fullName: r.full_name, email: r.email, phone: r.phone || "", batchId: r.batch_id, semester: Number(r.semester), profilePhotoUrl: r.profile_photo_url || "", isActive: r.is_active } : null;
const mapSub = (r: any) => r ? { id: r.id, code: r.code, name: r.name, semester: Number(r.semester), departmentId: r.department_id, assignedTeacherId: r.assigned_teacher_id || "" } : null;

const mapAtt = (r: any) => {
  if (!r) return null;
  const d = new Date(r.date);
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { id: r.id, studentId: r.student_id, subjectId: r.subject_id, batchId: r.batch_id, date: dateStr, status: r.status };
};

const mapAudit = (r: any) => r ? { id: r.id, recordId: r.record_id, modifiedBy: r.modified_by, modifiedDate: r.modified_date, previousStatus: r.previous_status, newStatus: r.new_status, remarks: r.remarks || "", studentName: r.student_name || "Unknown Student", enrollmentNumber: r.enrollment_number || "N/A", subjectName: r.subject_name || "N/A", date: r.attendance_date ? new Date(r.attendance_date).toISOString().split('T')[0] : "N/A" } : null;
const mapNotif = (r: any) => r ? { id: r.id, userId: r.user_id, title: r.title, message: r.message, isRead: r.is_read, createdAt: r.created_at } : null;

const app = express();

// Trust reverse proxy (Cloud Run, load balancers, etc.) so that express-rate-limit
// can properly determine clients' IP addresses using the X-Forwarded-For header.
app.set("trust proxy", 1);

// Security Hardening Middlewares
app.use((req, res, next) => {
  const host = req.header("Host") || "";
  const isDevPreview = host.endsWith(".run.app") || host.endsWith(".google.com") || host.includes("localhost") || host.includes("127.0.0.1");

  if (process.env.NODE_ENV === "production" && !isDevPreview) {
    // Strict production security headers for official domain
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "*"],
          connectSrc: ["'self'", "https://nfsuuams.vercel.app"]
        }
      },
      frameguard: {
        action: "deny"
      }
    })(req, res, next);
  } else {
    // Relaxed security settings for dev/preview URLs to allow AI Studio frames and hot-reloading
    helmet({
      frameguard: false,
      contentSecurityPolicy: false
    })(req, res, next);
  }
});

const whitelist = ["https://nfsuuams.vercel.app"];
if (process.env.ALLOWED_ORIGINS) {
  const envOrigins = process.env.ALLOWED_ORIGINS.split(",")
    .map(o => o.trim())
    .filter(Boolean);
  whitelist.push(...envOrigins);
}

app.use(cors({
  origin: (origin, callback) => {
    // Non-browser user agents (like server-to-server or postman requests) have no origin
    if (!origin) {
      return callback(null, true);
    }
    try {
      const originHost = new URL(origin).host;
      const isDevPreview = originHost.endsWith(".run.app") || originHost.endsWith(".google.com") || originHost.includes("localhost") || originHost.includes("127.0.0.1");
      
      // Allow if it is development mode, is same-origin, matches dev/preview URL, or is whitelisted
      if (process.env.NODE_ENV !== "production" || isDevPreview || whitelist.includes(origin)) {
        return callback(null, true);
      }
    } catch (e) {
      // URL parsing fallback
    }
    return callback(new Error("Not allowed by CORS policy. Security block."));
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Rate Limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 30, // Limit IP to 30 authentication attempts
  message: { message: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 mins
  max: 1500, // Throttling protection
  message: { message: "Too many network requests. Please throttle your consumption." },
  standardHeaders: true,
  legacyHeaders: false
});

const bulkUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { message: "Too many bulk operations executed. Please wait." },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply global API rate limiting throttling
app.use("/api", apiLimiter);

// --- HEALTH HANDSHAKE ---
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    database: process.env.DATABASE_URL ? "configured" : "unconfigured",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});

// --- AUTH HANDSHAKES ---
app.post("/api/auth/login", loginLimiter, validateRequest(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRes = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
    const user = userRes.rows[0];
    
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password credentials." });
    }

    // Password verification
    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Invalid email or password credentials." });
    }

    let profileInfo: any = {};
    if (user.role === "STUDENT" && user.target_id) {
      const sRes = await pool.query("SELECT * FROM students WHERE id = $1", [user.target_id]);
      profileInfo = mapStu(sRes.rows[0]) || {};
    } else if (user.role === "TEACHER" && user.target_id) {
      const tRes = await pool.query("SELECT * FROM teachers WHERE id = $1", [user.target_id]);
      profileInfo = mapTeach(tRes.rows[0]) || {};
    }

    // Real Cryptographic JWT Authentication (Task 2)
    const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_123456789_!@#$";
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, targetId: user.target_id },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Save SHA-256 hashed refresh token to securely persist sessions in DB
    const hashedRefreshToken = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      "INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT (token) DO UPDATE SET expires_at = EXCLUDED.expires_at",
      [hashedRefreshToken, user.id, expiresAt]
    );

    // Transport JWTs securely inside secure HTTPOnly cookies with SameSite config (Lax in production, None in dev iframe)
    const sameSiteConfig = process.env.NODE_ENV === "production" ? "lax" : "none";

    res.cookie("uams_access_token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: sameSiteConfig,
      maxAge: 15 * 60 * 1000
    });

    res.cookie("uams_refresh_token", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: sameSiteConfig,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        targetId: user.target_id,
        mustChangePassword: user.must_change_password || false,
        profile: profileInfo
      }
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Institutional Central Directory login SSO handshake failed." });
  }
});

app.post("/api/auth/change-password", authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Both current password and new password are required." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters long for compliance safety." });
  }

  try {
    const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [req.user?.id]);
    const user = userRes.rows[0];
    if (!user) {
      return res.status(404).json({ message: "User identity record not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect current session password." });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2", [newHash, user.id]);

    res.json({ message: "Password updated successfully. Secure compliant guidelines established." });
  } catch (err) {
    console.error("❌ Password change error:", err);
    res.status(500).json({ message: "Failed to update security credentials." });
  }
});

app.post("/api/auth/refresh", loginLimiter, async (req, res) => {
  const token = req.cookies ? req.cookies["uams_refresh_token"] : undefined;

  if (!token) {
    return res.status(401).json({ message: "Refresh token is required." });
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const dbRes = await pool.query("SELECT * FROM refresh_tokens WHERE token = $1", [hashedToken]);
    if (dbRes.rowCount === 0) {
      return res.status(403).json({ message: "Invalid or reused refresh token." });
    }

    const storedToken = dbRes.rows[0];
    if (new Date() > new Date(storedToken.expires_at)) {
      await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [hashedToken]);
      return res.status(403).json({ message: "Session expired. Please log in again." });
    }

    const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_123456789_!@#$";
    jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({ message: "Invalid token signature." });
      }

      const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [decoded.userId]);
      if (userRes.rowCount === 0) {
        return res.status(403).json({ message: "Account mapping not found." });
      }
      const user = userRes.rows[0];

      const newAccessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, targetId: user.target_id },
        JWT_SECRET,
        { expiresIn: "15m" }
      );
      const newRefreshToken = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Save hashed version of rotated refresh token
      const hashedNewRefreshToken = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

      // Rotate Refresh Tokens (Security best practice)
      await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [hashedToken]);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await pool.query(
        "INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)",
        [hashedNewRefreshToken, user.id, expiresAt]
      );

      const sameSiteConfig = process.env.NODE_ENV === "production" ? "lax" : "none";

      res.cookie("uams_access_token", newAccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: sameSiteConfig,
        maxAge: 15 * 60 * 1000
      });
      res.cookie("uams_refresh_token", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: sameSiteConfig,
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        accessToken: newAccessToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          targetId: user.target_id
        }
      });
    });
  } catch (e) {
    console.error("❌ Token refresh error:", e);
    res.status(500).json({ message: "Handshake refresh failed." });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  let token = req.body?.refreshToken;
  if (!token && req.cookies) {
    token = req.cookies["uams_refresh_token"];
  }

  if (token) {
    try {
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
      await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [hashedToken]);
    } catch (err) {
      console.error("❌ Logout token disposal failed:", err);
    }
  }

  res.clearCookie("uams_access_token");
  res.clearCookie("uams_refresh_token");
  res.json({ success: true, message: "Logged out." });
});

// --- DEPARTMENTS CRUD (ADMIN required for writes, authenticated users for reads) ---
app.get("/api/departments", authenticateToken, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM departments ORDER BY code ASC");
    res.json(r.rows.map(mapDept));
  } catch (e) {
    res.status(500).json({ message: "Error loading departments" });
  }
});

app.post("/api/departments", authenticateToken, authorize(["ADMIN"]), validateRequest(departmentSchema), async (req, res) => {
  const { name, code, description } = req.body;
  try {
    const id = `dept-${Date.now()}`;
    const r = await pool.query(
      "INSERT INTO departments (id, name, code, description) VALUES ($1, $2, $3, $4) RETURNING *",
      [id, name, code.toUpperCase(), description || ""]
    );
    res.status(201).json(mapDept(r.rows[0]));
  } catch (e) {
    res.status(500).json({ message: "Error saving department" });
  }
});

app.put("/api/departments/:id", authenticateToken, authorize(["ADMIN"]), validateRequest(departmentSchema.partial()), async (req, res) => {
  const { name, code, description } = req.body;
  try {
    const r = await pool.query(
      "UPDATE departments SET name = COALESCE($1, name), code = COALESCE($2, code), description = COALESCE($3, description) WHERE id = $4 RETURNING *",
      [name || null, code ? code.toUpperCase() : null, description !== undefined ? description : null, req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ message: "Not found" });
    res.json(mapDept(r.rows[0]));
  } catch (e) {
    res.status(500).json({ message: "Update error" });
  }
});

app.delete("/api/departments/:id", authenticateToken, authorize(["ADMIN"]), async (req, res) => {
  try {
    await pool.query("DELETE FROM departments WHERE id = $1", [req.params.id]);
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    res.status(500).json({ message: "Deletion failed" });
  }
});

// --- BATCHES CRUD (ADMIN for writes, ALL for reads) ---
app.get("/api/batches", authenticateToken, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM batches ORDER BY name ASC");
    res.json(r.rows.map(mapBatch));
  } catch (e) {
    res.status(500).json({ message: "Error loading batches" });
  }
});

app.post("/api/batches", authenticateToken, authorize(["ADMIN"]), validateRequest(batchSchema), async (req, res) => {
  const { name, semester, academicYear, departmentId } = req.body;
  try {
    const id = `batch-${Date.now()}`;
    const r = await pool.query(
      "INSERT INTO batches (id, name, semester, academic_year, department_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [id, name, parseInt(semester, 10), academicYear, departmentId]
    );
    res.status(201).json(mapBatch(r.rows[0]));
  } catch (e) {
    res.status(500).json({ message: "Error saving batch" });
  }
});

app.put("/api/batches/:id", authenticateToken, authorize(["ADMIN"]), validateRequest(batchSchema.partial()), async (req, res) => {
  const { name, semester, academicYear, departmentId } = req.body;
  try {
    const r = await pool.query(
      "UPDATE batches SET name = COALESCE($1, name), semester = COALESCE($2, semester), academic_year = COALESCE($3, academic_year), department_id = COALESCE($4, department_id) WHERE id = $5 RETURNING *",
      [name || null, semester ? parseInt(semester, 10) : null, academicYear || null, departmentId || null, req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ message: "Not found" });
    res.json(mapBatch(r.rows[0]));
  } catch (e) {
    res.status(500).json({ message: "Error updating batch" });
  }
});

app.delete("/api/batches/:id", authenticateToken, authorize(["ADMIN"]), async (req, res) => {
  try {
    await pool.query("DELETE FROM batches WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: "Delete error" });
  }
});

// --- TEACHERS CRUD ---
app.get("/api/teachers", authenticateToken, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM teachers ORDER BY full_name ASC");
    res.json(r.rows.map(mapTeach));
  } catch (e) {
    res.status(500).json({ message: "Load error" });
  }
});

app.post("/api/teachers", authenticateToken, authorize(["ADMIN"]), validateRequest(teacherSchema), async (req, res) => {
  const { employeeId, fullName, email, phone, departmentId, password, profilePhotoUrl } = req.body;
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const id = `t-${Date.now()}`;
    const r = await client.query(
      "INSERT INTO teachers (id, employee_id, full_name, email, phone, department_id, profile_photo_url, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING *",
      [id, employeeId, fullName, email, phone || "", departmentId, profilePhotoUrl || ""]
    );
    
    // Hash password with Bcrypt (Task 1)
    const secureHash = await bcrypt.hash(password, 12);
    await client.query(
      "INSERT INTO users (id, email, password_hash, role, target_id) VALUES ($1, $2, $3, $4, $5)",
      [`user-t-${Date.now()}`, email, secureHash, "TEACHER", id]
    );
    await client.query("COMMIT");
    res.status(201).json(mapTeach(r.rows[0]));
  } catch (err: any) {
    if (client) await client.query("ROLLBACK");
    if (err.code === '23505') {
      if (err.constraint && err.constraint.includes('email')) {
        return res.status(409).json({ message: `A user with the email '${email}' already exists.` });
      }
      if (err.constraint && err.constraint.includes('employee_id')) {
        return res.status(409).json({ message: `A teacher with the Employee ID '${employeeId}' already exists.` });
      }
    }
    console.error(err);
    res.status(500).json({ message: "Database constraint error or failed save." });
  } finally {
    if (client) client.release();
  }
});

app.put("/api/teachers/:id", authenticateToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user?.role !== "ADMIN" && authReq.user?.targetId !== req.params.id) {
    return res.status(403).json({ message: "Access denied. IDOR ownership protection active." });
  }

  const { fullName, email, phone, departmentId, isActive, profilePhotoUrl, password } = req.body;
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const r = await client.query(
      "UPDATE teachers SET full_name = COALESCE($1, full_name), email = COALESCE($2, email), phone = COALESCE($3, phone), department_id = COALESCE($4, department_id), is_active = COALESCE($5, is_active), profile_photo_url = COALESCE($6, profile_photo_url) WHERE id = $7 RETURNING *",
      [fullName || null, email || null, phone !== undefined ? phone : null, departmentId || null, isActive !== undefined ? isActive : null, profilePhotoUrl || null, req.params.id]
    );
    if (r.rowCount === 0) {
      if (client) await client.query("ROLLBACK");
      return res.status(404).json({ message: "Not found" });
    }
    if (password) {
      const secureHash = await bcrypt.hash(password, 12);
      await client.query("UPDATE users SET password_hash = $1, email = COALESCE($2, email) WHERE target_id = $3", [secureHash, email || null, req.params.id]);
    } else if (email) {
      await client.query("UPDATE users SET email = $1 WHERE target_id = $2", [email, req.params.id]);
    }
    await client.query("COMMIT");
    res.json(mapTeach(r.rows[0]));
  } catch (e) {
    if (client) await client.query("ROLLBACK");
    res.status(500).json({ message: "Error updating teacher info" });
  } finally {
    if (client) client.release();
  }
});

app.delete("/api/teachers/:id", authenticateToken, authorize(["ADMIN"]), async (req, res) => {
  try {
    await pool.query("DELETE FROM teachers WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: "Delete error" });
  }
});

// --- STUDENTS CRUD ---
app.get("/api/students", authenticateToken, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM students ORDER BY roll_number ASC");
    res.json(r.rows.map(mapStu));
  } catch (e) {
    res.status(500).json({ message: "Error loading students" });
  }
});

app.post("/api/students", authenticateToken, authorize(["ADMIN"]), validateRequest(studentSchema), async (req, res) => {
  const { enrollmentNumber, rollNumber, fullName, email, phone, batchId, semester, password, profilePhotoUrl } = req.body;
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const id = `s-${Date.now()}`;
    const r = await client.query(
      "INSERT INTO students (id, enrollment_number, roll_number, full_name, email, phone, batch_id, semester, profile_photo_url, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE) RETURNING *",
      [id, enrollmentNumber, rollNumber, fullName, email, phone || "", batchId, parseInt(semester, 10), profilePhotoUrl || ""]
    );
    
    // Hash password with Bcrypt (Task 1)
    const secureHash = await bcrypt.hash(password, 12);
    await client.query(
      "INSERT INTO users (id, email, password_hash, role, target_id) VALUES ($1, $2, $3, $4, $5)",
      [`user-s-${Date.now()}`, email, secureHash, "STUDENT", id]
    );
    await client.query("COMMIT");
    res.status(201).json(mapStu(r.rows[0]));
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    res.status(500).json({ message: "Student registration transaction failed." });
  } finally {
    if (client) client.release();
  }
});

app.post("/api/students/bulk-upload", authenticateToken, authorize(["ADMIN"]), bulkUploadLimiter, async (req, res) => {
  const { csvRows } = req.body;
  if (!Array.isArray(csvRows)) return res.status(400).json({ message: "Invalid CSV payload." });
  let client;
  const importedIds: string[] = [];
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const { enrollmentNumber, rollNumber, fullName, email, phone, batchId, semester, password } = row;
      
      if (enrollmentNumber && String(enrollmentNumber).includes("EnrollmentNumber")) continue;

      if (enrollmentNumber && rollNumber && fullName && email && batchId && password) {
        let finalBatchId = batchId;
        const bRes = await client.query("SELECT id FROM batches WHERE name ILIKE $1 OR id = $2 LIMIT 1", [batchId, batchId]);
        if (bRes.rowCount > 0) finalBatchId = bRes.rows[0].id;

        const id = `s-bulk-${Date.now()}-${i}`;
        await client.query(
          `INSERT INTO students (id, enrollment_number, roll_number, full_name, email, phone, batch_id, semester, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
          [id, enrollmentNumber, rollNumber, fullName, email, phone || "", finalBatchId, parseInt(semester, 10) || 1]
        );

        // Hash mass-upload passwords with Bcrypt (Task 1)
        const secureHash = await bcrypt.hash(String(password), 12);
        await client.query(
          "INSERT INTO users (id, email, password_hash, role, target_id) VALUES ($1, $2, $3, $4, $5)",
          [`user-sb-${Date.now()}-${i}`, email, secureHash, "STUDENT", id]
        );
        importedIds.push(id);
      }
    }
    await client.query("COMMIT");
    res.json({ message: `Successfully parsed and imported ${importedIds.length} profiles.`, importedCount: importedIds.length });
  } catch (err: any) {
    if (client) await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Bulk upload database transaction failed." });
  } finally {
    if (client) client.release();
  }
});

app.put("/api/students/:id", authenticateToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user?.role !== "ADMIN" && authReq.user?.targetId !== req.params.id) {
    return res.status(403).json({ message: "Access denied. IDOR ownership protection active." });
  }

  const { fullName, email, phone, batchId, semester, isActive, profilePhotoUrl, password } = req.body;
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const r = await client.query(
      "UPDATE students SET full_name = COALESCE($1, full_name), email = COALESCE($2, email), phone = COALESCE($3, phone), batch_id = COALESCE($4, batch_id), semester = COALESCE($5, semester), is_active = COALESCE($6, is_active), profile_photo_url = COALESCE($7, profile_photo_url) WHERE id = $8 RETURNING *",
      [fullName || null, email || null, phone !== undefined ? phone : null, batchId || null, semester ? parseInt(semester, 10) : null, isActive !== undefined ? isActive : null, profilePhotoUrl || null, req.params.id]
    );
    if (r.rowCount === 0) {
      if (client) await client.query("ROLLBACK");
      return res.status(404).json({ message: "Not found" });
    }
    if (password) {
      const secureHash = await bcrypt.hash(password, 12);
      await client.query("UPDATE users SET password_hash = $1, email = COALESCE($2, email) WHERE target_id = $3", [secureHash, email || null, req.params.id]);
    } else if (email) {
      await client.query("UPDATE users SET email = $1 WHERE target_id = $2", [email, req.params.id]);
    }
    await client.query("COMMIT");
    res.json(mapStu(r.rows[0]));
  } catch (e) {
    if (client) await client.query("ROLLBACK");
    res.status(500).json({ message: "Student updating failed." });
  } finally {
    if (client) client.release();
  }
});

app.delete("/api/students/:id", authenticateToken, authorize(["ADMIN"]), async (req, res) => {
  try {
    await pool.query("DELETE FROM students WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: "Delete failed" });
  }
});

// --- SUBJECTS CRUD ---
app.get("/api/subjects", authenticateToken, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM subjects ORDER BY code ASC");
    res.json(r.rows.map(mapSub));
  } catch (e) {
    res.status(500).json({ message: "Error" });
  }
});

app.post("/api/subjects", authenticateToken, authorize(["ADMIN"]), validateRequest(subjectSchema), async (req, res) => {
  const { code, name, semester, departmentId, assignedTeacherId } = req.body;
  try {
    const id = `subj-${Date.now()}`;
    const r = await pool.query(
      "INSERT INTO subjects (id, code, name, semester, department_id, assigned_teacher_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [id, code.toUpperCase(), name, parseInt(semester, 10), departmentId, assignedTeacherId || null]
    );
    res.status(201).json(mapSub(r.rows[0]));
  } catch (e) {
    res.status(500).json({ message: "Error creating subject" });
  }
});

app.put("/api/subjects/:id", authenticateToken, authorize(["ADMIN"]), validateRequest(subjectSchema.partial()), async (req, res) => {
  const { code, name, semester, departmentId, assignedTeacherId } = req.body;
  try {
    const r = await pool.query(
      "UPDATE subjects SET code = COALESCE($1, code), name = COALESCE($2, name), semester = COALESCE($3, semester), department_id = COALESCE($4, department_id), assigned_teacher_id = $5 WHERE id = $6 RETURNING *",
      [code ? code.toUpperCase() : null, name || null, semester ? parseInt(semester, 10) : null, departmentId || null, assignedTeacherId || null, req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ message: "Not found" });
    res.json(mapSub(r.rows[0]));
  } catch (e) {
    res.status(500).json({ message: "Update fail" });
  }
});

app.delete("/api/subjects/:id", authenticateToken, authorize(["ADMIN"]), async (req, res) => {
  try {
    await pool.query("DELETE FROM subjects WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: "Delete error" });
  }
});

// --- ATTENDANCE SYSTEM ---
app.post("/api/attendance/mark", authenticateToken, authorize(["ADMIN", "TEACHER"]), validateRequest(markAttendanceSchema), async (req, res) => {
  const { subjectId, batchId, date, records } = req.body;
  let client;
  const inserted: any[] = [];
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    for (let rec of records) {
      const q = `
        INSERT INTO attendance_records (id, student_id, subject_id, batch_id, date, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (student_id, subject_id, date) 
        DO UPDATE SET status = EXCLUDED.status
        RETURNING *
      `;
      const id = `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const r = await client.query(q, [id, rec.studentId, subjectId, batchId, date, rec.status]);
      inserted.push(mapAtt(r.rows[0]));
    }
    await client.query("COMMIT");
    res.json({ success: true, message: `Successfully structured attendance records`, records: inserted });
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    res.status(500).json({ message: "Operational transaction failed" });
  } finally {
    if (client) client.release();
  }
});

app.put("/api/attendance/edit", authenticateToken, authorize(["ADMIN", "TEACHER"]), validateRequest(editAttendanceSchema), async (req, res) => {
  const { recordId, newStatus, remarks, modifiedBy } = req.body;
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const recordRes = await client.query("SELECT * FROM attendance_records WHERE id = $1", [recordId]);
    if (recordRes.rowCount === 0) {
      if (client) await client.query("ROLLBACK");
      return res.status(404).json({ message: "Attendance record not found" });
    }
    const previousRecord = recordRes.rows[0];
    const previousStatus = previousRecord.status;

    const updateRes = await client.query(
      "UPDATE attendance_records SET status = $1 WHERE id = $2 RETURNING *",
      [newStatus, recordId]
    );
    const updatedRecord = mapAtt(updateRes.rows[0]);

    const auditId = `audit-${Date.now()}`;
    const auditRes = await client.query(
      `INSERT INTO audit_logs (id, record_id, modified_by, modified_date, previous_status, new_status, remarks)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6) RETURNING *`,
      [auditId, recordId, modifiedBy, previousStatus, newStatus, remarks || "Manual corrections."]
    );

    const sId = previousRecord.student_id;
    const userRes = await client.query("SELECT * FROM users WHERE target_id = $1", [sId]);
    if (userRes.rowCount > 0) {
      const subRes = await client.query("SELECT name FROM subjects WHERE id = $1", [previousRecord.subject_id]);
      const subjectName = subRes.rowCount > 0 ? subRes.rows[0].name : "Core Topic";
      await client.query(
        "INSERT INTO notifications (id, user_id, title, message, is_read, created_at) VALUES ($1, $2, $3, $4, FALSE, NOW())",
        [`notif-${Date.now()}`, userRes.rows[0].id, "Attendance Corrected", `Your status on ${previousRecord.date} for subject '${subjectName}' was updated from ${previousStatus} to ${newStatus}.`]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true, updatedRecord, audit: mapAudit(auditRes.rows[0]) });
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    res.status(500).json({ message: "Audit transaction failed" });
  } finally {
    if (client) client.release();
  }
});

app.get("/api/attendance/query", authenticateToken, async (req, res) => {
  const { subjectId, batchId, date } = req.query;
  let query = "SELECT * FROM attendance_records WHERE 1=1";
  const params: any[] = [];
  if (subjectId) {
    params.push(subjectId);
    query += ` AND subject_id = $${params.length}`;
  }
  if (batchId) {
    params.push(batchId);
    query += ` AND batch_id = $${params.length}`;
  }
  if (date) {
    params.push(date);
    query += ` AND date = $${params.length}`;
  }
  try {
    const r = await pool.query(query, params);
    res.json(r.rows.map(mapAtt));
  } catch (e) {
    res.status(500).json({ message: "Query failed" });
  }
});

app.get("/api/attendance/audit-logs", authenticateToken, authorize(["ADMIN", "TEACHER"]), async (req, res) => {
  const query = `
    SELECT a.*, s.full_name as student_name, s.enrollment_number, sub.name as subject_name, r.date as attendance_date
    FROM audit_logs a
    JOIN attendance_records r ON a.record_id = r.id
    JOIN students s ON r.student_id = s.id
    JOIN subjects sub ON r.subject_id = sub.id
    ORDER BY a.modified_date DESC
  `;
  try {
    const r = await pool.query(query);
    res.json(r.rows.map(mapAudit));
  } catch (e) {
    res.status(500).json([]);
  }
});

// --- ANALYTICS SECURED CONTROLS & IDOR PREVENTIONS (Task 3 & 4) ---
app.get("/api/analytics/admin-summary", authenticateToken, authorize(["ADMIN"]), async (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  try {
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM students) as students,
        (SELECT COUNT(*) FROM teachers) as teachers,
        (SELECT COUNT(*) FROM subjects) as subjects,
        (SELECT COUNT(*) FROM departments) as departments,
        (SELECT COUNT(*) FROM batches) as batches
    `);

    const totalStudents = Number(counts.rows[0].students);
    const totalTeachers = Number(counts.rows[0].teachers);
    const totalSubjects = Number(counts.rows[0].subjects);
    const totalDepartments = Number(counts.rows[0].departments);
    const totalBatches = Number(counts.rows[0].batches);

    const dRes = await pool.query("SELECT MAX(date) FROM attendance_records");
    const latestDate = dRes.rows[0]?.max;
    let todayAttendanceRatio = 85;
    if (latestDate) {
      const onDateRes = await pool.query(
        "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as presents FROM attendance_records WHERE date = $1",
        [latestDate]
      );
      const totalCount = Number(onDateRes.rows[0].total);
      const presents = Number(onDateRes.rows[0].presents || 0);
      if (totalCount > 0) {
        todayAttendanceRatio = Math.round((presents / totalCount) * 100);
      }
    }

    let deptAverages: any[] = [];
    const allDeptsRes = await pool.query(`
      SELECT d.id, d.name, d.code, COUNT(r.id) as total, SUM(CASE WHEN r.status = 'PRESENT' THEN 1 ELSE 0 END) as presents
      FROM departments d
      LEFT JOIN subjects s ON d.id = s.department_id
      LEFT JOIN attendance_records r ON s.id = r.subject_id
      GROUP BY d.id, d.name, d.code
    `);
    for (let dept of allDeptsRes.rows) {
      const total = Number(dept.total);
      const presents = Number(dept.presents || 0);
      deptAverages.push({
        departmentName: dept.name,
        code: dept.code,
        percentage: total > 0 ? Math.round((presents / total) * 100) : 84
      });
    }

    let semesterData: any[] = [];
    const semRes = await pool.query(`
      SELECT s.semester, COUNT(r.id) as total, SUM(CASE WHEN r.status = 'PRESENT' THEN 1 ELSE 0 END) as presents
      FROM subjects s
      JOIN attendance_records r ON s.id = r.subject_id
      GROUP BY s.semester
      ORDER BY s.semester ASC
    `);
    for (let row of semRes.rows) {
      const total = Number(row.total);
      const presents = Number(row.presents || 0);
      if (total > 0) {
        semesterData.push({ semester: row.semester, percentage: Math.round((presents / total) * 100) });
      }
    }
    if (semesterData.length === 0) {
      semesterData = [{ semester: 1, percentage: 80 }, { semester: 3, percentage: 85 }];
    }

    let safeCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    const keysRes = await pool.query(`
      SELECT student_id,
             COUNT(*) as total,
             SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as presents
      FROM attendance_records
      GROUP BY student_id
    `);
    const ratedIds = new Set();
    for (let row of keysRes.rows) {
      ratedIds.add(row.student_id);
      const total = Number(row.total);
      const presents = Number(row.presents || 0);
      const ratio = (presents / total) * 100;
      if (ratio < 60) criticalCount++;
      else if (ratio < 80) warningCount++;
      else safeCount++;
    }
    safeCount += Math.max(0, totalStudents - ratedIds.size);

    res.json({
      totals: { totalStudents, totalTeachers, totalSubjects, totalDepartments, totalBatches, todayAttendanceRatio },
      deptAverages,
      semesterData,
      defaulters: { safeCount, warningCount, criticalCount }
    });
  } catch (e) {
    res.status(500).json({ error: "Calculations failure" });
  }
});

app.get("/api/analytics/students-summary", authenticateToken, authorize(["ADMIN", "TEACHER"]), async (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  try {
    const q = `
      SELECT 
        s.id as student_id,
        COALESCE(COUNT(r.id), 0) as total_classes,
        COALESCE(SUM(CASE WHEN r.status = 'PRESENT' THEN 1 ELSE 0 END), 0) as present_classes
      FROM students s
      LEFT JOIN attendance_records r ON s.id = r.student_id
      GROUP BY s.id
    `;
    const result = await pool.query(q);
    const summary: Record<string, any> = {};
    for (const row of result.rows) {
      const tc = Number(row.total_classes);
      const pc = Number(row.present_classes || 0);
      const pct = tc > 0 ? Math.round((pc / tc) * 100) : 100;
      let cat = "SAFE";
      if (pct < 60) cat = "CRITICAL";
      else if (pct < 80) cat = "WARNING";
      
      summary[row.student_id] = {
        overallPercentage: pct,
        statusCategory: cat,
        totalClasses: tc,
        presentClasses: pc
      };
    }
    res.json(summary);
  } catch (err) {
    console.error("Error generating students summary:", err);
    res.status(500).json({ error: "Error compiling students summary" });
  }
});

app.get("/api/analytics/student/:studentId", authenticateToken, async (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  const sId = req.params.studentId;
  const authReq = req as AuthenticatedRequest;

  // Horizontal IDOR Check (Task 4)
  if (authReq.user?.role === "STUDENT" && authReq.user?.targetId !== sId) {
    return res.status(403).json({ message: "Access denied. You can only view your own statistics." });
  }

  // Teacher validation logic for student query
  if (authReq.user?.role === "TEACHER") {
    const checkRes = await pool.query(`
      SELECT 1 FROM students s
      JOIN batches b ON s.batch_id = b.id
      JOIN subjects sub ON b.department_id = sub.department_id AND b.semester = sub.semester
      WHERE s.id = $1 AND (sub.assigned_teacher_id = $2 OR sub.id IN (
        SELECT subject_id FROM substitute_assignments WHERE substitute_id = $2 AND is_active = TRUE
      ))
      LIMIT 1
    `, [sId, authReq.user.targetId]);
    if (checkRes.rowCount === 0) {
      return res.status(403).json({ message: "Access denied. Student is not in your assigned batch." });
    }
  }

  try {
    const studentRes = await pool.query("SELECT * FROM students WHERE id = $1", [sId]);
    if (studentRes.rowCount === 0) return res.status(404).json({ message: "Student record not found." });
    const student = mapStu(studentRes.rows[0])!;

    const batchRes = await pool.query("SELECT department_id FROM batches WHERE id = $1", [student.batchId]);
    const departmentId = batchRes.rowCount > 0 ? batchRes.rows[0].department_id : "";

    const overallRes = await pool.query(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as presents FROM attendance_records WHERE student_id = $1",
      [sId]
    );
    const totalClasses = Number(overallRes.rows[0].total || 0);
    const presentClasses = Number(overallRes.rows[0].presents || 0);
    const absentClasses = totalClasses - presentClasses;
    const overallRatio = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 100;
    
    const subjectStatsRes = await pool.query(`
      SELECT s.id, s.name, s.code,
             COUNT(r.id) as sub_total,
             SUM(CASE WHEN r.status = 'PRESENT' THEN 1 ELSE 0 END) as sub_presents
      FROM subjects s
      LEFT JOIN attendance_records r ON s.id = r.subject_id AND r.student_id = $1
      WHERE s.semester = $2 AND s.department_id = $3
      GROUP BY s.id, s.name, s.code
    `, [sId, student.semester, departmentId]);

    const subjectStats = subjectStatsRes.rows.map(row => {
      const subTotal = Number(row.sub_total || 0);
      const subPresents = Number(row.sub_presents || 0);
      const ratio = subTotal > 0 ? Math.round((subPresents / subTotal) * 100) : 100;

      let category = "SAFE";
      if (ratio < 60) category = "CRITICAL";
      else if (ratio < 80) category = "WARNING";

      return {
        subjectId: row.id, subjectName: row.name, subjectCode: row.code,
        total: subTotal, present: subPresents, absent: subTotal - subPresents, percentage: ratio, category
      };
    });

    const logsQuery = `
      SELECT r.id, r.date, s.name as subject_name, s.code as subject_code, r.status
      FROM attendance_records r
      JOIN subjects s ON r.subject_id = s.id
      WHERE r.student_id = $1
      ORDER BY r.date DESC, r.id DESC
      LIMIT 20
    `;
    const recentLogsRes = await pool.query(logsQuery, [sId]);
    const recentLogs = recentLogsRes.rows.map(row => {
      const d = new Date(row.date);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return {
        id: row.id,
        date: dateStr,
        subjectName: row.subject_name,
        subjectCode: row.subject_code,
        status: row.status
      };
    });

    const monthlyRes = await pool.query(`
      SELECT 
        TO_CHAR(date, 'Mon') as month_name,
        EXTRACT(MONTH FROM date) as month_num,
        EXTRACT(YEAR FROM date) as year_num,
        COUNT(id) as total,
        SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as presents
      FROM attendance_records
      WHERE student_id = $1
      GROUP BY TO_CHAR(date, 'Mon'), EXTRACT(MONTH FROM date), EXTRACT(YEAR FROM date)
      ORDER BY year_num ASC, month_num ASC
    `, [sId]);

    const monthlyStats = monthlyRes.rows.map(row => {
      const mTotal = Number(row.total || 0);
      const mPresents = Number(row.presents || 0);
      const ratio = mTotal > 0 ? Math.round((mPresents / mTotal) * 100) : 100;
      return {
        name: row.month_name,
        ratio: ratio
      };
    });

    const seqRes = await pool.query("SELECT COUNT(*) as count FROM attendance_records");
    const sequenceNumber = 1000 + Number(seqRes.rows[0].count || 0);

    res.json({
      overallPercentage: overallRatio,
      totalClasses,
      presentClasses,
      absentClasses,
      subjectStats,
      recentLogs,
      monthlyStats,
      sequenceNumber,
      statusCategory: overallRatio < 60 ? "CRITICAL" : overallRatio < 80 ? "WARNING" : "SAFE"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error compiling student dashboard facts" });
  }
});

app.get("/api/analytics/teacher/:teacherId", authenticateToken, authorize(["ADMIN", "TEACHER"]), async (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  const tId = req.params.teacherId;
  const authReq = req as AuthenticatedRequest;

  // Horizontal IDOR validation
  if (authReq.user?.role === "TEACHER" && authReq.user?.targetId !== tId) {
    return res.status(403).json({ message: "Access denied. IDOR ownership protection active." });
  }

  try {
    const teacherRes = await pool.query("SELECT * FROM teachers WHERE id = $1", [tId]);
    if (teacherRes.rowCount === 0) return res.status(404).json({ message: "Teacher record not found." });

    const assignedSubjectsRes = await pool.query("SELECT * FROM subjects WHERE assigned_teacher_id = $1", [tId]);
    const assignedSubjects = assignedSubjectsRes.rows;
    const assignedSubIds = assignedSubjects.map(s => s.id);

    let classesConducted = 0;
    let averageAttendance = 85;
    let subjectSummaries: any[] = [];
    let recentActivity: any[] = [];
    let teacherDefaulterCount = 0;

    if (assignedSubIds.length > 0) {
      const overallStats = await pool.query(`
        SELECT 
          COUNT(DISTINCT subject_id || '_' || batch_id || '_' || date) as classes_conducted,
          COUNT(id) as total_heads,
          SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as presents
        FROM attendance_records
        WHERE subject_id = ANY($1)
      `, [assignedSubIds]);
      
      classesConducted = Number(overallStats.rows[0].classes_conducted || 0);
      const totalHeads = Number(overallStats.rows[0].total_heads || 0);
      const totalPresents = Number(overallStats.rows[0].presents || 0);
      averageAttendance = totalHeads > 0 ? Math.round((totalPresents / totalHeads) * 100) : 85;

      const subStatsRes = await pool.query(`
        SELECT subject_id, 
          COUNT(DISTINCT date) as classes_held,
          COUNT(id) as total_heads,
          SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as presents
        FROM attendance_records
        WHERE subject_id = ANY($1)
        GROUP BY subject_id
      `, [assignedSubIds]);

      for (let sub of assignedSubjects) {
        const stat = subStatsRes.rows.find(r => r.subject_id === sub.id) || { classes_held: 0, total_heads: 0, presents: 0 };
        const sHeads = Number(stat.total_heads);
        const sPres = Number(stat.presents);
        subjectSummaries.push({
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          classesHeld: Number(stat.classes_held),
          averageRatio: sHeads > 0 ? Math.round((sPres / sHeads) * 100) : 85
        });
      }

      const recentActRes = await pool.query(`
        SELECT r.id, r.date, s.full_name as student_name, sub.name as subject_name, r.status
        FROM attendance_records r
        JOIN students s ON r.student_id = s.id
        JOIN subjects sub ON r.subject_id = sub.id
        WHERE r.subject_id = ANY($1)
        ORDER BY r.date DESC, r.id DESC
        LIMIT 10
      `, [assignedSubIds]);

      recentActivity = recentActRes.rows.map(r => {
        const d = new Date(r.date);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { id: r.id, date: dateStr, studentName: r.student_name, subjectName: r.subject_name, status: r.status };
      });

      const defaulterRes = await pool.query(`
        SELECT COUNT(*) as count
        FROM (
          SELECT student_id,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as present
          FROM attendance_records
          WHERE subject_id = ANY($1)
          GROUP BY student_id
        ) as student_stats
        WHERE (present::float / total) < 0.8
      `, [assignedSubIds]);
      
      teacherDefaulterCount = Number(defaulterRes.rows[0].count || 0);
    }

    res.json({
      classesConducted,
      averageAttendance,
      subjectSummaries,
      recentActivity,
      defaulterCount: teacherDefaulterCount
    });
  } catch (e) {
    res.status(500).json({ error: "Teacher stats compilation error" });
  }
});

app.get("/api/analytics/batch/:batchId", authenticateToken, authorize(["ADMIN", "TEACHER"]), async (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  const bId = req.params.batchId;
  const authReq = req as AuthenticatedRequest;

  // IDOR Control for teachers visiting batch summaries
  if (authReq.user?.role === "TEACHER") {
    const checkRes = await pool.query(`
      SELECT 1 FROM batches b
      JOIN subjects sub ON b.department_id = sub.department_id AND b.semester = sub.semester
      WHERE b.id = $1 AND (sub.assigned_teacher_id = $2 OR sub.id IN (
        SELECT subject_id FROM substitute_assignments WHERE substitute_id = $2 AND is_active = TRUE
      ))
      LIMIT 1
    `, [bId, authReq.user.targetId]);
    if (checkRes.rowCount === 0) {
      return res.status(403).json({ message: "Access denied. Batch is not assigned to your teachings." });
    }
  }

  try {
    const batchRes = await pool.query("SELECT * FROM batches WHERE id = $1", [bId]);
    if (batchRes.rowCount === 0) return res.status(404).json({ message: "Batch not found." });
    const batch = mapBatch(batchRes.rows[0])!;

    const studentsRes = await pool.query("SELECT * FROM students WHERE batch_id = $1", [bId]);
    const students = studentsRes.rows;

    const recordsRes = await pool.query("SELECT * FROM attendance_records WHERE batch_id = $1", [bId]);
    const records = recordsRes.rows;

    const presentsCount = records.filter(r => r.status === "PRESENT").length;
    const overallAvg = records.length > 0 ? Math.round((presentsCount / records.length) * 100) : 85;

    const studentsRecords = students.map((s) => {
      const sRecords = records.filter(r => r.student_id === s.id);
      const total = sRecords.length;
      const presents = sRecords.filter(r => r.status === "PRESENT").length;
      const ratio = total > 0 ? Math.round((presents / total) * 100) : 100;
      return {
        studentId: s.id,
        fullName: s.full_name,
        enrollmentNumber: s.enrollment_number,
        rollNumber: s.roll_number,
        ratio,
        defaulter: ratio < 80,
        statusCategory: ratio < 60 ? "CRITICAL" : ratio < 80 ? "WARNING" : "SAFE"
      };
    });

    const defaultersList = studentsRecords.filter(s => s.ratio < 80);
    const highestAttendanceStudent = studentsRecords.length > 0
      ? [...studentsRecords].sort((a,b) => b.ratio - a.ratio)[0]
      : null;

    const lowestAttendanceStudent = studentsRecords.length > 0
      ? [...studentsRecords].sort((a,b) => a.ratio - b.ratio)[0]
      : null;

    res.json({
      batchName: batch.name,
      overallAverage: overallAvg,
      totalStudents: students.length,
      defaultersCount: defaultersList.length,
      studentsList: studentsRecords,
      highestStudent: highestAttendanceStudent,
      lowestStudent: lowestAttendanceStudent
    });
  } catch (e) {
    res.status(500).json({ error: "Batch analytics failed" });
  }
});

// --- NOTIFICATIONS API WITH ACCESS & IDOR POLICIES ---
app.get("/api/notifications/:userId", authenticateToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user?.role !== "ADMIN" && authReq.user?.id !== req.params.userId) {
    return res.status(403).json({ message: "Access denied. IDOR ownership protection active." });
  }

  try {
    const r = await pool.query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC", [req.params.userId]);
    res.json(r.rows.map(mapNotif));
  } catch (e) {
    res.status(500).json([]);
  }
});

app.post("/api/notifications/read/:notifId", authenticateToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    // Assert target notification ownership
    const notifRes = await pool.query("SELECT user_id FROM notifications WHERE id = $1", [req.params.notifId]);
    if (notifRes.rowCount > 0 && authReq.user?.role !== "ADMIN" && notifRes.rows[0].user_id !== authReq.user?.id) {
      return res.status(403).json({ message: "Access denied." });
    }

    await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1", [req.params.notifId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to read" });
  }
});

// --- ANNOUNCEMENTS ---
app.post("/api/announcements", authenticateToken, authorize(["ADMIN", "TEACHER"]), validateRequest(announcementSchema), async (req, res) => {
  const { teacherId, type, targetId, title, message } = req.body;
  const authReq = req as AuthenticatedRequest;

  // IDOR check for teachers sending notices
  if (authReq.user?.role === "TEACHER" && authReq.user?.targetId !== teacherId) {
    return res.status(403).json({ message: "Access denied. IDOR protection active." });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const annId = `ann-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    await client.query(
      "INSERT INTO announcements (id, teacher_id, type, target_id, title, message, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())",
      [annId, teacherId, type, targetId, title, message]
    );

    const teachRes = await client.query("SELECT full_name FROM teachers WHERE id = $1", [teacherId]);
    const teacherName = teachRes.rowCount > 0 ? teachRes.rows[0].full_name : "Faculty Member";

    let studentsRes;
    if (type === "BATCH") {
      studentsRes = await client.query(
        "SELECT u.id, s.full_name FROM users u JOIN students s ON u.target_id = s.id WHERE s.batch_id = $1",
        [targetId]
      );
    } else {
      studentsRes = await client.query(
        "SELECT u.id, s.full_name FROM users u JOIN students s ON u.target_id = s.id JOIN batches b ON s.batch_id = b.id WHERE b.department_id = $1",
        [targetId]
      );
    }

    for (const row of studentsRes.rows) {
      const notifId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      await client.query(
        "INSERT INTO notifications (id, user_id, title, message, is_read, created_at) VALUES ($1, $2, $3, $4, FALSE, NOW())",
        [notifId, row.id, title, `Dear ${row.full_name}, ${message} — Broadcasted by Professor ${teacherName}.`]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true, message: `Successfully broadcasted to ${studentsRes.rowCount} student(s).` });
  } catch (e: any) {
    if (client) await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ message: "Failed to broadcast announcement" });
  } finally {
    if (client) client.release();
  }
});

app.get("/api/announcements/teacher/:teacherId", authenticateToken, authorize(["ADMIN", "TEACHER"]), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user?.role === "TEACHER" && authReq.user?.targetId !== req.params.teacherId) {
    return res.status(403).json({ message: "Access denied." });
  }

  try {
    const r = await pool.query("SELECT * FROM announcements WHERE teacher_id = $1 ORDER BY created_at DESC", [req.params.teacherId]);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json([]);
  }
});

// --- SUBSTITUTE PROTOCOL ---
app.post("/api/teachers/assign-substitute", authenticateToken, authorize(["ADMIN", "TEACHER"]), validateRequest(assignSubstituteSchema), async (req, res) => {
  const { teacherId, substituteId, subjectId } = req.body;
  const authReq = req as AuthenticatedRequest;

  if (authReq.user?.role === "TEACHER" && authReq.user?.targetId !== teacherId) {
    return res.status(403).json({ message: "Access denied. IDOR protection active." });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const originalTeachRes = await client.query("SELECT full_name FROM teachers WHERE id = $1", [teacherId]);
    const subTeachRes = await client.query("SELECT full_name FROM teachers WHERE id = $1", [substituteId]);
    const originalName = originalTeachRes.rowCount > 0 ? originalTeachRes.rows[0].full_name : "Teacher";
    const subName = subTeachRes.rowCount > 0 ? subTeachRes.rows[0].full_name : "Substitute Teacher";

    if (subjectId === "all") {
      await client.query(
        "UPDATE substitute_assignments SET is_active = FALSE WHERE teacher_id = $1 AND is_active = TRUE",
        [teacherId]
      );
    } else {
      await client.query(
        "UPDATE substitute_assignments SET is_active = FALSE WHERE teacher_id = $1 AND subject_id = $2 AND is_active = TRUE",
        [teacherId, subjectId]
      );
    }

    if (substituteId !== "none") {
      let subjectsToAssign = [];
      if (subjectId === "all") {
        const subjectsRes = await client.query("SELECT id, name, code, semester, department_id FROM subjects WHERE assigned_teacher_id = $1", [teacherId]);
        subjectsToAssign = subjectsRes.rows;
      } else {
        const subjectsRes = await client.query("SELECT id, name, code, semester, department_id FROM subjects WHERE id = $1", [subjectId]);
        subjectsToAssign = subjectsRes.rows;
      }

      for (const subj of subjectsToAssign) {
        const saId = `sa-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        await client.query(
          "INSERT INTO substitute_assignments (id, teacher_id, substitute_id, subject_id, created_at, is_active) VALUES ($1, $2, $3, $4, NOW(), TRUE)",
          [saId, teacherId, substituteId, subj.id]
        );

        const studentsRes = await client.query(
          `SELECT u.id, s.full_name
           FROM users u
           JOIN students s ON u.target_id = s.id
           JOIN batches b ON s.batch_id = b.id
           WHERE b.department_id = $1 AND b.semester = $2`,
          [subj.department_id, subj.semester]
        );

        for (const row of studentsRes.rows) {
          const notifId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          await client.query(
            "INSERT INTO notifications (id, user_id, title, message, is_read, created_at) VALUES ($1, $2, $3, $4, FALSE, NOW())",
            [
              notifId,
              row.id,
              "Substitute Lecture Protocol Active",
              `Dear ${row.full_name}, Professor ${subName} has been assigned as substitute teacher for ${subj.name} (${subj.code}), originally taught by Professor ${originalName}.`
            ]
          );
        }
      }
    }

    await client.query("COMMIT");
    res.json({ success: true, message: "Substitute assigned successfully." });
  } catch (e: any) {
    if (client) await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ message: "Failed to process substitute assignment" });
  } finally {
    if (client) client.release();
  }
});

app.get("/api/teachers/:teacherId/substitute-subjects", authenticateToken, authorize(["ADMIN", "TEACHER"]), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user?.role === "TEACHER" && authReq.user?.targetId !== req.params.teacherId) {
    return res.status(403).json({ message: "Access denied." });
  }

  try {
    const r = await pool.query(`
      SELECT s.* FROM subjects s
      JOIN substitute_assignments sa ON s.id = sa.subject_id
      WHERE sa.substitute_id = $1 AND sa.is_active = TRUE
    `, [req.params.teacherId]);
    res.json(r.rows.map(mapSub));
  } catch (e) {
    res.status(500).json([]);
  }
});

app.get("/api/teachers/:teacherId/active-substitutions", authenticateToken, authorize(["ADMIN", "TEACHER"]), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user?.role === "TEACHER" && authReq.user?.targetId !== req.params.teacherId) {
    return res.status(403).json({ message: "Access denied." });
  }

  try {
    const r = await pool.query(`
      SELECT sa.id, sa.substitute_id, sa.subject_id, t.full_name as substitute_name, sub.name as subject_name, sub.code as subject_code
      FROM substitute_assignments sa
      JOIN teachers t ON sa.substitute_id = t.id
      JOIN subjects sub ON sa.subject_id = sub.id
      WHERE sa.teacher_id = $1 AND sa.is_active = TRUE
    `, [req.params.teacherId]);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json([]);
  }
});

app.get("/api/teachers/:teacherId/sessions", authenticateToken, authorize(["ADMIN", "TEACHER"]), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const tId = req.params.teacherId;
  if (authReq.user?.role === "TEACHER" && authReq.user?.targetId !== tId) {
    return res.status(403).json({ message: "Access denied." });
  }

  try {
    const r = await pool.query(`
      SELECT 
        r.date, 
        r.subject_id as "subjectId", 
        r.batch_id as "batchId",
        sub.code as "subjectCode",
        sub.name as "subjectName",
        b.name as "batchName",
        b.semester
      FROM attendance_records r
      JOIN subjects sub ON r.subject_id = sub.id
      JOIN batches b ON r.batch_id = b.id
      WHERE r.subject_id IN (
        SELECT id FROM subjects WHERE assigned_teacher_id = $1
        UNION 
        SELECT subject_id FROM substitute_assignments WHERE substitute_id = $1 AND is_active = TRUE
      )
      GROUP BY r.date, r.subject_id, r.batch_id, sub.code, sub.name, b.name, b.semester
      ORDER BY r.date DESC
    `, [tId]);
    
    const sessions = r.rows.map(row => {
      const d = new Date(row.date);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return {
        ...row,
        date: dateStr
      };
    });
    res.json(sessions);
  } catch (e: any) {
    console.error("Failed to query teacher sessions:", e);
    res.status(500).json([]);
  }
});

// Start the server (for local development or production containers like Cloud Run)
if (!process.env.VERCEL) {
  (async () => {
    const PORT = Number(process.env.PORT) || 3000;
    if (process.env.NODE_ENV !== "production") {
      const viteMod = "vite";
      const { createServer: createViteServer } = await import(viteMod);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[UAMS Server] Running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
    });
  })();
}

export default app;
