import React, { useState, useEffect } from "react";
import { 
  Department, Batch, Teacher, Student, Subject, 
  AdminSummaryResponse, BatchAnalyticsResponse 
} from "../types";
import { uamsFetch as fetch } from "../utils/api";
import { 
  Layers, Users, Columns, ClipboardList, TrendingUp, ShieldAlert,
  Award, FileSpreadsheet, Plus, Edit, Trash2, CheckCircle2, UserCheck, 
  AlertTriangle, Eye, ArrowUpDown, RefreshCw, UploadCloud, Search, Calendar
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";

export default function AdminPortal() {
  // Tabs Navigation: "DASHBOARD" | "DEPARTMENTS" | "BATCHES_SUBJECTS" | "TEACHERS" | "STUDENTS" | "REPORTS"
  const [activeTab, setActiveTab] = useState<"DASHBOARD" | "DEPARTMENTS" | "BATCHES_SUBJECTS" | "TEACHERS" | "STUDENTS" | "REPORTS">("DASHBOARD");

  // Core collections
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsSummary, setStudentsSummary] = useState<Record<string, any>>({});
  const [analytics, setAnalytics] = useState<AdminSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Forms overlay triggers
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: "", code: "", description: "" });

  // Batches embedded inside departments view
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState({ name: "", semester: 1, academicYear: "2025-2026", departmentId: "" });

  // Subjects embedded inside departments view
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ code: "", name: "", semester: 1, departmentId: "", assignedTeacherId: "" });

  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherForm, setTeacherForm] = useState({ employeeId: "", fullName: "", email: "", phone: "", departmentId: "", password: "", profilePhotoUrl: "" });

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentForm, setStudentForm] = useState({ enrollmentNumber: "", rollNumber: "", fullName: "", email: "", phone: "", batchId: "", semester: 5, password: "", profilePhotoUrl: "" });

  // Bulk CSV Simulation state
  const [csvRaw, setCsvRaw] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Report filters
  const [filterSemester, setFilterSemester] = useState("ALL");
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [filterRatioRange, setFilterRatioRange] = useState("ALL"); // "ALL" | "SAFE" | "WARNING" | "CRITICAL"
  const [reportsList, setReportsList] = useState<any[]>([]);

  // Reload Database collections from custom Express backend API
  const refreshDatabase = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/departments").then(res => res.ok ? res.json() : Promise.reject(res)),
      fetch("/api/batches").then(res => res.ok ? res.json() : Promise.reject(res)),
      fetch("/api/subjects").then(res => res.ok ? res.json() : Promise.reject(res)),
      fetch("/api/teachers").then(res => res.ok ? res.json() : Promise.reject(res)),
      fetch("/api/students").then(res => res.ok ? res.json() : Promise.reject(res)),
      fetch("/api/analytics/admin-summary").then(res => res.ok ? res.json() : Promise.reject(res)),
      fetch("/api/analytics/students-summary").then(res => res.ok ? res.json() : Promise.reject(res))
    ])
    .then(([allDepts, allBatches, allSubjects, allTeachers, allStudents, stats, summary]) => {
      setDepartments(allDepts);
      setBatches(allBatches);
      setSubjects(allSubjects);
      setTeachers(allTeachers);
      setStudents(allStudents);
      setAnalytics(stats);
      setStudentsSummary(summary || {});
      setLoading(false);
    })
    .catch((err) => {
      console.error("Failed to query full stack relational models", err);
      setLoading(false);
    });
  };

  useEffect(() => {
    refreshDatabase();
  }, [activeTab]);

  // Handle report filter recalculations dynamically
  useEffect(() => {
    if (loading || students.length === 0) return;

    // Load custom metrics for all students list synchronously from precalculated studentsSummary
    const results = students.map((stu) => {
      const bDetail = batches.find(b => b.id === stu.batchId);
      const dDetail = departments.find(d => d.id === bDetail?.departmentId);
      const stats = studentsSummary[stu.id] || { overallPercentage: 100, statusCategory: "SAFE" };

      return {
        studentId: stu.id,
        fullName: stu.fullName,
        enrollmentNumber: stu.enrollmentNumber,
        rollNumber: stu.rollNumber,
        departmentId: dDetail?.id,
        deptName: dDetail?.name || "N/A",
        semester: stu.semester,
        percentage: stats.overallPercentage !== undefined ? stats.overallPercentage : 100,
        category: stats.statusCategory || "SAFE",
        profilePhotoUrl: stu.profilePhotoUrl
      };
    });

    let filtered = results;
    
    if (filterSemester !== "ALL") {
      filtered = filtered.filter(r => r.semester === parseInt(filterSemester, 10));
    }
    if (filterDepartment !== "ALL") {
      filtered = filtered.filter(r => r.departmentId === filterDepartment);
    }
    if (filterRatioRange !== "ALL") {
      filtered = filtered.filter(r => r.category === filterRatioRange);
    }

    setReportsList(filtered);
  }, [students, batches, departments, studentsSummary, filterSemester, filterDepartment, filterRatioRange, loading]);

  // Departments CRUD functions
  const saveDept = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!selectedDept;
    const url = isEdit ? `/api/departments/${selectedDept.id}` : "/api/departments";
    const method = isEdit ? "PUT" : "POST";

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deptForm)
    })
    .then(res => res.ok ? res.json() : Promise.reject(res))
    .then(() => {
      setShowDeptModal(false);
      setDeptForm({ name: "", code: "", description: "" });
      setSelectedDept(null);
      refreshDatabase();
    })
    .catch(console.error);
  };

  const deleteDept = (id: string) => {
    if (confirm("Are you sure you want to delete this Department? This will delete mapped courses.")) {
      fetch(`/api/departments/${id}`, { method: "DELETE" })
        .then(() => refreshDatabase());
    }
  };

  // Batches internal creation functions
  const saveBatch = (e: React.FormEvent) => {
    e.preventDefault();
    fetch("/api/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batchForm)
    })
    .then(res => res.ok ? res.json() : Promise.reject(res))
    .then(() => {
      setShowBatchModal(false);
      refreshDatabase();
    })
    .catch(console.error);
  };

  const deleteBatch = (id: string) => {
    if (confirm("Delete this batch? All mapped students and records might be affected.")) {
      fetch(`/api/batches/${id}`, { method: "DELETE" }).then(() => refreshDatabase());
    }
  };

  // Subjects internal creation functions
  const saveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!selectedSubject;
    const url = isEdit ? `/api/subjects/${selectedSubject.id}` : "/api/subjects";
    const method = isEdit ? "PUT" : "POST";

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subjectForm)
    })
    .then(res => res.ok ? res.json() : Promise.reject(res))
    .then(() => {
      setShowSubjectModal(false);
      refreshDatabase();
    })
    .catch(console.error);
  };

  const deleteSubject = (id: string) => {
    if (confirm("Delete this subject? This will delete mapped attendance records.")) {
      fetch(`/api/subjects/${id}`, { method: "DELETE" }).then(() => refreshDatabase());
    }
  };

  // Teachers CRUD
  const saveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const isEdit = !!selectedTeacher;
    const url = isEdit ? `/api/teachers/${selectedTeacher.id}` : "/api/teachers";
    const method = isEdit ? "PUT" : "POST";

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(teacherForm)
    })
    .then(async res => {
      if (!res.ok) {
        let errMsg = "An error occurred";
        try {
          const errData = await res.json();
          errMsg = errData.message || errMsg;
        } catch {
          errMsg = await res.text() || errMsg;
        }
        throw new Error(res.status === 413 ? "Image file is too large. Please select a smaller photo." : errMsg);
      }
      return res.json();
    })
    .then(() => {
      setShowTeacherModal(false);
      setTeacherForm({ employeeId: "", fullName: "", email: "", phone: "", departmentId: "", password: "", profilePhotoUrl: "" });
      setSelectedTeacher(null);
      refreshDatabase();
      setIsSubmitting(false);
    })
    .catch(err => {
      alert("Failed to save teacher: " + err.message);
      setIsSubmitting(false);
    });
  };

  const deleteTeacher = (id: string) => {
    if (confirm("Deactivate staff profile? This logs security de-allocation triggers.")) {
      fetch(`/api/teachers/${id}`, { method: "DELETE" })
        .then(() => refreshDatabase());
    }
  };

  // Students CRUD
  const saveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const isEdit = !!selectedStudent;
    const url = isEdit ? `/api/students/${selectedStudent.id}` : "/api/students";
    const method = isEdit ? "PUT" : "POST";

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(studentForm)
    })
    .then(async res => {
      if (!res.ok) {
        let errMsg = "An error occurred";
        try {
          const errData = await res.json();
          errMsg = errData.message || errMsg;
        } catch {
          errMsg = await res.text() || errMsg;
        }
        throw new Error(res.status === 413 ? "Image file is too large. Please select a smaller photo." : errMsg);
      }
      return res.json();
    })
    .then(() => {
      setShowStudentModal(false);
      setStudentForm({ enrollmentNumber: "", rollNumber: "", fullName: "", email: "", phone: "", batchId: "", semester: 5, password: "", profilePhotoUrl: "" });
      setSelectedStudent(null);
      refreshDatabase();
      setIsSubmitting(false);
    })
    .catch(err => {
      alert("Failed to save student: " + err.message);
      setIsSubmitting(false);
    });
  };

  const deleteStudent = (id: string) => {
    if (confirm("Remove student profile completely?")) {
      fetch(`/api/students/${id}`, { method: "DELETE" })
        .then(() => refreshDatabase());
    }
  };

  // CSV Bulk Upload simulation
  const executeCsvBulkImport = () => {
    if (!csvRaw.trim()) {
      alert("Provide a few CSV structured student lines first or use Quick Seed buttons.");
      return;
    }
    
    // Parse simulation lines: EnrollmentNumber, RollNumber, FullName, Email, Phone, BatchID, Semester, Password
    const lines = csvRaw.split("\n").filter(l => l.trim().length > 0);
    const parsedRows: any[] = [];
    
    lines.forEach((line) => {
      const parts = line.split(",").map(p => p.trim());
      if (parts.length >= 8) {
        parsedRows.push({
          enrollmentNumber: parts[0],
          rollNumber: parts[1],
          fullName: parts[2],
          email: parts[3],
          phone: parts[4],
          batchId: parts[5],
          semester: parseInt(parts[6], 10),
          password: parts[7]
        });
      }
    });

    if (parsedRows.length === 0) {
      alert("Invalid format. Format must be: EnrollmentNumber, RollNumber, FullName, Email, Phone, BatchID, Semester, Password");
      return;
    }

    fetch("/api/students/bulk-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvRows: parsedRows })
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload Failed");
      return data;
    })
    .then((reply) => {
      setBulkMessage(reply.message);
      setCsvRaw("");
      refreshDatabase();
    })
    .catch((err) => {
      setBulkMessage(`Error: ${err.message}`);
    });
  };

  const getDefaulterBorderColor = (category: "SAFE" | "WARNING" | "CRITICAL") => {
    switch (category) {
      case "SAFE": return "border-emerald-100 text-emerald-700 bg-emerald-50";
      case "WARNING": return "border-amber-100 text-amber-700 bg-amber-50";
      case "CRITICAL": return "border-rose-100 text-rose-700 bg-rose-50";
    }
  };

  if (loading || !analytics || !analytics.totals) {
    return (
      <div className="w-full space-y-6 select-none animate-fade-in">
        {/* Admin Nav Tab Bar Skeleton */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg border border-slate-100 shimmer"></div>
            <div className="space-y-1.5">
              <div className="h-4 w-32 shimmer rounded-md"></div>
              <div className="h-3 w-48 bg-slate-100/50 rounded-sm shimmer"></div>
            </div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-20 shimmer rounded-lg"></div>
            ))}
          </div>
        </div>

        {/* Totals Metric cards (4 columns) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-slate-100 p-5 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 bg-slate-100/70 rounded-md shimmer"></div>
                <div className="w-6 h-6 rounded-lg border border-slate-50 shimmer"></div>
              </div>
              <div className="space-y-2">
                <div className="h-6 w-12 shimmer rounded-lg"></div>
                <div className="h-3 w-24 bg-slate-100/50 rounded-md shimmer"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Section Body Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Filters column / side widget */}
          <div className="lg:col-span-4 bg-white border border-slate-100 p-5 rounded-2xl space-y-4 shadow-xs">
            <div className="h-4 w-28 bg-slate-200/80 rounded-md shimmer"></div>
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-16 bg-slate-100/70 rounded-sm shimmer"></div>
                  <div className="h-9 w-full bg-slate-200/40 rounded-xl shimmer"></div>
                </div>
              ))}
            </div>
          </div>

          {/* List data rows column */}
          <div className="lg:col-span-8 bg-white border border-slate-100 p-6 rounded-2xl space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="h-4 w-32 bg-slate-200/80 rounded-lg shimmer"></div>
              <div className="h-3.5 w-16 bg-slate-100/70 rounded-md shimmer"></div>
            </div>
            
            {/* Rows placeholders */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="py-3 border-b border-slate-100/70 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-200/50 shrink-0 shimmer"></div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="h-3.5 w-40 bg-slate-200/70 rounded-md shimmer"></div>
                    <div className="h-3 w-28 bg-slate-100/60 rounded-md shimmer"></div>
                  </div>
                </div>
                <div className="h-4 w-12 bg-slate-200/60 rounded-md shrink-0 shimmer"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in pb-24 md:pb-0">
      
      {/* Admin Central Nav Tab Bar */}
      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl border border-slate-700 shadow-sm flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800 font-display tracking-tight">University Management Portal</h2>
            <p className="text-[10px] text-slate-500 font-bold font-sans">Role Authorized: Global Administrator Authority</p>
          </div>
        </div>

        <div className="hidden md:flex flex-wrap gap-1 bg-slate-50 p-1 rounded-xl border border-slate-205">
          <button
            onClick={() => setActiveTab("DASHBOARD")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-all ${activeTab === "DASHBOARD" ? "bg-slate-900 text-white shadow-xs" : "text-slate-700 hover:text-slate-950"}`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("DEPARTMENTS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-all ${activeTab === "DEPARTMENTS" ? "bg-slate-900 text-white shadow-xs" : "text-slate-700 hover:text-slate-950"}`}
          >
            Departments
          </button>
          <button
            onClick={() => setActiveTab("TEACHERS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-all ${activeTab === "TEACHERS" ? "bg-slate-900 text-white shadow-xs" : "text-slate-700 hover:text-slate-950"}`}
          >
            Teachers
          </button>
          <button
            id="tab-admin-students"
            onClick={() => setActiveTab("STUDENTS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-all ${activeTab === "STUDENTS" ? "bg-slate-900 text-white shadow-xs" : "text-slate-700 hover:text-slate-950"}`}
          >
            Students
          </button>
          <button
            onClick={() => setActiveTab("REPORTS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-all ${activeTab === "REPORTS" ? "bg-slate-900 text-white shadow-xs" : "text-slate-700 hover:text-slate-950"}`}
          >
            Defaulter Reports
          </button>
        </div>
      </div>

      {/* Grid of total statistics */}
      {activeTab === "DASHBOARD" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Total Enrollments</span>
              <strong className="text-2xl font-extrabold text-slate-800 font-mono tracking-tight block mt-1">{analytics.totals.totalStudents}</strong>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Registered Teachers</span>
              <strong className="text-2xl font-extrabold text-slate-800 font-mono tracking-tight block mt-1">{analytics.totals.totalTeachers}</strong>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Active Classes Mapped</span>
              <strong className="text-2xl font-extrabold text-slate-800 font-mono tracking-tight block mt-1">{analytics.totals.totalSubjects}</strong>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Total Departments</span>
              <strong className="text-2xl font-extrabold text-slate-800 font-mono tracking-tight block mt-1">{analytics.totals.totalDepartments}</strong>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Today's Presence Ratio</span>
              <strong className="text-2xl font-extrabold text-indigo-700 font-mono tracking-tight block mt-1">{analytics.totals.todayAttendanceRatio}%</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Dept averages bar */}
            <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm min-h-[350px] flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm font-display tracking-tight">Department-wise Averages (%)</h3>
                <p className="text-[11px] text-slate-550 mt-0.5">Rolling average attendance index computed by department.</p>
              </div>

              <div className="flex-1 min-h-[220px] mt-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.deptAverages} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="code" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", color: "white" }} />
                    <Bar dataKey="percentage" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} name="Attendance Avg %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Semester-wise analytics */}
            <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm min-h-[350px] flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm font-display tracking-tight">Active Semester averages (%)</h3>
                <p className="text-[11px] text-slate-550 mt-0.5">Average overall attendance calculated dynamically over semesters.</p>
              </div>

              <div className="flex-1 min-h-[220px] mt-4">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={analytics.semesterData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="semester" stroke="#94a3b8" fontSize={11} tickLine={false} name="Semester" />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", color: "white" }} />
                    <Area type="monotone" dataKey="percentage" stroke="#fda4af" fill="#fecdd3" strokeWidth={3} name="Average %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Defaulter ratios and safe indexes info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <strong className="text-[11px] uppercase tracking-widest text-emerald-800 font-sans font-bold">Safe Tier Roster (&ge;80%)</strong>
              <p className="text-3xl font-extrabold text-emerald-950 font-mono mt-2">{analytics.defaulters.safeCount} students</p>
              <p className="text-xs text-emerald-800 mt-1">These student profiles satisfy minimum academic threshold criteria.</p>
            </div>
            <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl">
              <strong className="text-[11px] uppercase tracking-widest text-amber-805 font-sans font-bold">Warning Tier Roster (65%-80%)</strong>
              <p className="text-3xl font-extrabold text-amber-950 font-mono mt-2">{analytics.defaulters.warningCount} students</p>
              <p className="text-xs text-amber-800 mt-1">Flagged automatically. Caution warning banners populated on dashboards.</p>
            </div>
            <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl">
              <strong className="text-[11px] uppercase tracking-widest text-rose-805 font-sans font-bold">Critical Defaulter Tier (&lt;60%)</strong>
              <p className="text-3xl font-extrabold text-rose-950 font-mono mt-2">{analytics.defaulters.criticalCount} students</p>
              <p className="text-xs text-rose-800 mt-1">Mandatorily barred. Require immediate academic counseling meeting.</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. DEPARTMENTS CRUD VIEW */}
      {activeTab === "DEPARTMENTS" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base font-display tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Department Management
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Create, edit, and audit department structures saved in relational DB tables.</p>
            </div>
            <button
              onClick={() => {
                setSelectedDept(null);
                setDeptForm({ name: "", code: "", description: "" });
                setShowDeptModal(true);
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 hover:text-white transition-all text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {departments.map((dept) => {
              const deptBatches = batches.filter(b => b.departmentId === dept.id);
              const deptSubjects = subjects.filter(s => s.departmentId === dept.id);
              return (
                <div key={dept.id} className="p-5 bg-slate-50 border border-slate-150 rounded-xl flex flex-col justify-between hover:border-indigo-200 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                        {dept.code}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setSelectedDept(dept);
                            setDeptForm({ name: dept.name, code: dept.code, description: dept.description });
                            setShowDeptModal(true);
                          }}
                          className="p-1 hover:bg-slate-205 text-slate-500 rounded"
                          title="Edit Department"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteDept(dept.id)}
                          className="p-1 hover:bg-rose-100 text-rose-600 rounded"
                          title="Delete Department"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-bold text-sm text-slate-800 mt-3">{dept.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{dept.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Batches ({deptBatches.length})</span>
                      <button 
                        onClick={() => {
                          setBatchForm({ name: "", semester: 1, academicYear: "2025-2026", departmentId: dept.id });
                          setShowBatchModal(true);
                        }}
                        className="text-[10px] text-indigo-600 font-bold hover:underline"
                      >
                        + Add Batch
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                      {deptBatches.map(b => (
                        <div key={b.id} className="flex justify-between items-center bg-white border border-slate-100 p-1.5 rounded-lg text-[10px]">
                          <div>
                            <strong className="text-slate-700">{b.name}</strong>
                            <span className="text-slate-400 ml-1 font-mono">Sem {b.semester}</span>
                          </div>
                          <button onClick={() => deleteBatch(b.id)} className="text-rose-400 hover:text-rose-600">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center mb-2 mt-3 pt-3 border-t border-slate-200/50">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Subjects ({deptSubjects.length})</span>
                      <button 
                        onClick={() => {
                          setSelectedSubject(null);
                          setSubjectForm({ code: "", name: "", semester: 1, departmentId: dept.id, assignedTeacherId: "" });
                          setShowSubjectModal(true);
                        }}
                        className="text-[10px] text-indigo-600 font-bold hover:underline"
                      >
                        + Add Subject
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                      {deptSubjects.map(s => {
                        const assignedTeacher = teachers.find(t => t.id === s.assignedTeacherId);
                        return (
                          <div key={s.id} className="flex justify-between items-center bg-white border border-slate-100 p-1.5 rounded-lg text-[10px]">
                            <div>
                              <strong className="text-slate-700">[{s.code}] {s.name}</strong>
                              <span className="text-slate-400 ml-1 block mt-0.5">Sem {s.semester} • {assignedTeacher ? assignedTeacher.fullName : 'Unassigned'}</span>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => {
                                setSelectedSubject(s);
                                setSubjectForm({ code: s.code, name: s.name, semester: s.semester, departmentId: s.departmentId, assignedTeacherId: s.assignedTeacherId || "" });
                                setShowSubjectModal(true);
                              }} className="p-1 hover:bg-slate-200 text-slate-400 hover:text-indigo-600 rounded transition-colors">
                                <Edit className="w-3 h-3" />
                              </button>
                              <button onClick={() => deleteSubject(s.id)} className="p-1 hover:bg-rose-100 text-rose-400 hover:text-rose-600 rounded transition-colors">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Department Modals Overlay form */}
          {showDeptModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-fade-in relative">
                <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">
                  {selectedDept ? "Update Department Properties" : "Create New Department"}
                </h4>
                <form onSubmit={saveDept} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Department Name *</label>
                    <input
                      type="text"
                      required
                      value={deptForm.name}
                      onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                      placeholder="e.g., Artificial Intelligence"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Code * (Short Prefix)</label>
                    <input
                      type="text"
                      required
                      value={deptForm.code}
                      onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                      placeholder="e.g., AIML"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Description Brief</label>
                  <input
                    type="text"
                    value={deptForm.description}
                    onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                    placeholder="Brief syllabus outline description"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowDeptModal(false)}
                    className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 bg-slate-900 text-white font-semibold text-xs rounded-lg hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
              </div>
            </div>
          )}

          {/* Batch Modal Overlay */}
          {showBatchModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-fade-in relative">
                <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">
                  Create New Batch
                </h4>
                <form onSubmit={saveBatch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Batch Name *</label>
                    <input
                      type="text"
                      required
                      value={batchForm.name}
                      onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                      placeholder="e.g., M.Sc. Cyber Security"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Semester Level *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={8}
                      value={batchForm.semester}
                      onChange={(e) => setBatchForm({ ...batchForm, semester: parseInt(e.target.value, 10) })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Academic Year *</label>
                    <input
                      type="text"
                      required
                      value={batchForm.academicYear}
                      onChange={(e) => setBatchForm({ ...batchForm, academicYear: e.target.value })}
                      placeholder="e.g., 2025-2026"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(false)}
                    className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-slate-900 text-white font-semibold text-xs rounded-lg hover:bg-slate-800"
                  >
                    Save Batch
                  </button>
                </div>
              </form>
              </div>
            </div>
          )}

          {/* Subject Modal Overlay */}
          {showSubjectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-fade-in relative">
                <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">
                  {selectedSubject ? "Edit Subject" : "Create New Subject"}
                </h4>
                <form onSubmit={saveSubject} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Subject Name *</label>
                    <input
                      type="text"
                      required
                      value={subjectForm.name}
                      onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                      placeholder="e.g., Cyber Forensics"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Subject Code *</label>
                    <input
                      type="text"
                      required
                      value={subjectForm.code}
                      onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                      placeholder="e.g., CYB101"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Semester Level *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={8}
                      value={subjectForm.semester}
                      onChange={(e) => setSubjectForm({ ...subjectForm, semester: parseInt(e.target.value, 10) })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Assign Teacher</label>
                    <select
                      value={subjectForm.assignedTeacherId}
                      onChange={(e) => setSubjectForm({ ...subjectForm, assignedTeacherId: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white focus:outline-hidden"
                    >
                      <option value="">-- Unassigned --</option>
                      {teachers.filter(t => t.departmentId === subjectForm.departmentId).map(t => (
                        <option key={t.id} value={t.id}>{t.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSubjectModal(false)}
                    className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-slate-900 text-white font-semibold text-xs rounded-lg hover:bg-slate-800"
                  >
                    Save Subject
                  </button>
                </div>
              </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. TEACHERS CRUD MANAGEMENT */}
      {activeTab === "TEACHERS" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base font-display tracking-tight">Active Faculty Directory</h3>
              <p className="text-xs text-slate-600 mt-0.5">Control employee ID parameters, department associations, and teacher profiles.</p>
            </div>
            <button
              onClick={() => {
                setSelectedTeacher(null);
                setTeacherForm({ employeeId: `EMP${Math.floor(Math.random()*900)+100}`, fullName: "", email: "", phone: "", departmentId: "", password: "", profilePhotoUrl: "" });
                setShowTeacherModal(true);
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:text-white transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Register Faculty</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <th className="p-3">Employee ID</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Department Domain</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Phone Line</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {teachers.map((teach) => {
                  const dept = departments.find(d => d.id === teach.departmentId);
                  return (
                    <tr key={teach.id} className="hover:bg-slate-50/40">
                      <td className="p-3 font-mono text-[11px] font-bold text-slate-800">{teach.employeeId}</td>
                      <td className="p-3 font-semibold text-slate-800 flex items-center gap-2">
                        {teach.profilePhotoUrl ? (
                          <img src={teach.profilePhotoUrl} className="w-6 h-6 rounded-md object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-6 h-6 bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                            {teach.fullName.charAt(0)}
                          </div>
                        )}
                        {teach.fullName}
                      </td>
                      <td className="p-3 text-slate-500">{dept ? dept.name : "N/A"}</td>
                      <td className="p-3">{teach.email}</td>
                      <td className="p-3 font-mono">{teach.phone || "---"}</td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => {
                            setSelectedTeacher(teach);
                            setTeacherForm({
                              employeeId: teach.employeeId,
                              fullName: teach.fullName,
                              email: teach.email,
                              phone: teach.phone,
                              departmentId: teach.departmentId,
                              password: "",
                              profilePhotoUrl: teach.profilePhotoUrl || ""
                            });
                            setShowTeacherModal(true);
                          }}
                          className="p-1 hover:bg-slate-100 text-slate-500 rounded inline-flex"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteTeacher(teach.id)}
                          className="p-1 hover:bg-rose-50 text-rose-600 rounded inline-flex"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Teacher Modals Overlay form */}
          {showTeacherModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 space-y-4 animate-fade-in relative">
                <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">
                  {selectedTeacher ? "Modify Staff Parameters" : "Register Staff User Account"}
                </h4>
                <form onSubmit={saveTeacher} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Employee ID Code *</label>
                    <input
                      type="text"
                      required
                      value={teacherForm.employeeId}
                      onChange={(e) => setTeacherForm({ ...teacherForm, employeeId: e.target.value })}
                      placeholder="e.g., EMP501"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={teacherForm.fullName}
                      onChange={(e) => setTeacherForm({ ...teacherForm, fullName: e.target.value })}
                      placeholder="e.g., Dr. Jane Foster"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Department Mapping *</label>
                    <select
                      required
                      value={teacherForm.departmentId}
                      onChange={(e) => setTeacherForm({ ...teacherForm, departmentId: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white"
                    >
                      <option value="" disabled>Select Department</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Email Domain *</label>
                    <input
                      type="email"
                      required
                      value={teacherForm.email}
                      onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                      placeholder="teacher.name@nfsu.gov.in"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Mobile Contact Phone</label>
                    <input
                      type="text"
                      value={teacherForm.phone}
                      onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                      placeholder="+1-555-8888"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Login Password {selectedTeacher ? "(Leave blank to keep current)" : "*"}</label>
                    <input
                      type="text"
                      required={!selectedTeacher}
                      value={teacherForm.password}
                      onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                      placeholder="Strong setup password"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Profile Photo (Upload)</label>
                    <div className="flex items-center gap-3">
                      {teacherForm.profilePhotoUrl && (
                        <img src={teacherForm.profilePhotoUrl} alt="Preview" className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setTeacherForm({ ...teacherForm, profilePhotoUrl: reader.result as string });
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-xs font-medium focus:outline-hidden file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-100 file:text-slate-600 hover:file:bg-slate-200 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowTeacherModal(false)}
                    className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 bg-slate-900 text-white font-semibold text-xs rounded-lg hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. STUDENTS ROSTER & BULK CSV */}
      {activeTab === "STUDENTS" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6 animate-fade-in">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base font-display tracking-tight">Active Student Directory</h3>
              <p className="text-xs text-slate-600 mt-0.5">Enroll new individual students or run batch bulk CSV loaders directly.</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setStudentForm({ 
                    enrollmentNumber: `NFSU2026${Math.floor(Math.random()*900)+100}`, 
                    rollNumber: `CYBER-SE-${Math.floor(Math.random()*90)+10}`, 
                    fullName: "", 
                    email: "", 
                    phone: "", 
                    batchId: "", 
                    semester: 3,
                    password: "",
                    profilePhotoUrl: ""
                  });
                  setShowStudentModal(true);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 hover:text-white transition-all text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Single Student Enrollment</span>
              </button>
            </div>
          </div>

          {/* Bulk Import Section Panel */}
          <div className="p-5 bg-slate-50 border border-slate-205 rounded-2xl space-y-4">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-slate-500" />
              Bulk CSV Student Upload (.csv)
            </h4>
            <p className="text-[11px] text-slate-500">
              Format structure: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">EnrollmentNumber, RollNumber, FullName, Email, Phone, BatchID, Semester, Password</code>
            </p>

            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    setCsvRaw(event.target?.result as string);
                  };
                  reader.readAsText(file);
                }
              }}
              className="w-full text-xs font-medium focus:outline-none file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
            />

            <textarea
              rows={3}
              value={csvRaw}
              onChange={(e) => setCsvRaw(e.target.value)}
              placeholder="NFSU2026991, CYBER-SE-91, Revati Iyer, revati.iyer@nfsu.gov.in, +91-98711-23456, batch-cs-a-555, 3, strongpass123"
              className="w-full p-3 border border-slate-200 rounded-xl text-xs font-mono bg-white focus:outline-hidden"
            ></textarea>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-[10px] text-slate-400 font-medium">Data automatically mapped to secure PostgreSQL instances.</div>
              <button
                onClick={executeCsvBulkImport}
                className="px-4 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800"
              >
                Launch Ingestion Engine
              </button>
            </div>

            {bulkMessage && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-150 text-emerald-800 text-xs font-semibold rounded-lg text-center">
                {bulkMessage}
              </div>
            )}
          </div>

          {/* Directory Listings */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <th className="p-3">Enrollment Number</th>
                  <th className="p-3">Roll Number</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Batch & semester</th>
                  <th className="p-3">Email</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
            {[...students].sort((a, b) => (a.rollNumber || "").localeCompare(b.rollNumber || "", undefined, { numeric: true })).map((stu) => {
                  const batchMatched = batches.find(b => b.id === stu.batchId);
                  return (
                    <tr key={stu.id} className="hover:bg-slate-50/40">
                      <td className="p-3 font-mono text-[11px] font-bold text-slate-800">{stu.enrollmentNumber}</td>
                      <td className="p-3 font-mono font-medium text-slate-500">{stu.rollNumber}</td>
                      <td className="p-3 font-bold text-slate-800 flex items-center gap-2">
                        {stu.profilePhotoUrl ? (
                          <img src={stu.profilePhotoUrl} className="w-6 h-6 rounded-md object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-6 h-6 bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                            {stu.fullName.charAt(0)}
                          </div>
                        )}
                        {stu.fullName}
                      </td>
                      <td className="p-3 text-slate-600">{batchMatched ? batchMatched.name : "N/A"} <span className="text-[10px] text-slate-400 block">Semester {stu.semester}</span></td>
                      <td className="p-3">{stu.email}</td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => {
                            setSelectedStudent(stu);
                            setStudentForm({
                              enrollmentNumber: stu.enrollmentNumber,
                              rollNumber: stu.rollNumber,
                              fullName: stu.fullName,
                              email: stu.email,
                              phone: stu.phone,
                              batchId: stu.batchId,
                              semester: stu.semester,
                              password: "",
                              profilePhotoUrl: stu.profilePhotoUrl || ""
                            });
                            setShowStudentModal(true);
                          }}
                          className="p-1 hover:bg-slate-100 text-slate-500 rounded inline-flex"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteStudent(stu.id)}
                          className="p-1 hover:bg-rose-50 text-rose-600 rounded inline-flex"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Student Modal overlay form */}
          {showStudentModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 space-y-4 animate-fade-in relative">
                <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">
                  {selectedStudent ? "Update Pupil Domain Properties" : "Enroll New Active Student"}
                </h4>
                <form onSubmit={saveStudent} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Enrollment Number *</label>
                    <input
                      type="text"
                      required
                      value={studentForm.enrollmentNumber}
                      onChange={(e) => setStudentForm({ ...studentForm, enrollmentNumber: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Roll Number Prefix *</label>
                    <input
                      type="text"
                      required
                      value={studentForm.rollNumber}
                      onChange={(e) => setStudentForm({ ...studentForm, rollNumber: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Full Pupil Name *</label>
                    <input
                      type="text"
                      required
                      value={studentForm.fullName}
                      onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Email address *</label>
                    <input
                      type="email"
                      required
                      value={studentForm.email}
                      onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Target Batch Mapping *</label>
                    <select
                      required
                      value={studentForm.batchId}
                      onChange={(e) => setStudentForm({ ...studentForm, batchId: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white"
                    >
                      <option value="" disabled>Select Batch</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Semester Level *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={8}
                      value={studentForm.semester}
                      onChange={(e) => setStudentForm({ ...studentForm, semester: parseInt(e.target.value, 10) })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Login Password {selectedStudent ? "(Leave blank to keep current)" : "*"}</label>
                    <input
                      type="text"
                      required={!selectedStudent}
                      value={studentForm.password}
                      onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                      placeholder="Strong setup password"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Profile Photo (Upload)</label>
                    <div className="flex items-center gap-3">
                      {studentForm.profilePhotoUrl && (
                        <img src={studentForm.profilePhotoUrl} alt="Preview" className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setStudentForm({ ...studentForm, profilePhotoUrl: reader.result as string });
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-xs font-medium focus:outline-hidden file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-100 file:text-slate-600 hover:file:bg-slate-200 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowStudentModal(false)}
                    className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-slate-900 text-white font-semibold text-xs rounded-lg hover:bg-slate-800"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. GLOBAL DEFAULTERS Roster Reports */}
      {activeTab === "REPORTS" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 overflow-hidden space-y-6 animate-fade-in">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base font-display tracking-tight">University Defaulter Register & Reports</h3>
            <p className="text-xs text-slate-600 mt-0.5">Filter across department rosters to extract students with sub-80% threshold metrics.</p>
          </div>

          {/* Filtering row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Filter Semester</label>
              <select
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden bg-white"
              >
                <option value="ALL">All Semesters</option>
                <option value="3">Semester 3</option>
                <option value="5">Semester 5</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Filter Department</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden bg-white"
              >
                <option value="ALL">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Attendance Threshold Bracket</label>
              <select
                value={filterRatioRange}
                onChange={(e) => setFilterRatioRange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden bg-white"
              >
                <option value="ALL">All Levels</option>
                <option value="SAFE">Safe Tier (&ge; 80%)</option>
                <option value="WARNING">Warning Tier (65% - 80%)</option>
                <option value="CRITICAL">Critical Tier (&lt; 60%)</option>
              </select>
            </div>
          </div>

          {/* Live results count */}
          <div className="flex justify-between items-center bg-slate-50 px-4 py-2 rounded-xl text-xs text-slate-550 border border-slate-200">
            <span>Query Results: <strong className="text-slate-800">{reportsList.length}</strong> pupil accounts fit current parameters.</span>
            <span className="font-mono text-[10px]">Threshold Alert &lt; 80%</span>
          </div>

          {/* Table list */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <th className="p-3">Enrollment</th>
                  <th className="p-3">Student Full Name</th>
                  <th className="p-3">Department Domain</th>
                  <th className="p-3">Semester</th>
                  <th className="p-3">Overall Percentage</th>
                  <th className="p-3">Bracket Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
            {[...reportsList].sort((a, b) => (a.rollNumber || "").localeCompare((b.rollNumber || ""), undefined, { numeric: true })).map((rep, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40 text-slate-650 font-sans">
                    <td className="p-3 font-mono text-[11px] font-bold text-slate-700">{rep.enrollmentNumber}</td>
                    <td className="p-3 font-bold text-slate-800 flex items-center gap-2">
                      {rep.profilePhotoUrl ? (
                        <img src={rep.profilePhotoUrl} className="w-6 h-6 rounded-md object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-6 h-6 bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                          {rep.fullName.charAt(0)}
                        </div>
                      )}
                      {rep.fullName}
                    </td>
                    <td className="p-3 text-slate-500">{rep.deptName}</td>
                    <td className="p-3 font-semibold">Semester {rep.semester}</td>
                    <td className="p-3 text-sm font-extrabold text-slate-800">{rep.percentage}%</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-lg border font-mono font-bold text-[9px] uppercase ${getDefaulterBorderColor(rep.category)}`}>
                        {rep.category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      </div>

      {/* Mobile Sticky bottom navigation bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl flex items-center justify-around z-50 select-none px-2">
        <button
          onClick={() => setActiveTab("DASHBOARD")}
          className={`flex flex-col items-center justify-center flex-1 h-14 rounded-xl transition-all duration-200 ${
            activeTab === "DASHBOARD"
              ? "text-amber-600 font-bold scale-105"
              : "text-slate-400 font-medium hover:text-slate-600"
          }`}
        >
          <TrendingUp className="w-4 h-4 mb-0.5" />
          <span className="text-[8px] tracking-tight font-sans">Analytics</span>
        </button>
        <button
          onClick={() => setActiveTab("DEPARTMENTS")}
          className={`flex flex-col items-center justify-center flex-1 h-14 rounded-xl transition-all duration-200 ${
            activeTab === "DEPARTMENTS"
              ? "text-amber-600 font-bold scale-105"
              : "text-slate-400 font-medium hover:text-slate-600"
          }`}
        >
          <Layers className="w-4 h-4 mb-0.5" />
          <span className="text-[8px] tracking-tight font-sans">Depts</span>
        </button>
        <button
          onClick={() => setActiveTab("TEACHERS")}
          className={`flex flex-col items-center justify-center flex-1 h-14 rounded-xl transition-all duration-200 ${
            activeTab === "TEACHERS"
              ? "text-amber-600 font-bold scale-105"
              : "text-slate-400 font-medium hover:text-slate-600"
          }`}
        >
          <UserCheck className="w-4 h-4 mb-0.5" />
          <span className="text-[8px] tracking-tight font-sans">Teachers</span>
        </button>
        <button
          id="mobile-tab-admin-students"
          onClick={() => setActiveTab("STUDENTS")}
          className={`flex flex-col items-center justify-center flex-1 h-14 rounded-xl transition-all duration-200 ${
            activeTab === "STUDENTS"
              ? "text-amber-600 font-bold scale-105"
              : "text-slate-400 font-medium hover:text-slate-600"
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span className="text-[8px] tracking-tight font-sans">Students</span>
        </button>
        <button
          onClick={() => setActiveTab("REPORTS")}
          className={`flex flex-col items-center justify-center flex-1 h-14 rounded-xl transition-all duration-200 ${
            activeTab === "REPORTS"
              ? "text-amber-600 font-bold scale-105"
              : "text-slate-400 font-medium hover:text-slate-600"
          }`}
        >
          <ClipboardList className="w-4 h-4 mb-0.5" />
          <span className="text-[8px] tracking-tight font-sans">Reports</span>
        </button>
      </div>
    </>
  );
}
