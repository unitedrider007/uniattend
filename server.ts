
import express from "express";
import path from "path";
import fs from "fs";
import { pool } from "./src/dbPool";

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

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  const generateSimulatedJwt = (user: any) => {
    return `uams_token.${Buffer.from(JSON.stringify({ userId: user.id, email: user.email, role: user.role })).toString("base64")}`;
  };

  const generateSimulatedRefreshToken = (user: any) => {
    return `uams_refresh.${Buffer.from(JSON.stringify({ userId: user.id })).toString("base64")}`;
  };

  // --- API ENDPOINTS ---
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const userRes = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
      const user = userRes.rows[0];
      
      if (!user || user.password_hash !== password) {
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

      res.json({
        accessToken: generateSimulatedJwt(user),
        refreshToken: generateSimulatedRefreshToken(user),
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          targetId: user.target_id,
          profile: profileInfo
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Departments CRUD
  app.get("/api/departments", async (req, res) => {
    try {
      const r = await pool.query("SELECT * FROM departments ORDER BY code ASC");
      res.json(r.rows.map(mapDept));
    } catch (e) {
      res.status(500).json({ message: "Error loading departments" });
    }
  });

  app.post("/api/departments", async (req, res) => {
    const { name, code, description } = req.body;
    if (!name || !code) return res.status(400).json({ message: "Name and Code fields required." });
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

  app.put("/api/departments/:id", async (req, res) => {
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

  app.delete("/api/departments/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM departments WHERE id = $1", [req.params.id]);
      res.json({ success: true, message: "Deleted" });
    } catch (e) {
      res.status(505).json({ message: "Deletion failed" });
    }
  });

  // Batches CRUD
  app.get("/api/batches", async (req, res) => {
    try {
      const r = await pool.query("SELECT * FROM batches ORDER BY name ASC");
      res.json(r.rows.map(mapBatch));
    } catch (e) {
      res.status(500).json({ message: "Error loading batches" });
    }
  });

  app.post("/api/batches", async (req, res) => {
    const { name, semester, academicYear, departmentId } = req.body;
    if (!name || !semester || !academicYear || !departmentId) {
      return res.status(400).json({ message: "Missing fields" });
    }
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

  app.put("/api/batches/:id", async (req, res) => {
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

  app.delete("/api/batches/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM batches WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "Delete error" });
    }
  });

  // Teachers CRUD
  app.get("/api/teachers", async (req, res) => {
    try {
      const r = await pool.query("SELECT * FROM teachers ORDER BY full_name ASC");
      res.json(r.rows.map(mapTeach));
    } catch (e) {
      res.status(500).json({ message: "Load error" });
    }
  });

  app.post("/api/teachers", async (req, res) => {
    const { employeeId, fullName, email, phone, departmentId, password, profilePhotoUrl } = req.body;
    if (!employeeId || !fullName || !email || !departmentId || !password) {
      return res.status(400).json({ message: "Missing required fields: Employee ID, Full Name, Email, Department, and Password are required." });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const id = `t-${Date.now()}`;
      const r = await client.query(
        "INSERT INTO teachers (id, employee_id, full_name, email, phone, department_id, profile_photo_url, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING *",
        [id, employeeId, fullName, email, phone || "", departmentId, profilePhotoUrl || ""]
      );
      await client.query(
        "INSERT INTO users (id, email, password_hash, role, target_id) VALUES ($1, $2, $3, $4, $5)",
        [`user-t-${Date.now()}`, email, password, "TEACHER", id]
      );
      await client.query("COMMIT");
      res.status(201).json(mapTeach(r.rows[0]));
    } catch (err: any) {
      await client.query("ROLLBACK");
      if (err.code === '23505') { // Handle unique constraint violations
        if (err.constraint && err.constraint.includes('email')) {
          return res.status(409).json({ message: `A user with the email '${email}' already exists.` });
        }
        if (err.constraint && err.constraint.includes('employee_id')) {
          return res.status(409).json({ message: `A teacher with the Employee ID '${employeeId}' already exists.` });
        }
        return res.status(409).json({ message: 'A record with one of the unique fields already exists.' });
      }
      console.error("Error saving teacher:", err);
      res.status(500).json({ message: `Database Error: ${err.message || "Unknown error occurred while saving."}` });
    } finally {
      client.release();
    }
  });

  app.put("/api/teachers/:id", async (req, res) => {
    const { fullName, email, phone, departmentId, isActive, profilePhotoUrl, password } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const r = await client.query(
        "UPDATE teachers SET full_name = COALESCE($1, full_name), email = COALESCE($2, email), phone = COALESCE($3, phone), department_id = COALESCE($4, department_id), is_active = COALESCE($5, is_active), profile_photo_url = COALESCE($6, profile_photo_url) WHERE id = $7 RETURNING *",
        [fullName || null, email || null, phone !== undefined ? phone : null, departmentId || null, isActive !== undefined ? isActive : null, profilePhotoUrl || null, req.params.id]
      );
      if (r.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Not found" });
      }
      if (password) {
        await client.query("UPDATE users SET password_hash = $1, email = COALESCE($2, email) WHERE target_id = $3", [password, email || null, req.params.id]);
      } else if (email) {
        await client.query("UPDATE users SET email = $1 WHERE target_id = $2", [email, req.params.id]);
      }
      await client.query("COMMIT");
      res.json(mapTeach(r.rows[0]));
    } catch (e) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: "Error updating teacher" });
    } finally {
      client.release();
    }
  });

  app.delete("/api/teachers/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM teachers WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "Delete error" });
    }
  });

  // Students CRUD
  app.get("/api/students", async (req, res) => {
    try {
      const r = await pool.query("SELECT * FROM students ORDER BY roll_number ASC");
      res.json(r.rows.map(mapStu));
    } catch (e) {
      res.status(505).json({ message: "Error loading students" });
    }
  });

  app.post("/api/students", async (req, res) => {
    const { enrollmentNumber, rollNumber, fullName, email, phone, batchId, semester, password, profilePhotoUrl } = req.body;
    if (!enrollmentNumber || !rollNumber || !fullName || !email || !batchId || !semester || !password) {
      return res.status(400).json({ message: "Missing student parameters including password." });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const id = `s-${Date.now()}`;
      const r = await client.query(
        "INSERT INTO students (id, enrollment_number, roll_number, full_name, email, phone, batch_id, semester, profile_photo_url, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE) RETURNING *",
        [id, enrollmentNumber, rollNumber, fullName, email, phone || "", batchId, parseInt(semester, 10), profilePhotoUrl || ""]
      );
      await client.query(
        "INSERT INTO users (id, email, password_hash, role, target_id) VALUES ($1, $2, $3, $4, $5)",
        [`user-s-${Date.now()}`, email, password, "STUDENT", id]
      );
      await client.query("COMMIT");
      res.status(201).json(mapStu(r.rows[0]));
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: `Database Error: ${(err as any).message || "Student registration failed"}` });
    } finally {
      client.release();
    }
  });

  app.post("/api/students/bulk-upload", async (req, res) => {
    const { csvRows } = req.body;
    if (!Array.isArray(csvRows)) return res.status(400).json({ message: "Invalid CSV" });
    const client = await pool.connect();
    const importedIds: string[] = [];
    try {
      await client.query("BEGIN");
      for (let i = 0; i < csvRows.length; i++) {
        const row = csvRows[i];
        const { enrollmentNumber, rollNumber, fullName, email, phone, batchId, semester, password } = row;
        
        // Gracefully ignore CSV header columns
        if (enrollmentNumber && String(enrollmentNumber).includes("EnrollmentNumber")) continue;

        if (enrollmentNumber && rollNumber && fullName && email && batchId && password) {
          // Automatically resolve Batch ID if the user provided a Batch Name (like "June")
          let finalBatchId = batchId;
          const bRes = await client.query("SELECT id FROM batches WHERE name ILIKE $1 OR id = $2 LIMIT 1", [batchId, batchId]);
          if (bRes.rowCount > 0) finalBatchId = bRes.rows[0].id;

          const id = `s-bulk-${Date.now()}-${i}`;
          await client.query(
            `INSERT INTO students (id, enrollment_number, roll_number, full_name, email, phone, batch_id, semester, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
            [id, enrollmentNumber, rollNumber, fullName, email, phone || "", finalBatchId, parseInt(semester, 10) || 1]
          );
          await client.query(
            "INSERT INTO users (id, email, password_hash, role, target_id) VALUES ($1, $2, $3, $4, $5)",
            [`user-sb-${Date.now()}-${i}`, email, password, "STUDENT", id]
          );
          importedIds.push(id);
        }
      }
      await client.query("COMMIT");
      res.json({ message: `Successfully parsed and imported ${importedIds.length} profiles.`, importedCount: importedIds.length });
    } catch (err: any) {
      await client.query("ROLLBACK");
      console.error("CSV Upload Error:", err);
      res.status(500).json({ message: err.message || "Bulk upload failed due to database constraint." });
    } finally {
      client.release();
    }
  });

  app.put("/api/students/:id", async (req, res) => {
    const { fullName, email, phone, batchId, semester, isActive, profilePhotoUrl, password } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const r = await client.query(
        "UPDATE students SET full_name = COALESCE($1, full_name), email = COALESCE($2, email), phone = COALESCE($3, phone), batch_id = COALESCE($4, batch_id), semester = COALESCE($5, semester), is_active = COALESCE($6, is_active), profile_photo_url = COALESCE($7, profile_photo_url) WHERE id = $8 RETURNING *",
        [fullName || null, email || null, phone !== undefined ? phone : null, batchId || null, semester ? parseInt(semester, 10) : null, isActive !== undefined ? isActive : null, profilePhotoUrl || null, req.params.id]
      );
      if (r.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Not found" });
      }
      if (password) {
        await client.query("UPDATE users SET password_hash = $1, email = COALESCE($2, email) WHERE target_id = $3", [password, email || null, req.params.id]);
      } else if (email) {
        await client.query("UPDATE users SET email = $1 WHERE target_id = $2", [email, req.params.id]);
      }
      await client.query("COMMIT");
      res.json(mapStu(r.rows[0]));
    } catch (e) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: "Update fail" });
    } finally {
      client.release();
    }
  });

  app.delete("/api/students/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM students WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "Delete fail" });
    }
  });

  // Subjects CRUD
  app.get("/api/subjects", async (req, res) => {
    try {
      const r = await pool.query("SELECT * FROM subjects ORDER BY code ASC");
      res.json(r.rows.map(mapSub));
    } catch (e) {
      res.status(500).json({ message: "Error" });
    }
  });

  app.post("/api/subjects", async (req, res) => {
    const { code, name, semester, departmentId, assignedTeacherId } = req.body;
    if (!code || !name || !semester || !departmentId) {
      return res.status(400).json({ message: "Missing parameters" });
    }
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

  app.put("/api/subjects/:id", async (req, res) => {
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

  app.delete("/api/subjects/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM subjects WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "Delete error" });
    }
  });

  // Attendance CRUD endpoints
  app.post("/api/attendance/mark", async (req, res) => {
    const { subjectId, batchId, date, records } = req.body;
    if (!subjectId || !batchId || !date || !Array.isArray(records)) {
      return res.status(400).json({ message: "Invalid payload parameters" });
    }

    const client = await pool.connect();
    const inserted: any[] = [];
    try {
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
      await client.query("ROLLBACK");
      res.status(500).json({ message: "Operational transaction failed" });
    } finally {
      client.release();
    }
  });

  app.put("/api/attendance/edit", async (req, res) => {
    const { recordId, newStatus, remarks, modifiedBy } = req.body;
    if (!recordId || !newStatus || !modifiedBy) {
      return res.status(400).json({ message: "Required parameters missing" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const recordRes = await client.query("SELECT * FROM attendance_records WHERE id = $1", [recordId]);
      if (recordRes.rowCount === 0) {
        await client.query("ROLLBACK");
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
      await client.query("ROLLBACK");
      res.status(500).json({ message: "Audit transaction failed" });
    } finally {
      client.release();
    }
  });

  app.get("/api/attendance/query", async (req, res) => {
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

  app.get("/api/attendance/audit-logs", async (req, res) => {
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

  // Admin Level System Stats
  app.get("/api/analytics/admin-summary", async (req, res) => {
    try {
      const studentsCount = await pool.query("SELECT COUNT(*) FROM students");
      const teachersCount = await pool.query("SELECT COUNT(*) FROM teachers");
      const subjectsCount = await pool.query("SELECT COUNT(*) FROM subjects");
      const deptsCount = await pool.query("SELECT COUNT(*) FROM departments");
      const batchesCount = await pool.query("SELECT COUNT(*) FROM batches");

      const totalStudents = Number(studentsCount.rows[0].count);
      const totalTeachers = Number(teachersCount.rows[0].count);
      const totalSubjects = Number(subjectsCount.rows[0].count);
      const totalDepartments = Number(deptsCount.rows[0].count);
      const totalBatches = Number(batchesCount.rows[0].count);

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
      const allDepts = await pool.query("SELECT * FROM departments");
      for (let dept of allDepts.rows) {
        const deptRes = await pool.query(
          `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as presents
           FROM attendance_records r
           JOIN subjects s ON r.subject_id = s.id
           WHERE s.department_id = $1`,
          [dept.id]
        );
        const total = Number(deptRes.rows[0].total);
        const presents = Number(deptRes.rows[0].presents || 0);
        deptAverages.push({
          departmentName: dept.name,
          code: dept.code,
          percentage: total > 0 ? Math.round((presents / total) * 100) : 84
        });
      }

      let semesterData: any[] = [];
      for (let sem of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const semRes = await pool.query(
          `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as presents
           FROM attendance_records r
           JOIN subjects s ON r.subject_id = s.id
           WHERE s.semester = $1`,
          [sem]
        );
        const total = Number(semRes.rows[0].total);
        const presents = Number(semRes.rows[0].presents || 0);
        if (total > 0) {
          semesterData.push({ semester: sem, percentage: Math.round((presents / total) * 100) });
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

  // Student Dashboard statistics
  app.get("/api/analytics/student/:studentId", async (req, res) => {
    const sId = req.params.studentId;
    try {
      const studentRes = await pool.query("SELECT * FROM students WHERE id = $1", [sId]);
      if (studentRes.rowCount === 0) return res.status(404).json({ message: "Student record not found." });
      const student = mapStu(studentRes.rows[0])!;

      const recordsRes = await pool.query("SELECT * FROM attendance_records WHERE student_id = $1", [sId]);
      const records = recordsRes.rows;
      const totalClasses = records.length;
      const presentClasses = records.filter(r => r.status === "PRESENT").length;
      const overallRatio = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 100;

      const batchRes = await pool.query("SELECT department_id FROM batches WHERE id = $1", [student.batchId]);
      const departmentId = batchRes.rowCount > 0 ? batchRes.rows[0].department_id : "";

      const subjectsRes = await pool.query(
        "SELECT * FROM subjects WHERE semester = $1 AND department_id = $2",
        [student.semester, departmentId]
      );
      
      const subjectStats = [];
      for (let sub of subjectsRes.rows) {
        const subRecords = records.filter(r => r.subject_id === sub.id);
        const subTotal = subRecords.length;
        const subPresents = subRecords.filter(r => r.status === "PRESENT").length;
        const ratio = subTotal > 0 ? Math.round((subPresents / subTotal) * 100) : 100;

        let category = "SAFE";
        if (ratio < 60) category = "CRITICAL";
        else if (ratio < 80) category = "WARNING";

        subjectStats.push({
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          total: subTotal,
          present: subPresents,
          absent: subTotal - subPresents,
          percentage: ratio,
          category
        });
      }

      const logsQuery = `
        SELECT r.id, r.date, s.name as subject_name, s.code as subject_code, r.status
        FROM attendance_records r
        JOIN subjects s ON r.subject_id = s.id
        WHERE r.student_id = $1
        ORDER BY r.date DESC
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

      const monthlyStats = [
        { name: "Jan", ratio: 88 },
        { name: "Feb", ratio: 91 },
        { name: "Mar", ratio: 84 },
        { name: "Apr", ratio: 90 },
        { name: "May", ratio: overallRatio },
      ];

      res.json({
        overallPercentage: overallRatio,
        totalClasses,
        presentClasses,
        absentClasses: totalClasses - presentClasses,
        subjectStats,
        recentLogs,
        monthlyStats,
        statusCategory: overallRatio < 60 ? "CRITICAL" : overallRatio < 80 ? "WARNING" : "SAFE"
      });
    } catch (err) {
      res.status(500).json({ error: "Error compiling student dashboard facts" });
    }
  });

  // Teacher Dashboard statistics
  app.get("/api/analytics/teacher/:teacherId", async (req, res) => {
    const tId = req.params.teacherId;
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
        const recordsRes = await pool.query(
          `SELECT r.*, s.full_name as student_name, sub.name as subject_name
           FROM attendance_records r
           JOIN students s ON r.student_id = s.id
           JOIN subjects sub ON r.subject_id = sub.id
           WHERE r.subject_id = ANY($1)`,
          [assignedSubIds]
        );
        const teacherRecords = recordsRes.rows;

        const uniqueClassKeys = new Set(teacherRecords.map(r => `${r.subject_id}_${r.batch_id}_${r.date}`));
        classesConducted = uniqueClassKeys.size;

        const totalStudentsHeads = teacherRecords.length;
        const totalPresents = teacherRecords.filter(r => r.status === "PRESENT").length;
        averageAttendance = totalStudentsHeads > 0 ? Math.round((totalPresents / totalStudentsHeads) * 100) : 85;

        for (let sub of assignedSubjects) {
          const sRecords = teacherRecords.filter(r => r.subject_id === sub.id);
          const uniqueDates = new Set(sRecords.map(r => r.date)).size;
          const totalHeads = sRecords.length;
          const presents = sRecords.filter(r => r.status === "PRESENT").length;
          subjectSummaries.push({
            subjectId: sub.id,
            subjectName: sub.name,
            subjectCode: sub.code,
            classesHeld: uniqueDates,
            averageRatio: totalHeads > 0 ? Math.round((presents / totalHeads) * 100) : 85
          });
        }

        recentActivity = teacherRecords.map(r => {
          const d = new Date(r.date);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return { id: r.id, date: dateStr, studentName: r.student_name, subjectName: r.subject_name, status: r.status };
        }).sort((a,b) => b.id.localeCompare(a.id)).slice(0, 10);

        const studentPerformanceTracker: { [key: string]: { present: number, total: number } } = {};
        teacherRecords.forEach((rec) => {
          if (!studentPerformanceTracker[rec.student_id]) {
            studentPerformanceTracker[rec.student_id] = { present: 0, total: 0 };
          }
          studentPerformanceTracker[rec.student_id].total++;
          if (rec.status === 'PRESENT') {
            studentPerformanceTracker[rec.student_id].present++;
          }
        });

        Object.keys(studentPerformanceTracker).forEach((key) => {
          const perf = studentPerformanceTracker[key];
          const ratio = (perf.present / perf.total) * 100;
          if (ratio < 80) {
            teacherDefaulterCount++;
          }
        });
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

  app.get("/api/analytics/batch/:batchId", async (req, res) => {
    const bId = req.params.batchId;
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

  // Notifications API
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const r = await pool.query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC", [req.params.userId]);
      res.json(r.rows.map(mapNotif));
    } catch (e) {
      res.status(500).json([]);
    }
  });

  app.post("/api/notifications/read/:notifId", async (req, res) => {
    try {
      await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1", [req.params.notifId]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to read" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // In production, Vercel handles static file serving.
  // We add a fallback for client-side routing (SPA behavior).
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

// Auto migrations & seed db helper (LOCAL ONLY)
async function autoMigrateAndSeed() {
  console.log("⚙️ [PostgreSQL] Initializing auto-migration system...");
  try {
    const checkTable = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
    );
    const tableExists = checkTable.rows[0].exists;

    if (!tableExists) {
      console.log("🐘 [PostgreSQL] Database is uninitialized. Running schema.sql...");
      const schemaPath = path.join(process.cwd(), "schema.sql");
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, "utf8");
        await pool.query(schemaSql);
        console.log("✅ [PostgreSQL] Schema initialized successfully.");
      } else {
        console.error("❌ [PostgreSQL] schema.sql file not found at project root!");
        return;
      }
    }
  } catch (err) {
    console.error("❌ [PostgreSQL] Auto-migration error:", err);
  }
}

// This block is for local development only. It will not run on Vercel.
if (process.env.NODE_ENV !== "production") {
  (async () => {
    await autoMigrateAndSeed();
    const PORT = process.env.PORT || 3000;
    const viteMod = "vite";
    const { createServer: createViteServer } = await import(viteMod);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[UAMS Dev Server] Running on http://localhost:${PORT}`);
    });
  })();
}

// Vercel Serverless Export
export default app;
