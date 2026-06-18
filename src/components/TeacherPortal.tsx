import { useState, useEffect } from "react";
import { 
  Teacher, Subject, Batch, Student, 
  TeacherAnalyticsResponse, AttendanceRecord, AttendanceAudit 
} from "../types";
import { uamsFetch as fetch } from "../utils/api";
import { 
  Users, CheckSquare, PlusCircle, History, Award, BookOpen, Clock, BarChart2,
  UserX, Info, Check, X, ClipboardList, PenTool, Edit3, ArrowRight, MessageSquare, AlertTriangle,
  Home, ChevronRight, ChevronLeft, Calendar, Search, FileText, FileSpreadsheet
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface TeacherPortalProps {
  teacherUser: Teacher;
  isMobileView?: boolean;
}

export default function TeacherPortal({ 
  teacherUser,
  isMobileView = false
}: TeacherPortalProps) {
  // Navigation states inside Teacher Dashboard
  const [activeTab, setActiveTab] = useState<"DASHBOARD" | "MARK_ATTENDANCE" | "EDIT_ATTENDANCE" | "AUDIT_TRAIL" | "DEFAULTERS" | "MONTHLY_REPORT" | "ANNOUNCEMENTS">("DASHBOARD");

  // Mobile-specific tabs: "MOBILE_OVERVIEW" | "MOBILE_MARK" | "MOBILE_CORRECT" | "MOBILE_AUDIT"
  const [mobileTab, setMobileTab] = useState<"OVERVIEW" | "MARK" | "CORRECT" | "AUDIT" | "MONTHLY">("OVERVIEW");
  const [mobileMarkStep, setMobileMarkStep] = useState<1 | 2>(1);
  const [mobileOverviewSubTab, setMobileOverviewSubTab] = useState<"STATS" | "CHARTS" | "CALENDAR" | "SUBSTITUTE" | "ANNOUNCEMENTS">("STATS");

  // Core state from Express Server
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [analytics, setAnalytics] = useState<TeacherAnalyticsResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<AttendanceAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorObj, setErrorObj] = useState<string | null>(null);

  // Lists for substitutions and announcements
  const [allTeachers, setTeachers] = useState<Teacher[]>([]);
  const [allDepartments, setDepartments] = useState<any[]>([]);
  const [activeSubstitutions, setActiveSubstitutions] = useState<any[]>([]);
  const [announcementHistory, setAnnouncementHistory] = useState<any[]>([]);

  // Substitution protocol state
  const [substituteSubjectId, setSubstituteSubjectId] = useState("all");
  const [substituteTeacherId, setSubstituteTeacherId] = useState("");
  const [substituteStatusMessage, setSubstituteStatusMessage] = useState("");
  const [substituteSubmitLoading, setSubstituteSubmitLoading] = useState(false);

  // Announcement state
  const [annType, setAnnType] = useState<"BATCH" | "DEPARTMENT">("BATCH");
  const [annTargetId, setAnnTargetId] = useState("");
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");
  const [annStatusMessage, setAnnStatusMessage] = useState("");
  const [annSubmitLoading, setAnnSubmitLoading] = useState(false);

  // Mark Attendance Screen states
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [markingDate, setMarkingDate] = useState(new Date().toISOString().split("T")[0]);
  const [studentsToMark, setStudentsToMark] = useState<Student[]>([]);
  const [attendanceStates, setAttendanceStates] = useState<{ [id: string]: "PRESENT" | "ABSENT" }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isDateAlreadyMarked, setIsDateAlreadyMarked] = useState(false);

  // Edit / Historical Corrector states
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editBatchId, setEditBatchId] = useState("");
  const [editDate, setEditDate] = useState(new Date().toISOString().split("T")[0]);
  const [queriedRecordsToEdit, setQueriedRecordsToEdit] = useState<any[]>([]);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [newCorrectionStatus, setNewCorrectionStatus] = useState<"PRESENT" | "ABSENT">("PRESENT");
  const [correctionRemarks, setCorrectionRemarks] = useState("");

  // States for Mobile CSV/Monthly Report View
  const [reportSubjectId, setReportSubjectId] = useState("");
  const [reportBatchId, setReportBatchId] = useState("");
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthlyRecords, setMonthlyRecords] = useState<any[]>([]);
  const [monthlyStudents, setMonthlyStudents] = useState<Student[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);

  // Calendar and conduct sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(new Date());
  const [triggerQueryEdit, setTriggerQueryEdit] = useState(false);

  // Trigger automatic querying after pre-filling editing fields from calendar
  useEffect(() => {
    if (triggerQueryEdit && editSubjectId && editBatchId && editDate) {
      setTriggerQueryEdit(false);
      queryAttendanceForCorrections();
    }
  }, [triggerQueryEdit, editSubjectId, editBatchId, editDate]);

  // Trigger reloading of core Teacher datasets
  const loadTeacherData = () => {
    setLoading(true);
    setErrorObj(null);
    
    Promise.all([
      fetch("/api/subjects").then(res => res.ok ? res.json() : Promise.reject(new Error("Failed to load official subjects index."))),
      fetch("/api/batches").then(res => res.ok ? res.json() : Promise.reject(new Error("Failed to load class batches."))),
      fetch(`/api/analytics/teacher/${teacherUser.id}`).then(res => res.ok ? res.json() : Promise.reject(new Error("Failed to compile faculty calculations."))),
      fetch("/api/attendance/audit-logs").then(res => res.ok ? res.json() : []),
      fetch("/api/teachers").then(res => res.ok ? res.json() : []),
      fetch("/api/departments").then(res => res.ok ? res.json() : []),
      fetch(`/api/teachers/${teacherUser.id}/active-substitutions`).then(res => res.ok ? res.json() : []),
      fetch(`/api/announcements/teacher/${teacherUser.id}`).then(res => res.ok ? res.json() : []),
      fetch(`/api/teachers/${teacherUser.id}/substitute-subjects`).then(res => res.ok ? res.json() : []),
      fetch(`/api/teachers/${teacherUser.id}/sessions`).then(res => res.ok ? res.json() : [])
    ])
    .then(([allSubjects, allBatches, teacherStats, allAuditTrail, teachersList, departmentsList, activeSubs, annList, subSubjects, sessionsList]) => {
      const myAssignedSubjects = allSubjects.filter((s: Subject) => s.assignedTeacherId === teacherUser.id);
      const mySubjects = [...myAssignedSubjects, ...subSubjects];
      setSubjects(mySubjects);
      setBatches(allBatches);
      setAnalytics(teacherStats);
      setAuditLogs(allAuditTrail);
      
      setTeachers(teachersList);
      setDepartments(departmentsList);
      setActiveSubstitutions(activeSubs);
      setAnnouncementHistory(annList);
      setSessions(sessionsList);

      if (mySubjects.length > 0) {
        setSelectedSubjectId(mySubjects[0].id);
        setEditSubjectId(mySubjects[0].id);
      }
      if (allBatches.length > 0) {
        setSelectedBatchId(allBatches[0].id);
        setEditBatchId(allBatches[0].id);
      }

      setLoading(false);
    })
    .catch((err) => {
      console.error("Failed to load full-stack teacher profile records", err);
      setErrorObj(err.message || "Institutional Central Directory login SSO handshake failed.");
      setLoading(false);
    });
  };

  useEffect(() => {
    loadTeacherData();
  }, [teacherUser.id]);

  // Load latest announcements immediately when moving to the ANNOUNCEMENTS tab
  useEffect(() => {
    if (activeTab === "ANNOUNCEMENTS") {
      fetch(`/api/announcements/teacher/${teacherUser.id}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          setAnnouncementHistory(data);
        })
        .catch(err => {
          console.error("Failed to refresh announcements on tab activation:", err);
        });
    }
  }, [activeTab, teacherUser.id]);

  const handleBroadcastAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTargetId) {
      setAnnStatusMessage("⚠️ Please choose a target batch or department.");
      return;
    }
    if (!annTitle.trim() || !annMessage.trim()) {
      setAnnStatusMessage("⚠️ Title and message content cannot be empty.");
      return;
    }

    setAnnSubmitLoading(true);
    setAnnStatusMessage("");

    fetch("/api/announcements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        teacherId: teacherUser.id,
        type: annType,
        targetId: annTargetId,
        title: annTitle,
        message: annMessage
      })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to broadcast");
      setAnnStatusMessage(`✅ Broadcast successfully sent to students!`);
      setAnnTitle("");
      setAnnMessage("");
      // reload logs
      fetch(`/api/announcements/teacher/${teacherUser.id}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => setAnnouncementHistory(data));
    })
    .catch(err => {
      setAnnStatusMessage(`❌ Error: ${err.message || "Could not broadcast announcement."}`);
    })
    .finally(() => {
      setAnnSubmitLoading(false);
    });
  };

  const handleAssignSubstitute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!substituteTeacherId) {
      setSubstituteStatusMessage("⚠️ Please choose a substitute teacher.");
      return;
    }

    setSubstituteSubmitLoading(true);
    setSubstituteStatusMessage("");

    fetch("/api/teachers/assign-substitute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        teacherId: teacherUser.id,
        substituteId: substituteTeacherId,
        subjectId: substituteSubjectId
      })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update substitute assignment");
      setSubstituteStatusMessage(`✅ substitute lecture protocol initiated successfully! All active students have been notified.`);
      // reload active list and teacher subjects
      loadTeacherData();
    })
    .catch(err => {
      setSubstituteStatusMessage(`❌ Error: ${err.message || "Could not update substitute assignment."}`);
    })
    .finally(() => {
      setSubstituteSubmitLoading(false);
    });
  };

  useEffect(() => {
    if (annType === "BATCH" && batches.length > 0) {
      setAnnTargetId(batches[0].id);
    } else if (annType === "DEPARTMENT" && allDepartments.length > 0) {
      setAnnTargetId(allDepartments[0].id);
    }
  }, [annType, batches, allDepartments]);

  // Auto-select valid batches when the chosen subject changes (Marking)
  useEffect(() => {
    if (selectedSubjectId) {
      const markSubject = subjects.find(s => s.id === selectedSubjectId);
      if (markSubject) {
        const validBatches = batches.filter(b => b.departmentId === markSubject.departmentId && b.semester === markSubject.semester);
        if (validBatches.length > 0 && !validBatches.some(b => b.id === selectedBatchId)) {
          setSelectedBatchId(validBatches[0].id);
        } else if (validBatches.length === 0) {
          setSelectedBatchId("");
        }
      }
    }
  }, [selectedSubjectId, subjects, batches]);

  // Auto-select valid batches when the chosen subject changes (Editing)
  useEffect(() => {
    if (editSubjectId) {
      const correctSubject = subjects.find(s => s.id === editSubjectId);
      if (correctSubject) {
        const validBatches = batches.filter(b => b.departmentId === correctSubject.departmentId && b.semester === correctSubject.semester);
        if (validBatches.length > 0 && !validBatches.some(b => b.id === editBatchId)) {
          setEditBatchId(validBatches[0].id);
        } else if (validBatches.length === 0) {
          setEditBatchId("");
        }
      }
    }
  }, [editSubjectId, subjects, batches]);

  // Load active students for the selected batch on marking screen
  const handleMarkTabSelect = () => {
    setActiveTab("MARK_ATTENDANCE");
    setMobileTab("MARK");
    setMobileMarkStep(1);
    setStatusMessage("");
    if (!selectedBatchId) return;

    fetch("/api/students")
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then((allStudents: Student[]) => {
        const batchStudents = allStudents.filter(s => s.batchId === selectedBatchId).sort((a, b) => (a.rollNumber || "").localeCompare(b.rollNumber || "", undefined, { numeric: true }));
        setStudentsToMark(batchStudents);
        
        const defaultMap: { [id: string]: "PRESENT" | "ABSENT" } = {};
        batchStudents.forEach(s => {
          defaultMap[s.id] = "PRESENT";
        });
        setAttendanceStates(defaultMap);
      })
      .catch(console.error);
  };

  // Switch batch during attendance tracking updates list immediately
  useEffect(() => {
    if ((activeTab === "MARK_ATTENDANCE" || mobileTab === "MARK") && selectedBatchId) {
      fetch("/api/students")
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then((allStudents: Student[]) => {
          const batchStudents = allStudents.filter(s => s.batchId === selectedBatchId).sort((a, b) => (a.rollNumber || "").localeCompare(b.rollNumber || "", undefined, { numeric: true }));
          setStudentsToMark(batchStudents);
          const defaultMap: { [id: string]: "PRESENT" | "ABSENT" } = {};
          batchStudents.forEach(s => {
            defaultMap[s.id] = "PRESENT";
          });
          setAttendanceStates(defaultMap);
        })
        .catch(console.error);
    }
  }, [selectedBatchId, activeTab, mobileTab]);

  // Verify if attendance is already processed for the specified day
  useEffect(() => {
    if ((activeTab === "MARK_ATTENDANCE" || mobileTab === "MARK") && selectedSubjectId && selectedBatchId && markingDate) {
      fetch(`/api/attendance/query?subjectId=${selectedSubjectId}&batchId=${selectedBatchId}&date=${markingDate}`)
        .then(res => res.json())
        .then(records => {
          setIsDateAlreadyMarked(records && records.length > 0);
        })
        .catch(() => setIsDateAlreadyMarked(false));
    }
  }, [selectedSubjectId, selectedBatchId, markingDate, activeTab, mobileTab]);

  // Mark all students present or absent helper
  const toggleAllMarkingStates = (status: "PRESENT" | "ABSENT") => {
    const fresh: { [id: string]: "PRESENT" | "ABSENT" } = {};
    studentsToMark.forEach(s => {
      fresh[s.id] = status;
    });
    setAttendanceStates(fresh);
  };

  // Post Daily attendance array to Express Backend
  const submitDailyAttendance = () => {
    if (!selectedSubjectId || !selectedBatchId || !markingDate) {
      alert("Please provide the subject, batch and date completely.");
      return;
    }
    setIsSubmitting(true);
    setStatusMessage("");

    const recordsArray = Object.keys(attendanceStates).map(studentId => ({
      studentId,
      status: attendanceStates[studentId]
    }));

    fetch("/api/attendance/mark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: selectedSubjectId,
        batchId: selectedBatchId,
        date: markingDate,
        records: recordsArray
      })
    })
    .then((res) => {
      if (!res.ok) throw new Error("Marking issue");
      return res.json();
    })
    .then(() => {
      setIsSubmitting(false);
      setStatusMessage("Attendance finalized and cataloged in Postgres database successfully!");
      setMobileMarkStep(1);
      loadTeacherData();
    })
    .catch((err) => {
      console.error(err);
      setIsSubmitting(false);
      setStatusMessage("Error archiving records. Please try again.");
    });
  };

  // Query records for editing
  const queryAttendanceForCorrections = () => {
    if (!editSubjectId || !editBatchId || !editDate) {
      alert("Ensure subject, batch and target date are supplied.");
      return;
    }
    setIsQuerying(true);

    setQueriedRecordsToEdit([]);
    setEditingRecord(null);

    fetch(`/api/attendance/query?subjectId=${editSubjectId}&batchId=${editBatchId}&date=${editDate}`)
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then((records: AttendanceRecord[]) => {
        fetch("/api/students")
          .then(res2 => res2.ok ? res2.json() : Promise.reject(res2))
          .then((allStudents: Student[]) => {
            const populated = records.map(rec => {
              const student = allStudents.find(s => s.id === rec.studentId);
              return {
                ...rec,
                studentName: student ? student.fullName : "Unknown Student",
                rollNumber: student ? student.rollNumber : "N/A",
                enrollmentNumber: student ? student.enrollmentNumber : "N/A",
                profilePhotoUrl: student ? student.profilePhotoUrl : ""
              };
          }).sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));

            if (populated.length === 0) {
              alert("No attendance records found for this custom query parameters.");
            }
            setQueriedRecordsToEdit(populated);
          })
          .catch(console.error);
      })
      .catch(console.error)
      .finally(() => setIsQuerying(false));
  };

  // Submit corrected value to DB
  const applyCoreStatusCorrection = () => {
    if (!editingRecord) return;
    
    const confirmMsg = `Are you sure you want to change the attendance status for ${editingRecord.studentName} to ${newCorrectionStatus}?\n\nThis modification will be permanently written to the audit trail.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    fetch("/api/attendance/edit", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordId: editingRecord.id,
        newStatus: newCorrectionStatus,
        remarks: correctionRemarks || "Corrected during staff audit hours.",
        modifiedBy: teacherUser.fullName,
      })
    })
    .then(res => res.ok ? res.json() : Promise.reject(res))
    .then(() => {
      alert("Database Row corrected. Logs exported to Attendance Audit Trail instantly.");
      setEditingRecord(null);
      setCorrectionRemarks("");
      queryAttendanceForCorrections();
      loadTeacherData();
    })
    .catch(console.error);
  };

  const generateMonthlyReport = () => {
    if (!reportSubjectId || !reportBatchId || !reportMonth) {
      alert("Please select a subject, batch, and target month to generate the report.");
      return;
    }
    setIsQuerying(true);
    
    Promise.all([
      fetch(`/api/attendance/query?subjectId=${reportSubjectId}&batchId=${reportBatchId}`).then(res => res.ok ? res.json() : Promise.reject(res)),
      fetch("/api/students").then(res => res.ok ? res.json() : Promise.reject(res))
    ]).then(([records, allStudents]) => {
      const batchStudents = allStudents.filter((s: Student) => s.batchId === reportBatchId).sort((a, b) => (a.rollNumber || "").localeCompare(b.rollNumber || "", undefined, { numeric: true }));
      const filteredRecords = records.filter((r: AttendanceRecord) => r.date.startsWith(reportMonth));
      
      if (filteredRecords.length === 0) {
        alert("No attendance records found for the specified month.");
      }

      setMonthlyStudents(batchStudents);
      setMonthlyRecords(filteredRecords);
    })
    .catch(console.error)
    .finally(() => setIsQuerying(false));
  };

  const exportToCSV = () => {
    if (monthlyStudents.length === 0 || monthlyRecords.length === 0) return;

    // Sort to ensure chronological columns in the CSV
    const uniqueDates = Array.from(new Set(monthlyRecords.map(r => r.date))).sort();
    
    // Header Row
    const headers = ["Roll No.", "Student Name", ...uniqueDates, "Attendance %"];
    
    // Rows list mapping students
    const rows = monthlyStudents.map(stu => {
      const stuRecords = monthlyRecords.filter(r => r.studentId === stu.id);
      const presents = stuRecords.filter(r => r.status === "PRESENT").length;
      const total = stuRecords.filter(r => r.status === "PRESENT" || r.status === "ABSENT").length;
      const pct = total > 0 ? Math.round((presents / total) * 100) : 100;

      const dateStatuses = uniqueDates.map(d => {
        const rec = stuRecords.find(r => r.date === d);
        if (rec?.status === "PRESENT") return "P";
        if (rec?.status === "ABSENT") return "A";
        return "-";
      });

      return [
        `"${(stu.rollNumber || "").replace(/"/g, '""')}"`,
        `"${stu.fullName.replace(/"/g, '""')}"`,
        ...dateStatuses,
        `${pct}%`
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const activeSub = subjects.find(s => s.id === reportSubjectId);
    const activeBat = batches.find(b => b.id === reportBatchId);
    
    const fileName = `Attendance_Report_${(activeSub?.code || "Subject")}_${(activeBat?.name || "Batch").replace(/\s+/g, "_")}_${reportMonth}.csv`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Pre-filter valid batches for the UI dropdowns
  const markSubject = subjects.find(s => s.id === selectedSubjectId);
  const validMarkBatches = markSubject ? batches.filter(b => b.departmentId === markSubject.departmentId && b.semester === markSubject.semester) : batches;

  const correctSubject = subjects.find(s => s.id === editSubjectId);
  const validCorrectBatches = correctSubject ? batches.filter(b => b.departmentId === correctSubject.departmentId && b.semester === correctSubject.semester) : batches;

  const reportSubject = subjects.find(s => s.id === reportSubjectId);
  const validReportBatches = reportSubject ? batches.filter(b => b.departmentId === reportSubject.departmentId && b.semester === reportSubject.semester) : batches;

  if (errorObj) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs text-center animate-fade-in select-none">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Unable to Load Faculty Dashboard</h3>
        <p className="text-slate-500 text-xs mt-1.5 max-w-sm leading-relaxed">{errorObj}</p>
        <button
          onClick={loadTeacherData}
          className="mt-4.5 px-4.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-800 transition-all cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (loading || !analytics || analytics.classesConducted === undefined) {
    return (
      <div className="w-full space-y-6 select-none bg-slate-50/50 p-5 rounded-3xl animate-fade-in">
        {/* Topbar/Title Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-2">
            <div className="h-7 w-56 bg-slate-200/80 rounded-lg shimmer"></div>
            <div className="h-4 w-72 bg-slate-100/50 rounded-md shimmer"></div>
          </div>
          <div className="h-9 w-32 bg-slate-200/80 rounded-xl shimmer"></div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-slate-100 p-5 rounded-2xl space-y-3 shadow-xs">
              <div className="flex justify-between items-center">
                <div className="h-3 w-16 bg-slate-100/70 rounded-md shimmer"></div>
                <div className="w-6 h-6 rounded-lg bg-slate-200/50 shimmer"></div>
              </div>
              <div className="h-6 w-12 bg-slate-200/80 rounded-lg shimmer"></div>
              <div className="h-3 w-20 bg-slate-100/60 rounded-md shimmer"></div>
            </div>
          ))}
        </div>

        {/* Major Columns Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Action Side Block */}
          <div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="h-4 w-48 bg-slate-200/80 rounded-lg shimmer"></div>
              <div className="h-3.5 w-16 bg-slate-100/65 rounded-md shimmer"></div>
            </div>
            
            {/* Table or Card Row place-holders */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-slate-100 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4.5 w-36 bg-slate-200/75 rounded-md shimmer"></div>
                  <div className="h-4 w-12 bg-slate-200/65 rounded-md shimmer"></div>
                </div>
                <div className="h-3 w-full bg-slate-100/60 rounded-sm shimmer"></div>
                <div className="h-3 w-3/4 bg-slate-100/60 rounded-sm shimmer"></div>
              </div>
            ))}
          </div>

          {/* Right column: Announcements and active updates */}
          <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="h-4.5 w-32 bg-slate-200/80 rounded-lg shimmer"></div>
            
            {[1, 2].map((i) => (
              <div key={i} className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-2">
                <div className="h-3.5 w-24 bg-slate-200/75 rounded-md shimmer"></div>
                <div className="h-3 w-full bg-slate-100/60 rounded-sm shimmer"></div>
                <div className="h-3 w-2/3 bg-slate-100/60 rounded-sm shimmer"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MOBILE VIEW RENDER BLOCK (FOR FLUTTER APK)
  // ==========================================
  if (isMobileView) {
    return (
      <div className="flex flex-col h-full bg-slate-50 relative select-none">
        
        {/* Mobile Scroll Area */}
        <div className="flex-1 pb-28 space-y-4 overflow-y-auto w-full">

          {/* MOBILE TAB 1: DASHBOARD OVERVIEW */}
          {mobileTab === "OVERVIEW" && (
            <div className="space-y-4 animate-fade-in px-4">
              {/* Grid-based Segmented Control Panel to ensure all features are fully accessible and visible */}
              <div className="grid grid-cols-5 gap-1.5 pb-2 -mx-2 px-2 shrink-0 border-b border-slate-100 bg-white sticky top-0 z-30 py-3 shadow-xs">
                {[
                  { id: "STATS", label: "Stats", icon: Award },
                  { id: "CHARTS", label: "Charts", icon: BarChart2 },
                  { id: "CALENDAR", label: "Calendar", icon: Calendar },
                  { id: "SUBSTITUTE", label: "Substitute", icon: Users },
                  { id: "ANNOUNCEMENTS", label: "Broadcasts", icon: MessageSquare }
                ].map(sub => {
                  const Icon = sub.icon;
                  const isSelected = mobileOverviewSubTab === sub.id;
                  return (
                    <button
                      id={`tab-btn-${sub.id.toLowerCase()}`}
                      key={sub.id}
                      onClick={() => setMobileOverviewSubTab(sub.id as any)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl text-[9px] font-extrabold tracking-tight transition-all border outline-none ${
                        isSelected 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" 
                          : "bg-slate-50/80 text-slate-500 border-slate-100 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className={`w-4 h-4 mb-1 transition-transform ${isSelected ? "scale-110" : "text-slate-400"}`} />
                      <span className="truncate w-full text-center leading-none">{sub.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* STATS SUB-TAB */}
              {mobileOverviewSubTab === "STATS" && (
                <div className="space-y-4 animate-fade-in">
                  {/* Overlapping grid indexes */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-white border border-slate-150 p-3.5 rounded-xl shadow-2xs text-left">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Conducted</span>
                      <span className="text-xl font-extrabold text-slate-800 font-mono block mt-1">{analytics?.classesConducted || 0} sessions</span>
                    </div>
                    <div className="bg-white border border-slate-150 p-3.5 rounded-xl shadow-2xs text-left">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-emerald-600 block">Class Avg Ratio</span>
                      <span className="text-xl font-extrabold text-emerald-700 font-mono block mt-1">{analytics?.averageAttendance || 0}%</span>
                    </div>
                  </div>

                  {/* Defaulter Counter Banner */}
                  <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <UserX className="w-5 h-5 text-rose-600" />
                      <div className="text-left">
                        <h5 className="font-bold text-xs text-rose-850">Defaulters flagged</h5>
                        <p className="text-[10px] text-slate-500 leading-none mt-0.5">Students below the mandatory 80%</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-rose-600 text-white font-extrabold rounded-lg text-xs font-mono">
                      {analytics?.defaulterCount || 0} Flagged
                    </span>
                  </div>

                  {/* Lecture list */}
                  <div className="bg-white border border-slate-155 rounded-xl p-3.5 space-y-2.5 shadow-2xs text-left animate-fade-in">
                    <h5 className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-500 mb-1">Lectures Directory ({subjects.length})</h5>
                    {subjects.map(s => (
                      <div key={s.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded font-extrabold">
                            {s.code}
                          </span>
                          <strong className="text-slate-800 text-xs truncate max-w-[130px]">{s.name}</strong>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">Semester {s.semester}</span>
                      </div>
                    ))}
                  </div>

                  {/* Fast interactive trigger to take attendance */}
                  <button
                    onClick={() => {
                      setMobileTab("MARK");
                      setMobileMarkStep(1);
                      setStatusMessage("");
                      fetch("/api/students")
                        .then(res => res.ok ? res.json() : Promise.reject(res))
                        .then((allStudents: Student[]) => {
                          const batchStudents = allStudents.filter(s => s.batchId === selectedBatchId).sort((a, b) => (a.rollNumber || "").localeCompare(b.rollNumber || "", undefined, { numeric: true }));
                          setStudentsToMark(batchStudents);
                          const defaultMap: { [id: string]: "PRESENT" | "ABSENT" } = {};
                          batchStudents.forEach(s => {
                            defaultMap[s.id] = "PRESENT";
                          });
                          setAttendanceStates(defaultMap);
                        })
                        .catch(console.error);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-slate-905 text-white rounded-xl text-xs font-extrabold shadow-sm select-none border-none cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Take Daily Attendance now</span>
                  </button>
                </div>
              )}

              {/* CHARTS SUB-TAB */}
              {mobileOverviewSubTab === "CHARTS" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-2xs text-left animate-fade-in">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">Subject Performance (%)</h4>
                    <div className="h-[210px]">
                      {!analytics || analytics.subjectSummaries.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs">No subjects mapped in memory.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.subjectSummaries} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="subjectCode" stroke="#94a3b8" fontSize={10} tickLine={false} />
                            <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", color: "white", fontSize: "11px" }} />
                            <Bar dataKey="averageRatio" name="Average %" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={25} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CALENDAR SUB-TAB */}
              {mobileOverviewSubTab === "CALENDAR" && (
                <div className="space-y-4 animate-fade-in">
                  {/* Calendar Widget */}
                  <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-2xs text-left">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Schedule Calendar</span>
                      </h4>
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1))}
                          className="p-1 rounded bg-slate-50 border border-slate-100"
                        >
                          <ChevronLeft className="w-3 h-3 text-slate-600" />
                        </button>
                        <span className="text-[10px] font-bold text-slate-700 w-20 text-center truncate">
                          {currentCalendarMonth.toLocaleString('default', { month: 'short', year: 'numeric' })}
                        </span>
                        <button 
                          onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1))}
                          className="p-1 rounded bg-slate-50 border border-slate-100"
                        >
                          <ChevronRight className="w-3 h-3 text-slate-600" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-slate-400 uppercase mb-1 font-mono">
                      <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const year = currentCalendarMonth.getFullYear();
                        const month = currentCalendarMonth.getMonth();
                        const firstDay = new Date(year, month, 1);
                        const startDayOfWeek = firstDay.getDay();
                        const totalDays = new Date(year, month + 1, 0).getDate();
                        const cells = [];
                        for (let i = 0; i < startDayOfWeek; i++) {
                          cells.push(<div key={`empty-${i}`} className="h-7 shrink-0"></div>);
                        }
                        for (let d = 1; d <= totalDays; d++) {
                          const dString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                          const daySessions = sessions.filter(s => s.date === dString);
                          const hasLects = daySessions.length > 0;
                          const isSelected = selectedCalendarDate === dString;
                          cells.push(
                            <button
                              key={`day-${d}`}
                              type="button"
                              onClick={() => setSelectedCalendarDate(dString)}
                              className={`h-7 w-full rounded-md text-[11px] font-bold flex flex-col items-center justify-center relative transition-all border ${
                                isSelected 
                                  ? "bg-slate-900 border-slate-900 text-white font-black"
                                  : hasLects
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
                                    : "text-slate-600 border-transparent hover:bg-slate-50"
                              }`}
                            >
                              <span>{d}</span>
                              {hasLects && !isSelected && (
                                <span className="absolute bottom-1 w-1 h-1 bg-indigo-500 rounded-full"></span>
                              )}
                            </button>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                  </div>

                  {/* Sessions Detailed Section */}
                  <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-2xs space-y-3 text-left">
                    <h4 className="text-xs font-bold text-slate-800">
                      Lectures: {new Date(selectedCalendarDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                    </h4>

                    <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                      {(() => {
                        const daySessions = sessions.filter(s => s.date === selectedCalendarDate);
                        if (daySessions.length === 0) {
                          return (
                            <div className="text-center py-6 text-slate-450 text-xs font-semibold bg-slate-25 border border-dashed border-slate-150 rounded-xl space-y-1">
                              <p>No active sessions detected.</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setMarkingDate(selectedCalendarDate);
                                  setMobileTab("MARK");
                                  setMobileMarkStep(1);
                                  setStatusMessage("");
                                }}
                                className="text-[10px] font-bold text-indigo-650 bg-white border border-indigo-150 hover:bg-indigo-50/50 px-2.5 py-1 rounded-lg mt-1 inline-block cursor-pointer"
                              >
                                Mark Attendance for this Date
                              </button>
                            </div>
                          );
                        }
                        return daySessions.map((sess, idx) => (
                          <div key={`${sess.subjectId}-${sess.batchId}-${idx}`} className="p-2.5 bg-slate-25 border border-slate-100 rounded-lg flex items-center justify-between text-xs transition-colors hover:border-indigo-100">
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[8px] font-black text-indigo-750 bg-indigo-50 border border-indigo-100 px-1 py-0.2 rounded font-mono">
                                  {sess.subjectCode}
                                </span>
                                <span className="text-[9px] text-slate-450 font-bold truncate max-w-[125px]">
                                  {sess.batchName}
                                </span>
                              </div>
                              <h5 className="font-bold text-slate-700 truncate text-[11px] uppercase mt-0.5">{sess.subjectName}</h5>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditSubjectId(sess.subjectId);
                                setEditBatchId(sess.batchId);
                                setEditDate(sess.date);
                                setMobileTab("CORRECT");
                                setTriggerQueryEdit(true);
                              }}
                              className="bg-slate-900 hover:bg-slate-950 text-white text-[9px] font-extrabold px-2.5 py-1.5 rounded-lg flex items-center gap-0.5 shrink-0 border-none cursor-pointer"
                            >
                              <span>Edit Logs</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* SUBSTITUTE SUB-TAB */}
              {mobileOverviewSubTab === "SUBSTITUTE" && (
                <div className="space-y-4 animate-fade-in text-left">
                  <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-2xs space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Active Delegated Substitutes</h4>
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 animate-fade-in">
                      {activeSubstitutions.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs font-medium bg-slate-25 border border-dashed border-slate-150 rounded-xl">
                          No active substitutes configured.
                        </div>
                      ) : (
                        activeSubstitutions.map(sub => (
                          <div key={sub.id} className="p-2.5 bg-indigo-25/50 border border-indigo-100/50 rounded-xl flex items-center justify-between text-[11px]">
                            <div>
                              <strong className="text-slate-800 font-extrabold">{sub.substitute_name}</strong>
                              <p className="text-[9px] text-slate-500 mt-0.5">Subject: {sub.subject_code}</p>
                            </div>
                            <span className="text-[8px] font-extrabold text-indigo-700 bg-white border border-indigo-100 px-1.5 py-0.5 rounded-full uppercase shrink-0">
                              Active State
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-2xs space-y-3 animate-fade-in">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Schedule Substitution Log</h4>
                    <form onSubmit={handleAssignSubstitute} className="space-y-2.5">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Target Subject</label>
                        <select
                          value={substituteSubjectId}
                          onChange={(e) => setSubstituteSubjectId(e.target.value)}
                          className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-25/50 text-slate-800 focus:outline bg-white text-slate-700"
                        >
                          <option value="all">All Assigned Subjects</option>
                          {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Select Delegate Faculty</label>
                        <select
                          value={substituteTeacherId}
                          onChange={(e) => setSubstituteTeacherId(e.target.value)}
                          className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-25/50 text-slate-800 focus:outline bg-white text-slate-700"
                        >
                          <option value="">-- Choose Substitute Faculty --</option>
                          <option value="none">❌ Reset / Remove active substitutions</option>
                          {allTeachers
                            .filter(t => t.id !== teacherUser.id)
                            .map(t => (
                              <option key={t.id} value={t.id}>{t.fullName} ({t.employeeId})</option>
                            ))}
                        </select>
                      </div>

                      {substituteStatusMessage && (
                        <div className={`p-2 rounded text-[10px] font-medium border ${
                          substituteStatusMessage.includes("✅")
                            ? "bg-emerald-25 border-emerald-100 text-emerald-800"
                            : "bg-amber-25 border-amber-100 text-amber-800"
                        }`}>
                          {substituteStatusMessage}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={substituteSubmitLoading}
                        className="w-full flex items-center justify-center gap-1 py-2 bg-slate-900 hover:bg-slate-950 text-white font-extrabold rounded-xl text-xs border-none cursor-pointer disabled:opacity-50"
                      >
                        <span>{substituteSubmitLoading ? "Updating overrides..." : "Deploy Active Substitution"}</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* ANNOUNCEMENTS SUB-TAB */}
              {mobileOverviewSubTab === "ANNOUNCEMENTS" && (
                <div className="space-y-4 animate-fade-in text-left">
                  {/* Form */}
                  <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-2xs space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Compose & Broadcast Alert</h4>
                    <form onSubmit={handleBroadcastAnnouncement} className="space-y-2.5">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Message Target Audience</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setAnnType("BATCH")}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 ${
                              annType === "BATCH"
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                : "bg-slate-25/50 border-slate-100 text-slate-600"
                            }`}
                          >
                            <span>Specific Batch</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnnType("DEPARTMENT")}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 ${
                              annType === "DEPARTMENT"
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                : "bg-slate-25/50 border-slate-100 text-slate-600"
                            }`}
                          >
                            <span>Entire Dept</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Choose Target ID</label>
                        <select
                          value={annTargetId}
                          onChange={(e) => setAnnTargetId(e.target.value)}
                          className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-25/50 text-slate-800 focus:outline bg-white text-slate-700"
                        >
                          <option value="">-- Choose Target --</option>
                          {annType === "BATCH" ? (
                            batches.map(b => (
                              <option key={b.id} value={b.id}>{b.name} (Sem {b.semester})</option>
                            ))
                          ) : (
                            allDepartments.map(d => (
                              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                            ))
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Headline Heading</label>
                        <input
                          type="text"
                          placeholder="e.g. Venue Shifted"
                          value={annTitle}
                          onChange={(e) => setAnnTitle(e.target.value)}
                          className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-25/50 text-slate-850"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Alert Detailed details</label>
                        <textarea
                          rows={3}
                          placeholder="Please enter broadcast contents explicitly..."
                          value={annMessage}
                          onChange={(e) => setAnnMessage(e.target.value)}
                          className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-25/50 text-slate-850"
                        />
                      </div>

                      {annStatusMessage && (
                        <div className={`p-2 rounded text-[10px] font-medium border ${
                          annStatusMessage.includes("✅")
                            ? "bg-emerald-25 border-emerald-100 text-emerald-800"
                            : "bg-amber-25 border-amber-100 text-amber-800"
                        }`}>
                          {annStatusMessage}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={annSubmitLoading}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-extrabold rounded-xl text-xs border-none cursor-pointer disabled:opacity-50"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{annSubmitLoading ? "Broadcasting..." : "Send Out Broadcast Notification"}</span>
                      </button>
                    </form>
                  </div>

                  {/* History List */}
                  <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-2xs space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Past Broadcast history</h4>
                    <div className="divide-y divide-slate-100 max-h-[170px] overflow-y-auto pr-1 animate-fade-in">
                      {announcementHistory.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs font-semibold">No previous broadcasts log.</div>
                      ) : (
                        announcementHistory.map(ann => {
                          const targetName = ann.type === "BATCH"
                            ? batches.find(b => b.id === ann.target_id)?.name || ann.target_id
                            : allDepartments.find(d => d.id === ann.target_id)?.name || ann.target_id;
                          return (
                            <div key={ann.id} className="py-2.5 space-y-1 first:pt-0 last:pb-0 text-left">
                              <div className="flex justify-between text-[8px] font-mono font-bold text-slate-400 pb-0.5">
                                <span className="uppercase text-indigo-650 bg-indigo-25 px-1 py-0.2 rounded border border-indigo-50/50">{ann.type}: {targetName}</span>
                                <span className="text-slate-400">{new Date(ann.created_at).toLocaleDateString()}</span>
                              </div>
                              <h5 className="font-bold text-xs text-slate-800 leading-tight pt-0.5">{ann.title}</h5>
                              <p className="text-[11px] text-slate-500 font-sans leading-relaxed pt-0.5">{ann.message}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MOBILE TAB 2: TAKE ATTENDANCE */}
          {mobileTab === "MARK" && (
            <div className="space-y-4 animate-fade-in">
              {mobileMarkStep === 1 ? (
                <>
                  <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-2xs space-y-3">
                    <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">Class Session Specifications</h5>
                    
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Subject</label>
                        <select
                          value={selectedSubjectId}
                          onChange={(e) => setSelectedSubjectId(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-205 rounded-lg text-xs font-semibold focus:outline-hidden bg-white text-slate-700"
                        >
                          {subjects.map(s => (
                            <option key={s.id} value={s.id}>[{s.code}] {s.name} (Sem {s.semester})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Batch</label>
                        <select
                          value={selectedBatchId}
                          onChange={(e) => setSelectedBatchId(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-205 rounded-lg text-xs font-semibold focus:outline-hidden bg-white text-slate-700"
                        >
                          {validMarkBatches.length > 0 ? validMarkBatches.map(b => (
                            <option key={b.id} value={b.id}>{b.name} (Sem {b.semester})</option>
                          )) : (
                            <option value="" disabled>-- No Valid Batches --</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Date</label>
                        <input
                          type="date"
                          value={markingDate}
                          onChange={(e) => setMarkingDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-205 rounded-lg text-xs font-semibold font-mono focus:outline-hidden bg-white text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!selectedSubjectId || !selectedBatchId || !markingDate) {
                        alert("Please select subject, batch and date.");
                        return;
                      }
                      setMobileMarkStep(2);
                    }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm"
                  >
                    Proceed to Mark Attendance
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between bg-white border border-slate-150 p-3 rounded-xl shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-mono font-bold">
                      {markingDate} • {validMarkBatches.find(b => b.id === selectedBatchId)?.name || "Batch"}
                    </div>
                    <button 
                      onClick={() => setMobileMarkStep(1)}
                      className="text-[9px] font-bold text-indigo-600 border border-indigo-150 bg-indigo-50 px-2 py-1 rounded"
                    >
                      Change Details
                    </button>
                  </div>
                  
                  {/* Bulk operations with clean touch paddings */}
                  <div className="p-2.5 bg-slate-100 border border-slate-150 rounded-xl flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Bulk Toggles:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleAllMarkingStates("PRESENT")}
                        className="px-2.5 py-1 text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-150 rounded font-bold"
                      >
                        All Present
                      </button>
                      <button
                        onClick={() => toggleAllMarkingStates("ABSENT")}
                        className="px-2.5 py-1 text-[9px] bg-rose-50 text-rose-700 border border-rose-150 rounded font-bold"
                      >
                        All Absent
                      </button>
                    </div>
                  </div>

                  {/* Student Touch Ticker cards */}
                  <div className="bg-white border border-slate-150 rounded-xl divide-y divide-slate-100 shadow-2xs overflow-hidden pb-16">
                    {studentsToMark.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs">No active students found mapped to batch.</div>
                    ) : (
                      studentsToMark.map(stu => {
                        const isPresent = attendanceStates[stu.id] === "PRESENT";
                        return (
                          <div key={stu.id} className="p-3 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {stu.profilePhotoUrl ? (
                                  <img src={stu.profilePhotoUrl} alt={stu.fullName} className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                                ) : (
                                  <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                                    {stu.fullName.charAt(0)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h6 className="font-bold text-xs text-slate-800 truncate">{stu.fullName}</h6>
                                  <p className="text-[9px] font-mono text-slate-400 mt-0.5">{stu.rollNumber} • {stu.enrollmentNumber}</p>
                                </div>
                              </div>
                            
                            {/* Two huge tactile custom choice toggler buttons */}
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => setAttendanceStates(prev => ({ ...prev, [stu.id]: "PRESENT" }))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold font-mono transition-all ${
                                  isPresent ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-400 border border-slate-200"
                                }`}
                              >
                                P
                              </button>
                              <button
                                onClick={() => setAttendanceStates(prev => ({ ...prev, [stu.id]: "ABSENT" }))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold font-mono transition-all ${
                                  !isPresent ? "bg-rose-600 text-white" : "bg-slate-50 text-slate-400 border border-slate-200"
                                }`}
                              >
                                A
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Status or submit at the footer */}
                  <div className="space-y-2">
                    {isDateAlreadyMarked && (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-lg text-center flex flex-col items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Attendance already marked for this date. Go to Correct tab to modify.</span>
                      </div>
                    )}
                    {statusMessage && (
                      <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg text-center">
                        {statusMessage}
                      </div>
                    )}
                    <button
                      onClick={submitDailyAttendance}
                      disabled={isSubmitting || studentsToMark.length === 0 || isDateAlreadyMarked}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all select-none disabled:opacity-50"
                    >
                      {isSubmitting ? "Writing to PostgreSQL Tables..." : isDateAlreadyMarked ? "Already Marked" : "Save Session Attendance Sheet"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* MOBILE TAB 3: CORRECTION LOG ENTRY */}
          {mobileTab === "CORRECT" && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white border border-slate-150 p-4 rounded-xl space-y-3 shadow-2xs">
                <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">Identify Target Records</h5>
                
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Subject</label>
                    <select
                      value={editSubjectId}
                      onChange={(e) => setEditSubjectId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-205 rounded-lg text-xs font-semibold focus:outline-hidden bg-white text-slate-700"
                    >
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>[{s.code}] {s.name} (Sem {s.semester})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Batch</label>
                    <select
                      value={editBatchId}
                      onChange={(e) => setEditBatchId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-205 rounded-lg text-xs font-semibold focus:outline-hidden bg-white text-slate-700"
                    >
                      {validCorrectBatches.length > 0 ? validCorrectBatches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} (Sem {b.semester})</option>
                      )) : (
                        <option value="" disabled>-- No Valid Batches --</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date of Session</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-205 rounded-lg text-xs font-semibold font-mono focus:outline-hidden bg-white text-slate-700"
                    />
                  </div>
                </div>

                <button
                  onClick={queryAttendanceForCorrections}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all"
                >
                  Query Logs Database
                </button>
              </div>

              {/* Queried results to select and edit */}
              {isQuerying ? (
                <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-150 rounded-xl shadow-2xs">
                  <div className="animate-spin rounded-full h-6 w-6 border-4 border-indigo-600 border-t-transparent mb-3"></div>
                  <p className="text-slate-400 font-medium text-xs">Querying Database...</p>
                </div>
              ) : queriedRecordsToEdit.length > 0 && (
                <div className="bg-white border border-slate-150 rounded-xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
                  {queriedRecordsToEdit.map(rec => (
                    <div key={rec.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        {rec.profilePhotoUrl ? (
                          <img src={rec.profilePhotoUrl} className="w-7 h-7 rounded-md object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-7 h-7 bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">
                            {rec.studentName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h6 className="font-extrabold text-slate-800">{rec.studentName}</h6>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-mono text-slate-450">{rec.rollNumber}</span>
                            <span className={`px-1.5 py-0.5 rounded font-mono text-[8px] font-bold ${rec.status === "PRESENT" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"}`}>{rec.status}</span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          setEditingRecord(rec);
                          setNewCorrectionStatus(rec.status);
                          setCorrectionRemarks("");
                        }}
                        className="px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-150 rounded font-bold text-[10px]"
                      >
                        Correct
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Form Modal Overlay if editing (Mobile) */}
              {editingRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-fade-in relative">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h6 className="font-extrabold text-sm uppercase text-slate-800 flex items-center gap-2 tracking-wider">
                        <Edit3 className="w-4.5 h-4.5 text-indigo-600" />
                        Rectification Module
                      </h6>
                      <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-2 font-sans">
                      <div className="flex justify-between"><strong>Target:</strong> <span className="font-semibold text-slate-700">{editingRecord.studentName}</span></div>
                      <div className="flex justify-between"><strong>Roll No:</strong> <span className="font-mono text-slate-700">{editingRecord.rollNumber}</span></div>
                      <div className="flex justify-between"><strong>Logged Status:</strong> <span className={`font-bold font-mono ${editingRecord.status === 'PRESENT' ? 'text-emerald-600' : 'text-rose-600'}`}>{editingRecord.status}</span></div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Revised Status</label>
                        <select
                          value={newCorrectionStatus}
                          onChange={(e) => setNewCorrectionStatus(e.target.value as "PRESENT" | "ABSENT")}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-slate-700"
                        >
                          <option value="PRESENT">PRESENT</option>
                          <option value="ABSENT">ABSENT</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Staff Audit Remarks</label>
                        <input
                          type="text"
                          value={correctionRemarks}
                          onChange={(e) => setCorrectionRemarks(e.target.value)}
                          placeholder="Correction reason..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-medium focus:outline-hidden focus:border-indigo-500 text-slate-700"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        onClick={() => setEditingRecord(null)}
                        className="w-1/3 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={applyCoreStatusCorrection}
                        className="w-2/3 flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white text-xs font-extrabold rounded-xl shadow-md hover:bg-slate-800 transition-colors"
                      >
                        <span>Commit Entry</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MOBILE TAB 4: AUDIT HISTORY */}
          {mobileTab === "AUDIT" && (
            <div className="space-y-3 animate-fade-in">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Revision Audit Trail ({auditLogs.length})</h4>
              
              <div className="space-y-2">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-10 bg-white border border-slate-150 rounded-xl text-slate-400 text-xs">No entries registered.</div>
                ) : (
                  auditLogs.map(log => (
                    <div key={log.id} className="bg-white border border-slate-150 rounded-xl p-3 shadow-2xs space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] text-slate-450 border-b border-slate-50 pb-1 font-mono">
                        <span>{new Date(log.modifiedDate).toLocaleDateString()} {new Date(log.modifiedDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span>By: {log.modifiedBy.split(" ")[0]}</span>
                      </div>
                      
                      <div className="text-xs font-bold text-slate-800">{log.studentName || "Record Revise"}</div>
                      <p className="text-[10px] text-slate-500 font-sans leading-relaxed mt-1">Target Date: <strong className="text-slate-700">{(log as any).date}</strong> • Subject: <strong className="text-slate-700">{(log as any).subjectName}</strong></p>
                      <p className="text-[10px] text-slate-500 font-sans leading-relaxed">Remarks: <i className="text-slate-600">{log.remarks}</i></p>
                      
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-600 uppercase">
                          {log.previousStatus}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-600 uppercase">
                          {log.newStatus}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* MOBILE TAB 5: MONTHLY REPORT (CSV-LIKE) */}
          {mobileTab === "MONTHLY" && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-transparent">Monthly CSV-Like Report</h5>
                  {monthlyStudents.length > 0 && (
                    <button
                      onClick={exportToCSV}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all select-none cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Subject</label>
                    <select
                      value={reportSubjectId}
                      onChange={(e) => setReportSubjectId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-205 rounded-lg text-xs font-semibold focus:outline-hidden bg-white text-slate-700"
                    >
                      <option value="">-- Select Subject --</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Batch</label>
                    <select
                      value={reportBatchId}
                      onChange={(e) => setReportBatchId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-205 rounded-lg text-xs font-semibold focus:outline-hidden bg-white text-slate-700"
                    >
                      <option value="">-- Select Batch --</option>
                      {validReportBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Month</label>
                    <input
                      type="month"
                      value={reportMonth}
                      onChange={(e) => setReportMonth(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-205 rounded-lg text-xs font-semibold font-mono focus:outline-hidden bg-white text-slate-700"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setMonthlyStudents([]); setMonthlyRecords([]); }}
                      className="w-1/3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition-all"
                    >
                      Clear
                    </button>
                    <button 
                      onClick={generateMonthlyReport}
                      className="w-2/3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all"
                    >
                      Generate Report Grid
                    </button>
                  </div>
                </div>
              </div>
              
              {isQuerying ? (
                <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-150 rounded-xl shadow-2xs">
                  <div className="animate-spin rounded-full h-6 w-6 border-4 border-indigo-600 border-t-transparent mb-3"></div>
                  <p className="text-slate-400 font-medium text-xs">Querying Database...</p>
                </div>
              ) : monthlyStudents.length > 0 && (
                <div className="bg-white border border-slate-150 rounded-xl overflow-x-auto shadow-2xs p-2">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                        <th className="p-2 border-r border-slate-100 sticky left-0 bg-slate-50 z-10 shadow-[1px_0_0_0_#f1f5f9]">Student</th>
                        {Array.from(new Set(monthlyRecords.map(r => r.date))).sort().map((d: any) => (
                          <th key={d} className="p-2 border-r border-slate-100 text-center">{(d as string).slice(-2)}</th>
                        ))}
                        <th className="p-2 text-center">%</th>
                      </tr>
                    </thead>
                    <tbody className="text-[10px]">
                      {monthlyStudents.map(stu => {
                        const stuRecords = monthlyRecords.filter(r => r.studentId === stu.id);
                        const presents = stuRecords.filter(r => r.status === "PRESENT").length;
                        const total = stuRecords.filter(r => r.status === "PRESENT" || r.status === "ABSENT").length;
                        const pct = total > 0 ? Math.round((presents / total) * 100) : 100;
                        return (
                          <tr key={stu.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="p-2 border-r border-slate-100 sticky left-0 bg-white font-semibold text-slate-700 z-10 truncate max-w-[100px] shadow-[1px_0_0_0_#f1f5f9]" title={stu.fullName}>
                              {stu.fullName}
                            </td>
                            {Array.from(new Set(monthlyRecords.map(r => r.date))).sort().map(d => {
                              const rec = stuRecords.find(r => r.date === d);
                              return (
                                <td key={d} className="p-2 border-r border-slate-100 text-center font-bold">
                                  {rec?.status === "PRESENT" ? (
                                    <span className="text-emerald-500">P</span>
                                  ) : rec?.status === "ABSENT" ? (
                                    <span className="text-rose-500">A</span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className={`p-2 text-center font-bold ${pct >= 80 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {pct}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Floating bottom menu for teacher */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl flex items-center justify-around z-50 select-none px-2 sm:px-6">
          <button 
            onClick={() => setMobileTab("OVERVIEW")}
            className={`flex flex-col items-center justify-center w-12 sm:w-14 h-14 rounded-xl transition-all ${
              mobileTab === "OVERVIEW" ? "text-amber-600 font-bold scale-105" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Home className="w-4.5 h-4.5" />
            <span className="text-[8px] sm:text-[9px] mt-1 tracking-tight font-sans">Overview</span>
          </button>
          
          <button 
            onClick={() => {
              setMobileTab("MARK");
              setMobileMarkStep(1);
              setStatusMessage("");
              fetch("/api/students")
                .then(res => res.ok ? res.json() : Promise.reject(res))
                .then((allStudents: Student[]) => {
                  const batchStudents = allStudents.filter(s => s.batchId === selectedBatchId).sort((a, b) => (a.rollNumber || "").localeCompare(b.rollNumber || "", undefined, { numeric: true }));
                  setStudentsToMark(batchStudents);
                  const defaultMap: { [id: string]: "PRESENT" | "ABSENT" } = {};
                  batchStudents.forEach(s => {
                    defaultMap[s.id] = "PRESENT";
                  });
                  setAttendanceStates(defaultMap);
                })
                .catch(console.error);
            }}
            className={`flex flex-col items-center justify-center w-12 sm:w-14 h-14 rounded-xl transition-all ${
              mobileTab === "MARK" ? "text-amber-600 font-bold scale-105" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <CheckSquare className="w-4.5 h-4.5" />
            <span className="text-[8px] sm:text-[9px] mt-1 tracking-tight font-sans">Mark</span>
          </button>

          <button 
            onClick={() => {
              setMobileTab("CORRECT");
              setEditingRecord(null);
            }}
            className={`flex flex-col items-center justify-center w-12 sm:w-14 h-14 rounded-xl transition-all ${
              mobileTab === "CORRECT" ? "text-amber-600 font-bold scale-105" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Edit3 className="w-4.5 h-4.5" />
            <span className="text-[8px] sm:text-[9px] mt-1 tracking-tight font-sans">Correct</span>
          </button>

          <button 
            onClick={() => setMobileTab("AUDIT")}
            className={`flex flex-col items-center justify-center w-12 sm:w-14 h-14 rounded-xl transition-all ${
              mobileTab === "AUDIT" ? "text-amber-600 font-bold scale-105" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <History className="w-4.5 h-4.5" />
            <span className="text-[8px] sm:text-[9px] mt-1 tracking-tight font-sans">Audits</span>
          </button>

          <button 
            onClick={() => setMobileTab("MONTHLY")}
            className={`flex flex-col items-center justify-center w-12 sm:w-14 h-14 rounded-xl transition-all ${
              mobileTab === "MONTHLY" ? "text-amber-600 font-bold scale-105" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <FileText className="w-4.5 h-4.5" />
            <span className="text-[8px] sm:text-[9px] mt-1 tracking-tight font-sans">Monthly</span>
          </button>
        </div>

        {/* Mobile Modal for Correcting Records - Placed at root to ensure centering */}
        {editingRecord && mobileTab === 'CORRECT' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-fade-in relative">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h6 className="font-extrabold text-sm uppercase text-slate-800 flex items-center gap-2 tracking-wider">
                  <Edit3 className="w-4.5 h-4.5 text-indigo-600" />
                  Rectification Module
                </h6>
                <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-2 font-sans">
                <div className="flex justify-between"><strong>Target:</strong> <span className="font-semibold text-slate-700">{editingRecord.studentName}</span></div>
                <div className="flex justify-between"><strong>Roll No:</strong> <span className="font-mono text-slate-700">{editingRecord.rollNumber}</span></div>
                <div className="flex justify-between"><strong>Logged Status:</strong> <span className={`font-bold font-mono ${editingRecord.status === 'PRESENT' ? 'text-emerald-600' : 'text-rose-600'}`}>{editingRecord.status}</span></div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Revised Status</label>
                  <select
                    value={newCorrectionStatus}
                    onChange={(e) => setNewCorrectionStatus(e.target.value as "PRESENT" | "ABSENT")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-slate-700"
                  >
                    <option value="PRESENT">PRESENT</option>
                    <option value="ABSENT">ABSENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Staff Audit Remarks</label>
                  <input
                    type="text"
                    value={correctionRemarks}
                    onChange={(e) => setCorrectionRemarks(e.target.value)}
                    placeholder="Correction reason..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-medium focus:outline-hidden focus:border-indigo-500 text-slate-700"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button onClick={() => setEditingRecord(null)} className="w-1/3 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={applyCoreStatusCorrection} className="w-2/3 flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white text-xs font-extrabold rounded-xl shadow-md hover:bg-slate-800 transition-colors"><span>Commit Entry</span></button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ==========================================
  // DESKTOP PREVIEW PORTAL VIEW
  // ==========================================
  return (
    <div className="space-y-6 animate-fade-in">
      
      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800 font-display tracking-tight">Faculty Dashboard</h2>
            <p className="text-[10px] text-slate-500 font-bold font-sans">Active Session</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded-xl border border-slate-205">
            <button
              onClick={() => setActiveTab("DASHBOARD")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "DASHBOARD" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-950"}`}
            >
              Overview
            </button>
            <button
              id="tab-teacher-mark"
              onClick={handleMarkTabSelect}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "MARK_ATTENDANCE" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-950"}`}
            >
              Take Attendance
            </button>
            <button
              onClick={() => setActiveTab("EDIT_ATTENDANCE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "EDIT_ATTENDANCE" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-950"}`}
            >
              Modify Logs
            </button>
            <button
              onClick={() => setActiveTab("AUDIT_TRAIL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "AUDIT_TRAIL" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-950"}`}
            >
              Audits
            </button>
            <button
              onClick={() => setActiveTab("MONTHLY_REPORT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "MONTHLY_REPORT" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-950"}`}
            >
              Monthly View
            </button>
            <button
              onClick={() => setActiveTab("ANNOUNCEMENTS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "ANNOUNCEMENTS" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-950"}`}
            >
              Announcements
            </button>
        </div>
      </div>

      {/* Conditional Tabs Content */}
      
      {/* 1. TEACHER DASHBOARD TAB */}
      {activeTab === "DASHBOARD" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-sans block">Assigned Classes Held</span>
                <span className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight mt-1 block">
                  {analytics.classesConducted}
                </span>
              </div>
              <div className="p-3.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl shadow-xs">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-sans block">Average Attendance Ratio</span>
                <span className="text-3xl font-extrabold text-emerald-800 font-mono tracking-tight mt-1 block">
                  {analytics.averageAttendance}%
                </span>
              </div>
              <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-750 rounded-2xl shadow-xs">
                <Award className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-sans block">My Assigned Subjects</span>
                <span className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight mt-1 block">
                  {subjects.length}
                </span>
              </div>
              <div className="p-3.5 bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl shadow-xs">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-sans block">Defaulters flagged (&lt;80%)</span>
                <span className="text-3xl font-extrabold text-rose-800 font-mono tracking-tight mt-1 block">
                  {analytics.defaulterCount}
                </span>
              </div>
              <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-750 rounded-2xl shadow-xs">
                <UserX className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Real-time Subject Average Chart */}
            <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[350px]">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base font-display tracking-tight">Assigned Subjects Performance</h3>
                <p className="text-xs text-slate-600 mt-0.5">Average overall attendance collected across active subjects.</p>
              </div>

              <div className="flex-1 min-h-[220px] mt-4">
                {analytics.subjectSummaries.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">No subjects mapped in memory.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={analytics.subjectSummaries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="subjectCode" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", color: "white" }} />
                      <Bar dataKey="averageRatio" name="Average Attendance %" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Teaching Subject Info table */}
            <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[350px]">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm font-sans tracking-tight mb-4">Lecture Mapping Directory</h3>
                <div className="space-y-3">
                  {subjects.map((sub) => (
                    <div key={sub.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded font-bold mr-1.5">
                          {sub.code}
                        </span>
                        <strong className="text-slate-700 text-xs">{sub.name}</strong>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">Sem {sub.semester}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50">
                <button
                  onClick={handleMarkTabSelect}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 hover:text-white transition-all text-white rounded-xl text-xs font-semibold"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Initiate Attendance Session</span>
                </button>
              </div>
            </div>
          </div>

          {/* LECTURE SCHEDULE CALENDAR & TRACKER PANEL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-25/45 p-4 border border-slate-100 rounded-3xl" id="calendar-lecture-tracker-section">
            
            {/* MINI CALENDAR BLOCK */}
            <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[340px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-slate-800 text-xs font-sans tracking-tight uppercase flex items-center gap-1.5 text-indigo-750">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Lecture Tracker Calendar</span>
                  </h3>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1))}
                      className="p-1 rounded-lg hover:bg-slate-100 border border-slate-100 transition-colors"
                      type="button"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <span className="text-[11px] font-bold text-slate-700 w-24 text-center font-sans tracking-tight shrink-0">
                      {currentCalendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button 
                      onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1))}
                      className="p-1 rounded-lg hover:bg-slate-100 border border-slate-100 transition-colors"
                      type="button"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                  </div>
                </div>

                {/* Days of week header */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 font-mono">
                  <span>S</span>
                  <span>M</span>
                  <span>T</span>
                  <span>W</span>
                  <span>T</span>
                  <span>F</span>
                  <span>S</span>
                </div>

                {/* Days list */}
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const year = currentCalendarMonth.getFullYear();
                    const month = currentCalendarMonth.getMonth();
                    const firstDay = new Date(year, month, 1);
                    const startDayOfWeek = firstDay.getDay();
                    const totalDays = new Date(year, month + 1, 0).getDate();
                    
                    const cells = [];
                    // leading empty grid slots
                    for (let i = 0; i < startDayOfWeek; i++) {
                      cells.push(<div key={`empty-${i}`} className="h-8 shrink-0"></div>);
                    }
                    
                    for (let d = 1; d <= totalDays; d++) {
                      const dString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const daySessions = sessions.filter(s => s.date === dString);
                      const hasLects = daySessions.length > 0;
                      const isSelected = selectedCalendarDate === dString;
                      
                      cells.push(
                        <button
                          key={`day-${d}`}
                          type="button"
                          onClick={() => setSelectedCalendarDate(dString)}
                          className={`h-8 w-full rounded-lg text-xs font-semibold flex flex-col items-center justify-center relative transition-all border ${
                            isSelected 
                              ? "bg-slate-900 border-slate-900 text-white font-extrabold shadow-sm scale-105"
                              : hasLects
                                ? "bg-indigo-50/70 text-indigo-700 border-indigo-100/80 hover:bg-indigo-100"
                                : "text-slate-600 border-transparent hover:bg-slate-50 hover:border-slate-100"
                          }`}
                        >
                          <span>{d}</span>
                          {hasLects && !isSelected && (
                            <span className="absolute bottom-1 w-1 h-1 bg-indigo-500 rounded-full"></span>
                          )}
                        </button>
                      );
                    }
                    return cells;
                  })()}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-indigo-100 border border-indigo-150 rounded-md block shrink-0"></span>
                  <span>Days with Lectures Held</span>
                </div>
                <div>
                  <span>Distinct: {new Set(sessions.map(s => s.date)).size} days</span>
                </div>
              </div>
            </div>

            {/* SESSIONS DETAILS CARD */}
            <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[340px]">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-[13px] font-sans tracking-tight">
                      Sessions on {new Date(selectedCalendarDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Quickly query and manage attendance registers for specified slots below.</p>
                  </div>
                </div>

                <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                  {(() => {
                    const daySessions = sessions.filter(s => s.date === selectedCalendarDate);
                    if (daySessions.length === 0) {
                      return (
                        <div className="text-center py-8 text-slate-400 text-xs font-medium bg-slate-25/50 border border-dashed border-slate-150 rounded-xl space-y-2 mt-2">
                          <Clock className="w-6 h-6 text-slate-300 mx-auto" strokeWidth={1.5} />
                          <p>No active sessions detected or logged on this date.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setMarkingDate(selectedCalendarDate);
                              setActiveTab("MARK_ATTENDANCE");
                              setMobileTab("MARK");
                              setMobileMarkStep(1);
                              setStatusMessage("");
                            }}
                            className="text-[11px] font-bold text-indigo-650 bg-white border border-indigo-150 hover:bg-indigo-50/50 px-3 py-1.5 rounded-lg transition-colors inline-block mt-1 shadow-2xs cursor-pointer"
                          >
                            Mark Attendance for this Date
                          </button>
                        </div>
                      );
                    }

                    return daySessions.map((sess, idx) => {
                      return (
                        <div 
                          key={`${sess.subjectId}-${sess.batchId}-${idx}`} 
                          className="p-3 bg-slate-25 border border-slate-100 rounded-xl flex items-center justify-between transition-all hover:border-indigo-100"
                        >
                          <div className="min-w-0 pr-4">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded font-mono">
                                {sess.subjectCode}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500">
                                {sess.batchName} (Sem {sess.semester})
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-700 text-xs truncate uppercase tracking-tight">{sess.subjectName}</h4>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setEditSubjectId(sess.subjectId);
                              setEditBatchId(sess.batchId);
                              setEditDate(sess.date);
                              setActiveTab("EDIT_ATTENDANCE");
                              setTriggerQueryEdit(true);
                            }}
                            className="bg-slate-900 hover:bg-slate-950 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shrink-0 flex items-center gap-1 shadow-2xs"
                          >
                            <span>Open Log Register</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="text-[10px] bg-indigo-50 border border-indigo-100/50 text-indigo-800 p-3 rounded-xl mt-3 font-medium flex gap-2">
                <Info className="w-3.5 h-3.5 shrink-0 text-indigo-505" />
                <span>All modifications log and timestamp credentials instantly sync. Highlighting features standard PostgreSQL query optimizations.</span>
              </div>
            </div>

          </div>

          {/* SUBSTITUTE TEACHER PROTOCOL PANEL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-25/45 p-4 border border-slate-100 rounded-3xl">
            {/* Active Substitutes Details */}
            <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[280px]">
              <div className="space-y-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-xs font-sans tracking-tight uppercase flex items-center gap-1.5 text-indigo-700">
                    <Users className="w-4 h-4" />
                    <span>Substitute Teacher Protocol</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Schedule another faculty member to run sessions during adjustments. Assigned substitutes can temporarily mark student logs.
                  </p>
                </div>

                <div className="space-y-2 min-h-[120px] max-h-[160px] overflow-y-auto pr-1">
                  {activeSubstitutions.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-medium bg-slate-25 border border-dashed border-slate-150 rounded-xl space-y-1.5">
                      <Users className="w-5 h-5 text-slate-300 mx-auto" strokeWidth={1.5} />
                      <p>No active substitutes currently assigned.</p>
                    </div>
                  ) : (
                    activeSubstitutions.map((sub) => (
                      <div key={sub.id} className="p-3 bg-indigo-25/50 border border-indigo-100/50 rounded-xl flex items-center justify-between text-xs transition-all">
                        <div>
                          <div className="font-extrabold text-slate-800">{sub.substitute_name}</div>
                          <div className="text-[10px] text-slate-500 font-medium my-0.5">Subject: {sub.subject_name} ({sub.subject_code})</div>
                        </div>
                        <span className="text-[9px] font-bold text-indigo-700 bg-white border border-indigo-100 px-2 py-0.5 rounded-full font-mono uppercase shrink-0">
                          Active State
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <div className="text-[10px] bg-indigo-50 border border-indigo-100/50 text-indigo-800 p-3 rounded-xl mt-3 font-medium flex gap-2">
                <Info className="w-3.5 h-3.5 shrink-0 text-indigo-505" />
                <span>Substitute assignments notify students immediately and sync lecture records in core Postgres logs.</span>
              </div>
            </div>

            {/* Assign Substitute Form */}
            <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-[13px] font-sans tracking-tight mb-2 uppercase text-slate-600 block">
                  Assign Lecture Protocol Override
                </h3>
                <p className="text-xs text-slate-400 mb-4">Choose target courses and delegate lectures cleanly.</p>

                <form onSubmit={handleAssignSubstitute} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                        Target Subject / Course
                      </label>
                      <select
                        value={substituteSubjectId}
                        onChange={(e) => setSubstituteSubjectId(e.target.value)}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-25/50 text-slate-800 outline-none focus:outline-indigo-600"
                      >
                        <option value="all">All Assigned Subjects</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                        Choose Substitute Faculty
                      </label>
                      <select
                        value={substituteTeacherId}
                        onChange={(e) => setSubstituteTeacherId(e.target.value)}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-25/50 text-slate-800 outline-none focus:outline-indigo-600"
                      >
                        <option value="">-- Choose Substitute Faculty --</option>
                        <option value="none">❌ Reset / Remove active substitutions</option>
                        {allTeachers
                          .filter((t) => t.id !== teacherUser.id)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.fullName} ({t.employeeId})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {substituteStatusMessage && (
                    <div className={`p-3 rounded-xl text-xs font-medium border ${
                      substituteStatusMessage.includes("✅")
                        ? "bg-emerald-25 border-emerald-100 text-emerald-800"
                        : "bg-amber-25 border-amber-100 text-amber-800"
                    }`}>
                      {substituteStatusMessage}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={substituteSubmitLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-950 transition-all text-white rounded-xl text-xs font-bold"
                    >
                      <span>{substituteSubmitLoading ? "Updating Assignments..." : "Activate Protocol"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Recent activity marked */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm font-sans tracking-tight">Recent Student Activity Log</h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time attendance transaction queries mapped to Postgres schemas.</p>
            </div>
            <div className="divide-y divide-slate-50">
              {analytics.recentActivity.slice(0, 5).map((act) => (
                <div key={act.id} className="px-6 py-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50">
                  <span className="font-bold text-slate-700">{act.studentName}</span>
                  <span className="text-slate-500 font-medium">{act.subjectName}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[10px] font-mono">{act.date}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                      act.status === "PRESENT" 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                        : "bg-rose-50 text-rose-600 border border-rose-100"
                    }`}>
                      {act.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. MARK DAILY ATTENDANCE SCREEN */}
      {activeTab === "MARK_ATTENDANCE" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 overflow-hidden space-y-6">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base font-sans tracking-tight">Mark Attendance Sheet</h3>
            <p className="text-xs text-slate-500 mt-0.5">Define subject, batch and log. This writes to attendance with unique key index checks.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Select Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-white"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>[{s.code}] {s.name} (Sem {s.semester})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Select Batch</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-white"
              >
                {validMarkBatches.length > 0 ? validMarkBatches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} (Sem {b.semester})</option>
                )) : (
                  <option value="" disabled>-- No Valid Batches --</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Date of Lecture</label>
              <input
                type="date"
                value={markingDate}
                onChange={(e) => setMarkingDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 font-mono bg-white text-slate-700"
              />
            </div>
          </div>

          {/* Bulk Toggles */}
          <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between gap-4">
            <span className="text-xs font-medium text-slate-600">Bulk Actions:</span>
            <div className="flex gap-2">
              <button
                type="button"
                id="btn-bulk-present"
                onClick={() => toggleAllMarkingStates("PRESENT")}
                className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-bold hover:bg-emerald-100 text-[10px] transition-all uppercase"
              >
                Set All Present
              </button>
              <button
                type="button"
                id="btn-bulk-absent"
                onClick={() => toggleAllMarkingStates("ABSENT")}
                className="px-3 py-1 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-bold hover:bg-rose-100 text-[10px] transition-all uppercase"
              >
                Set All Absent
              </button>
            </div>
          </div>

          {/* Students Checklist table */}
          <div className="border border-slate-100 rounded-xl divide-y divide-slate-50">
            {studentsToMark.length === 0 ? (
              <div className="text-center p-8 text-slate-400 text-xs font-medium">No active students found mapped to this batch.</div>
            ) : (
              studentsToMark.map((stu) => {
                const isSelected = attendanceStates[stu.id] === "PRESENT";
                return (
                  <div key={stu.id} className="p-4 flex items-center justify-between hover:bg-slate-50/40">
                    <div className="flex items-center gap-3">
                      {stu.profilePhotoUrl ? (
                        <img src={stu.profilePhotoUrl} alt={stu.fullName} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-[12px] font-bold text-slate-500 shrink-0">
                          {stu.fullName.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h5 className="font-bold text-slate-800 text-xs truncate">
                          {stu.fullName} <span className="text-[10px] font-mono text-slate-400 ml-1">({stu.rollNumber})</span>
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{stu.enrollmentNumber} • Email: {stu.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAttendanceStates(prev => ({ ...prev, [stu.id]: "PRESENT" }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1 ${
                          isSelected 
                            ? "bg-emerald-600 text-white shadow-xs" 
                            : "bg-slate-50 text-slate-400 border border-slate-200 hover:text-slate-600"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Present</span>
                      </button>
                      <button
                        onClick={() => setAttendanceStates(prev => ({ ...prev, [stu.id]: "ABSENT" }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1 ${
                          !isSelected 
                            ? "bg-rose-600 text-white shadow-xs" 
                            : "bg-slate-50 text-slate-400 border border-slate-200 hover:text-rose-600"
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Absent</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex flex-col items-center gap-3 pt-4 border-t border-slate-50">
            {isDateAlreadyMarked && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl text-center w-full flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Attendance already recorded for this session. Use "Modify Logs" to edit.</span>
              </div>
            )}
            {statusMessage && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl text-center w-full">
                {statusMessage}
              </div>
            )}
            <button
              onClick={submitDailyAttendance}
              disabled={isSubmitting || studentsToMark.length === 0 || isDateAlreadyMarked}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-850 hover:text-white text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Persisting to transactional tables..." : isDateAlreadyMarked ? "Session Already Marked" : "Save Daily Attendance Sheet"}
            </button>
          </div>
        </div>
      )}

      {/* 5. MONTHLY REPORT TAB (DESKTOP) */}
      {activeTab === "MONTHLY_REPORT" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base font-sans tracking-tight">Monthly CSV-Like Attendance View</h3>
              <p className="text-xs text-slate-500 mt-0.5">Generate a comprehensive tabular grid of all student attendances for a given month.</p>
            </div>
            {monthlyStudents.length > 0 && (
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all select-none cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export to CSV</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Select Subject</label>
              <select
                value={reportSubjectId}
                onChange={(e) => setReportSubjectId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-white"
              >
                <option value="">-- Select Subject --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Select Batch</label>
              <select
                value={reportBatchId}
                onChange={(e) => setReportBatchId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-white"
              >
                <option value="">-- Select Batch --</option>
                {validReportBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Target Month</label>
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold font-mono focus:outline-hidden focus:border-indigo-500 bg-white text-slate-700"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={() => { setMonthlyStudents([]); setMonthlyRecords([]); }}
                className="w-1/3 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold h-[36px] transition-all"
                title="Clear Report"
              >
                <span>Clear</span>
              </button>
              <button
                onClick={generateMonthlyReport}
                className="w-2/3 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold h-[36px] transition-all"
              >
                <span>Generate Report</span>
              </button>
            </div>
          </div>

          {isQuerying ? (
            <div className="flex flex-col items-center justify-center p-12 min-h-[200px] border border-slate-100 rounded-xl bg-slate-50/50">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-4"></div>
              <p className="text-slate-400 font-medium text-xs text-center">Querying Database...</p>
            </div>
          ) : monthlyStudents.length > 0 && (
            <div className="border border-slate-100 rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-3 border-r border-slate-100 sticky left-0 bg-slate-50 z-10 shadow-[1px_0_0_0_#f1f5f9]">Roll No.</th>
                    <th className="p-3 border-r border-slate-100 bg-slate-50">Student Name</th>
                    {Array.from(new Set(monthlyRecords.map(r => r.date))).sort().map((d: any) => (
                      <th key={d} className="p-3 border-r border-slate-100 text-center" title={d}>{(d as string).slice(-2)}</th>
                    ))}
                    <th className="p-3 text-center bg-slate-50">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-[11px]">
                  {monthlyStudents.map(stu => {
                    const stuRecords = monthlyRecords.filter(r => r.studentId === stu.id);
                    const presents = stuRecords.filter(r => r.status === "PRESENT").length;
                    const total = stuRecords.filter(r => r.status === "PRESENT" || r.status === "ABSENT").length;
                    const pct = total > 0 ? Math.round((presents / total) * 100) : 100;
                    return (
                      <tr key={stu.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 border-r border-slate-100 sticky left-0 bg-white font-mono text-slate-500 z-10 shadow-[1px_0_0_0_#f1f5f9]">
                          {stu.rollNumber}
                        </td>
                        <td className="p-3 border-r border-slate-100 font-bold text-slate-700">
                          {stu.fullName}
                        </td>
                        {Array.from(new Set(monthlyRecords.map(r => r.date))).sort().map(d => {
                          const rec = stuRecords.find(r => r.date === d);
                          return (
                            <td key={d} className="p-3 border-r border-slate-100 text-center font-bold">
                              {rec?.status === "PRESENT" ? (
                                <span className="text-emerald-500">P</span>
                              ) : rec?.status === "ABSENT" ? (
                                <span className="text-rose-500">A</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className={`p-3 text-center font-extrabold text-[12px] ${pct >= 80 ? 'text-emerald-600 bg-emerald-50/30' : 'text-rose-600 bg-rose-50/30'}`}>
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. EDIT / HISTORICAL CORRECTOR TAB */}
      {activeTab === "EDIT_ATTENDANCE" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base font-sans tracking-tight">Attendance Record Modifier</h3>
            <p className="text-xs text-slate-500 mt-0.5">Identify previous logs, apply correction reason and verify automatic audit trailing logs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Select Subject</label>
              <select
                value={editSubjectId}
                onChange={(e) => setEditSubjectId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-white"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>[{s.code}] {s.name} (Sem {s.semester})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Select Batch</label>
              <select
                value={editBatchId}
                onChange={(e) => setEditBatchId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-white"
              >
                {validCorrectBatches.length > 0 ? validCorrectBatches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} (Sem {b.semester})</option>
                )) : (
                  <option value="" disabled>-- No Valid Batches --</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Target Date</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 font-mono bg-white text-slate-700"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={queryAttendanceForCorrections}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold h-[36px] transition-all"
              >
                <span>Query Logs</span>
              </button>
            </div>
          </div>

          {/* List of queried records */}
          {isQuerying ? (
            <div className="flex flex-col items-center justify-center p-12 min-h-[200px] border border-slate-100 rounded-xl bg-slate-50/50">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-4"></div>
              <p className="text-slate-400 font-medium text-xs text-center">Querying Database...</p>
            </div>
          ) : queriedRecordsToEdit.length > 0 && (
            <div className="border border-slate-100 rounded-xl divide-y divide-slate-50">
              {queriedRecordsToEdit.map((rec) => (
                <div key={rec.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    {rec.profilePhotoUrl ? (
                      <img src={rec.profilePhotoUrl} className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                        {rec.studentName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-slate-700">{rec.studentName}</span>
                      <span className="text-slate-400 font-mono ml-2">({rec.rollNumber} • {rec.enrollmentNumber})</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      rec.status === "PRESENT" 
                        ? "bg-emerald-50 text-emerald-600" 
                        : "bg-rose-50 text-rose-600"
                    }`}>
                      {rec.status}
                    </span>

                    <button
                      onClick={() => {
                        setEditingRecord(rec);
                        setNewCorrectionStatus(rec.status);
                        setCorrectionRemarks("");
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-150 rounded-lg hover:bg-indigo-100 flex items-center gap-1.5"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Edit Roll</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Form Modal mock Overlay if editing */}
          {editingRecord && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-fade-in relative">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Edit3 className="w-4.5 h-4.5 text-indigo-600" />
                    Modify Attendance Status
                  </h4>
                  <button
                    onClick={() => setEditingRecord(null)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-md hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                  <div className="flex justify-between"><strong className="text-slate-500">Student Name:</strong> <span className="font-semibold text-slate-700">{editingRecord.studentName}</span></div>
                  <div className="flex justify-between"><strong className="text-slate-500">Enrollment No:</strong> <span className="font-mono text-slate-700">{editingRecord.enrollmentNumber}</span></div>
                  <div className="flex justify-between"><strong className="text-slate-500">Logged Status:</strong> <span className={`font-bold font-mono ${editingRecord.status === 'PRESENT' ? 'text-emerald-600' : 'text-rose-600'}`}>{editingRecord.status}</span></div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Set Correct Status</label>
                    <select
                      value={newCorrectionStatus}
                      onChange={(e) => setNewCorrectionStatus(e.target.value as "PRESENT" | "ABSENT")}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-hidden focus:border-indigo-500 bg-white text-slate-700"
                    >
                      <option value="PRESENT">PRESENT</option>
                      <option value="ABSENT">ABSENT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Auditing Correction Remarks</label>
                    <input
                      type="text"
                      value={correctionRemarks}
                      onChange={(e) => setCorrectionRemarks(e.target.value)}
                      placeholder="Enter reason (e.g., Medical certificate approved)"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setEditingRecord(null)}
                    className="w-1/3 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyCoreStatusCorrection}
                    className="w-2/3 flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-md"
                  >
                    <span>Commit & Write to Audit Trail</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. AUDIT TRAIL LOGS VIEW */}
      {activeTab === "AUDIT_TRAIL" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base font-sans tracking-tight">Security Audit Logs</h3>
            <p className="text-xs text-slate-500 mt-0.5">All attendance record revisions are captured below including modifier signature.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <th className="p-3">Modified On</th>
                  <th className="p-3">Target Date</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Subject Name</th>
                  <th className="p-3">Rev. From</th>
                  <th className="p-3">Rev. To</th>
                  <th className="p-3">Modified By</th>
                  <th className="p-3">Remarks Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-slate-400 font-medium">No history log modifications registered in current session.</td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/40 text-slate-600 transition-colors">
                      <td className="p-3 font-mono text-[11px] font-medium">{new Date(log.modifiedDate).toLocaleDateString()}<br/><span className="text-[9px] text-slate-400">{new Date(log.modifiedDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></td>
                      <td className="p-3 font-mono text-[11px] font-bold text-slate-700">{(log as any).date}</td>
                      <td className="p-3 font-bold text-slate-800">
                        {log.studentName || "N/A"}
                        <span className="block text-[10px] text-slate-400 font-mono font-normal">{(log as any).enrollmentNumber}</span>
                      </td>
                      <td className="p-3 font-semibold">{(log as any).subjectName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 font-mono text-[10px] font-bold rounded">
                          {log.previousStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 font-mono text-[10px] font-bold rounded">
                          {log.newStatus}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-700">{log.modifiedBy}</td>
                      <td className="p-3 max-w-[200px] truncate" title={log.remarks}>{log.remarks}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. ANNOUNCEMENTS BROADCAST VIEW */}
      {activeTab === "ANNOUNCEMENTS" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Create Announcement Form */}
          <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base font-sans tracking-tight flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <span>Broadcast Student Alert</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Send instantly readable alert notifications to all students of a selected batch or department.
              </p>
            </div>

            <form onSubmit={handleBroadcastAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Broadcast Audience Target
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAnnType("BATCH")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      annType === "BATCH"
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold shadow-2xs"
                        : "bg-slate-25/50 border-slate-100 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Specific Batch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnType("DEPARTMENT")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      annType === "DEPARTMENT"
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold shadow-2xs"
                        : "bg-slate-25/50 border-slate-100 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    <span>Entire Dept</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Choose {annType === "BATCH" ? "Academic Batch" : "Department"}
                </label>
                <select
                  value={annTargetId}
                  onChange={(e) => setAnnTargetId(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-25/50 text-slate-800 focus:outline-indigo-600 outline-none"
                >
                  <option value="">-- Choose Target --</option>
                  {annType === "BATCH" ? (
                    batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (Sem {b.semester})
                      </option>
                    ))
                  ) : (
                    allDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Announcement Headline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Midterm Lab Venue Shifted"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-25/50 text-slate-800 placeholder-slate-400 focus:outline-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Detailed Notification Content
                </label>
                <textarea
                  rows={4}
                  placeholder="Please write down schedule details, assignments or urgency notes here..."
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-25/50 text-slate-800 placeholder-slate-400 focus:outline-indigo-600 outline-none"
                />
              </div>

              {annStatusMessage && (
                <div className={`p-3 rounded-xl text-xs font-medium border ${
                  annStatusMessage.includes("✅")
                    ? "bg-emerald-25 border-emerald-100 text-emerald-800"
                    : "bg-amber-25 border-amber-100 text-amber-800"
                }`}>
                  {annStatusMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={annSubmitLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-950 text-white transition-all rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 border-none"
              >
                {annSubmitLoading ? "Broadcasting..." : "Send Out Announcement Alert"}
              </button>
            </form>
          </div>

          {/* Past Broadcast History */}
          <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col justify-between min-h-[450px]">
            <div className="space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base font-sans tracking-tight">
                  Broadcast logs history
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chrono list of academic alert bulletins broadcasted in database.
                </p>
              </div>

              <div className="divide-y divide-slate-50 max-h-[360px] overflow-y-auto pr-1">
                {announcementHistory.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs font-medium space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" strokeWidth={1.5} />
                    <p>No broadcast history logged yet.</p>
                  </div>
                ) : (
                  announcementHistory.map((ann) => {
                    const targetName = ann.type === "BATCH"
                      ? batches.find(b => b.id === ann.target_id)?.name || ann.target_id
                      : allDepartments.find(d => d.id === ann.target_id)?.name || ann.target_id;
                    return (
                      <div key={ann.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border inline-flex items-center gap-1 shrink-0 ${
                            ann.type === "BATCH"
                              ? "bg-blue-25 border-blue-100 text-blue-700"
                              : "bg-purple-25 border-purple-100 text-purple-700"
                          }`}>
                            {ann.type === "BATCH" ? <Users className="w-2.5 h-2.5" /> : <Home className="w-2.5 h-2.5" />}
                            <span>{ann.type}: {targetName}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium font-mono shrink-0">
                            {new Date(ann.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-800 text-xs leading-snug">{ann.title}</h4>
                        <p className="text-slate-600 text-xs leading-relaxed">{ann.message}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
