import { useState, useEffect } from "react";
import { StudentAnalyticsResponse, Student } from "../types";
import { 
  User, CheckCircle, AlertTriangle, AlertOctagon, Calendar, 
  BookOpen, FolderDown, ArrowUpRight, Search, FileSpreadsheet, FileText, Bell,
  Home, History, Clock, Info, ChevronRight
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface StudentPortalProps {
  studentUser: Student;
  onLogout?: () => void;
  allNotifications?: any[];
  isMobileView?: boolean;
}

export default function StudentPortal({ 
  studentUser, 
  allNotifications = [], 
  isMobileView = false
}: StudentPortalProps) {
  const [data, setData] = useState<StudentAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  // Mobile App state management
  const [mobileTab, setMobileTab] = useState<"HOME" | "SUBJECTS" | "TIMELINE" | "ALERTS">("HOME");
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  // Fetch current student's real-time calculated analytics from Express API (full-stack integration)
  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/student/${studentUser.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Network status issue");
        return res.json();
      })
      .then((analytics) => {
        setData(analytics);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load student analytics", err);
        setLoading(false);
      });
  }, [studentUser.id]);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-4"></div>
        <p className="text-slate-400 font-medium text-xs text-center">Recalculating real-time subject-wise averages...</p>
      </div>
    );
  }

  // Filter subject-wise lists
  const filteredSubjects = data.subjectStats.filter((sub) => {
    const matchesSearch = sub.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          sub.subjectCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === "ALL") return matchesSearch;
    return matchesSearch && sub.category === statusFilter;
  });

  const getStatusColor = (category: "SAFE" | "WARNING" | "CRITICAL") => {
    switch (category) {
      case "SAFE":
        return "text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100/50";
      case "WARNING":
        return "text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100/50";
      case "CRITICAL":
        return "text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100/50";
    }
  };

  const getStatusIcon = (category: "SAFE" | "WARNING" | "CRITICAL") => {
    switch (category) {
      case "SAFE":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "WARNING":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "CRITICAL":
        return <AlertOctagon className="w-4 h-4 text-rose-500" />;
    }
  };

  const triggerExport = (format: "PDF" | "EXCEL") => {
    setDownloadingFormat(format);
    setTimeout(() => {
      setDownloadingFormat(null);
      
      const title = `UAMS_${studentUser.fullName.replace(/\s+/g, '_')}_Attendance_Report`;
      let content = "";
      if (format === "PDF") {
        content = `======================================================
NATIONAL FORENSIC SCIENCES UNIVERSITY (NFSU) DELHI
======================================================
Student: ${studentUser.fullName}
Enrollment No: ${studentUser.enrollmentNumber}
Semester / Batch: Semester ${studentUser.semester} / SET
Overall Percentage: ${data.overallPercentage}%
Status Class: ${data.statusCategory}
Generated On: ${new Date().toLocaleDateString()}
------------------------------------------------------
SUBJECT-WISE SUMMARY:
` + data.subjectStats.map(s => `- ${s.subjectCode}: ${s.subjectName} | Present: ${s.present}/${s.total} (${s.percentage}%)`).join("\n") + `
======================================================`;
      } else {
        content = "Enrollment Number,Student Name,Subject Code,Subject Name,Classes Present,Classes Absent,Total Classes,Attendance Percentage\n" +
          data.subjectStats.map(s => `"${studentUser.enrollmentNumber}","${studentUser.fullName}","${s.subjectCode}","${s.subjectName}",${s.present},${s.absent},${s.total},${s.percentage}%`).join("\n");
      }

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title}.${format === "PDF" ? "pdf" : "xlsx"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 1500);
  };

  // Student specific notifications filters
  const stuNotifications = allNotifications.filter(n => n.message.includes(studentUser.fullName) || n.userId === "u-john");

  // ==========================================
  // MOBILE VIEW RENDER BLOCK (FOR FLUTTER APK)
  // ==========================================
  if (isMobileView) {
    // Dynamic circular representation constants
    const radius = 45;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (data.overallPercentage / 100) * circumference;

    return (
      <div className="flex flex-col h-full bg-slate-50 relative select-none">
        
        {/* Screen Content Scroll Area */}
        <div className="flex-1 pb-28 space-y-4 overflow-y-auto">
          
          {/* TAB 1: HOME DASHBOARD */}
          {mobileTab === "HOME" && (
            <div className="space-y-4 animate-fade-in">
              {/* Radial Meter Card */}
              <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-xs flex items-center gap-5 justify-between">
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    {/* Background Circle */}
                    <circle 
                      cx="48" cy="48" r={radius} 
                      className="text-slate-100" 
                      strokeWidth={strokeWidth} 
                      stroke="currentColor" 
                      fill="transparent" 
                    />
                    {/* Foreground progress dynamic circle */}
                    <circle 
                      cx="48" cy="48" r={radius} 
                      className={`${
                        data.overallPercentage >= 80 ? "text-emerald-500" :
                        data.overallPercentage >= 65 ? "text-amber-500" : "text-rose-500"
                      }`} 
                      strokeWidth={strokeWidth} 
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      stroke="currentColor" 
                      fill="transparent" 
                    />
                  </svg>
                  {/* Inside Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-slate-800 leading-none">{data.overallPercentage}%</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Ratio</span>
                  </div>
                </div>

                <div className="flex-1 space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider select-none leading-none block">Attendance Status</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold font-mono ${
                      data.statusCategory === "SAFE" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                      data.statusCategory === "WARNING" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                      "bg-rose-50 text-rose-600 border border-rose-100"
                    }`}>
                      {data.statusCategory}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold font-sans">Tier index</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal font-sans pt-0.5">
                    {data.statusCategory === "SAFE" ? "Your attendance complies with the 80% University examination threshold." : 
                     data.statusCategory === "WARNING" ? "Warning block. Elevate attendance to secure exam clearance." :
                     "Defaulter Alert. Critical status. Below mandatory threshold limits."}
                  </p>
                </div>
              </div>

              {/* Attendance Breakdown Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white border border-slate-150 p-3 rounded-xl text-center shadow-xs">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Conducted</span>
                  <span className="text-lg font-extrabold text-slate-800 font-mono block mt-0.5">{data.totalClasses}</span>
                </div>
                <div className="bg-white border border-slate-150 p-3 rounded-xl text-center shadow-xs">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block text-emerald-600">Attended</span>
                  <span className="text-lg font-extrabold text-emerald-700 font-mono block mt-0.5">{data.presentClasses}</span>
                </div>
                <div className="bg-white border border-slate-150 p-3 rounded-xl text-center shadow-xs">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block text-rose-600">Absents</span>
                  <span className="text-lg font-extrabold text-rose-750 font-mono block mt-0.5">{data.absentClasses}</span>
                </div>
              </div>

              {/* Native Report Export Trigger card */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-150 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <div className="text-left">
                    <h5 className="font-bold text-xs text-slate-850">Export Report Document</h5>
                    <p className="text-[10px] text-slate-500 leading-none mt-0.5">Download sessional log as PDF</p>
                  </div>
                </div>
                <button
                  onClick={() => triggerExport("PDF")}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-750 transition-all select-none"
                >
                  Download
                </button>
              </div>

              {/* Warning Alert Banner */}
              {data.statusCategory !== "SAFE" && (
                <div className={`p-3.5 rounded-xl border flex items-start gap-2 ${
                  data.statusCategory === "CRITICAL" ? "bg-rose-50 border-rose-150 text-rose-800" : "bg-amber-50 border-amber-100 text-amber-800"
                }`}>
                  <AlertOctagon className="w-4.5 h-4.5 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <h6 className="font-extrabold text-xs">University Defaulter Alert</h6>
                    <p className="text-[11px] leading-relaxed text-slate-600 mt-1">
                      Attendance lacks full compliance metrics. Keep logs healthy to ensure smooth end sessional exam registration.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SUBJECT PERFORMANCE */}
          {mobileTab === "SUBJECTS" && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Subject-Wise Breakdown</h4>
                <span className="text-[10px] text-slate-400 font-mono">({data.subjectStats.length} Subjects)</span>
              </div>

              {/* Interactive Collapsible Subjects List */}
              <div className="space-y-2">
                {data.subjectStats.map(sub => {
                  const isExpanded = expandedSubjectId === sub.subjectId;
                  return (
                    <div 
                      key={sub.subjectId} 
                      className="bg-white border border-slate-150 rounded-xl overflow-hidden transition-all duration-200 shadow-xs"
                    >
                      <button 
                        onClick={() => setExpandedSubjectId(isExpanded ? null : sub.subjectId)}
                        className="w-full p-3.5 flex items-center justify-between text-left focus:outline-hidden"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg font-mono text-[9px] font-extrabold">
                            {sub.subjectCode}
                          </div>
                          <div>
                            <h5 className="font-bold text-xs text-slate-800">{sub.subjectName}</h5>
                            <p className="text-[10px] text-slate-400 mt-0.5">Attendance: <b className="text-slate-600">{sub.percentage}%</b></p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-extrabold uppercase ${
                            sub.category === "SAFE" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                            sub.category === "WARNING" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                            "bg-rose-50 text-rose-600 border border-rose-100"
                          }`}>
                            {sub.category}
                          </span>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-3.5 pt-1.5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                          {/* Progress bar scale */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
                              <span>Total Classes held: {sub.total}</span>
                              <span className={sub.percentage >= 80 ? "text-emerald-600" : "text-rose-600"}>{sub.percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-150 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  sub.category === "SAFE" ? "bg-emerald-500" :
                                  sub.category === "WARNING" ? "bg-amber-500" : "bg-rose-500"
                                }`}
                                style={{ width: `${sub.percentage}%` }}
                              />
                            </div>
                          </div>

                          {/* Quick details counts */}
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="p-2 bg-white border border-slate-100 rounded-lg shadow-2xs">
                              <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Attended</span>
                              <span className="text-xs font-extrabold text-slate-700 font-mono block mt-0.5">{sub.present}</span>
                            </div>
                            <div className="p-2 bg-white border border-slate-100 rounded-lg shadow-2xs">
                              <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider text-rose-500">Absent Logs</span>
                              <span className="text-xs font-extrabold text-rose-700 font-mono block mt-0.5">{sub.absent}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: TIMELINE TRACKER */}
          {mobileTab === "TIMELINE" && (
            <div className="space-y-3 animate-fade-in">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Personal Timeline</h4>
              
              <div className="space-y-2">
                {data.recentLogs.map(log => (
                  <div key={log.id} className="bg-white border border-slate-150 rounded-xl p-3 shadow-2xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 border border-slate-150 rounded-lg">
                        <Calendar className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-slate-800">{log.subjectName}</h5>
                        <p className="text-[9px] font-mono text-slate-400 mt-0.5">{log.subjectCode} • {log.date}</p>
                      </div>
                    </div>
                    
                    <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase ${
                      log.status === "PRESENT" 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                        : "bg-rose-50 text-rose-600 border border-rose-100"
                    }`}>
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ALERTS / INBOX */}
          {mobileTab === "ALERTS" && (
            <div className="space-y-3 animate-fade-in">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Alert System Inbox</h4>
              
              <div className="space-y-2.5">
                {stuNotifications.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">No notifications received in current session.</div>
                ) : (
                  stuNotifications.map(not => (
                    <div key={not.id} className="p-3.5 bg-white border border-slate-150 rounded-xl shadow-2xs text-left">
                      <div className="flex items-center justify-between text-[11px] border-b border-slate-50 pb-1.5 mb-2">
                        <span className="font-extrabold text-slate-800">{not.title}</span>
                        <span className="text-slate-400 font-mono text-[9px]">{new Date(not.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-sans">{not.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Floating App Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl flex items-center justify-around z-50 select-none px-6">
          <button 
            onClick={() => setMobileTab("HOME")}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all ${
              mobileTab === "HOME" ? "text-amber-600 font-bold scale-105" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Home className="w-4.5 h-4.5" />
            <span className="text-[9px] mt-1 tracking-tight font-sans">Home</span>
          </button>
          
          <button 
            onClick={() => setMobileTab("SUBJECTS")}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all ${
              mobileTab === "SUBJECTS" ? "text-amber-600 font-bold scale-105" : "text-slate-400 font-medium hover:text-slate-600"
            }`}
          >
            <BookOpen className="w-4.5 h-4.5" />
            <span className="text-[9px] mt-1 tracking-tight font-sans">Subjects</span>
          </button>

          <button 
            onClick={() => setMobileTab("TIMELINE")}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all ${
              mobileTab === "TIMELINE" ? "text-amber-600 font-bold scale-105" : "text-slate-400 font-medium hover:text-slate-600"
            }`}
          >
            <History className="w-4.5 h-4.5" />
            <span className="text-[9px] mt-1 tracking-tight font-sans">Timeline</span>
          </button>

          <button 
            onClick={() => setMobileTab("ALERTS")}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all relative ${
              mobileTab === "ALERTS" ? "text-amber-600 font-bold scale-105" : "text-slate-400 font-medium hover:text-slate-600"
            }`}
          >
            {stuNotifications.length > 0 && (
              <span className="absolute top-2 right-3.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            )}
            <Bell className="w-4.5 h-4.5" />
            <span className="text-[9px] mt-1 tracking-tight font-sans">Alerts</span>
          </button>
        </div>

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
            <User className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">Student Dashboard</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono font-bold ${
                data.statusCategory === "SAFE" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                data.statusCategory === "WARNING" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-rose-50 text-rose-600 border border-rose-100"
              }`}>Tier: {data.statusCategory}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
            <button
              onClick={() => triggerExport("PDF")}
              disabled={downloadingFormat !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all text-slate-600 disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <span>{downloadingFormat === "PDF" ? "Preparing..." : "Export PDF"}</span>
            </button>
            <button
              onClick={() => triggerExport("EXCEL")}
              disabled={downloadingFormat !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all text-slate-600 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>{downloadingFormat === "EXCEL" ? "Preparing..." : "Export Excel"}</span>
            </button>
        </div>
      </div>

      {/* Grid of numbers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider font-sans block">Overall attendance</span>
            <span className="text-3xl font-extrabold text-slate-800 tracking-tight mt-1 block">
              {data.overallPercentage}%
            </span>
          </div>
          <div className="p-3.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl shadow-xs">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider font-sans block">Total Classes held</span>
            <span className="text-3xl font-extrabold text-slate-800 tracking-tight mt-1 block">
              {data.totalClasses}
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-100 text-slate-600 rounded-2xl shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider font-sans block">Lectures attended</span>
            <span className="text-3xl font-extrabold text-emerald-700 tracking-tight mt-1 block">
              {data.presentClasses}
            </span>
          </div>
          <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl shadow-xs">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider font-sans block">Lectures absent</span>
            <span className="text-3xl font-extrabold text-rose-700 tracking-tight mt-1 block">
              {data.absentClasses}
            </span>
          </div>
          <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl shadow-xs">
            <AlertOctagon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Visual Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Subject wise comparison */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[350px]">
          <div className="mb-4">
            <h3 className="font-extrabold text-slate-800 text-base font-sans tracking-tight">Subject-wise Analytics (%)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Calculated in real-time across current semester offerings.</p>
          </div>
          
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.subjectStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="subjectCode" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", color: "white" }} 
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Bar dataKey="percentage" name="Attendance %" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Attendance curve */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[350px]">
          <div className="mb-4">
            <h3 className="font-extrabold text-slate-800 text-base font-sans tracking-tight">Academic Monthly Trend</h3>
            <p className="text-xs text-slate-500 mt-0.5">Calculated average attendance ratio month-over-month.</p>
          </div>

          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.monthlyStats} margin={{ top: 15, right: 15, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", color: "white" }} />
                <Bar dataKey="ratio" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Structured Subject details List */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base font-sans tracking-tight">Subject Attendance Records</h3>
            <p className="text-xs text-slate-500 mt-0.5">Individual lecture tally, present/absent logs, and threshold checks.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search subject..."
                className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium w-full focus:outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            {/* Category Select Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white"
            >
              <option value="ALL">All Categories</option>
              <option value="SAFE">Safe (&ge; 80%)</option>
              <option value="WARNING">Warning (65% - 80%)</option>
              <option value="CRITICAL">Critical (&lt; 60%)</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {filteredSubjects.length === 0 ? (
            <div className="text-center p-8 text-slate-400 text-xs font-medium">No subjects fit the criteria.</div>
          ) : (
            filteredSubjects.map((sub) => (
              <div key={sub.subjectId} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/45 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl mt-0.5 font-bold text-xs shrink-0 font-mono">
                    {sub.subjectCode}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{sub.subjectName}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Faculty Contact Office • Regular Lecture Hours</p>
                    
                    {/* Visual bar tracker */}
                    <div className="mt-3 flex items-center gap-1.5">
                      <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            sub.category === "SAFE" 
                              ? "bg-emerald-500" 
                              : sub.category === "WARNING" 
                              ? "bg-amber-500" 
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${sub.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{sub.percentage}% completed</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold font-sans">Present / Total Lectures</span>
                    <p className="text-sm font-extrabold text-slate-800 mt-0.5">
                      {sub.present} <span className="text-slate-400 text-xs font-normal">of</span> {sub.total} classes
                    </p>
                  </div>

                  <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold font-mono flex items-center gap-1.5 uppercase ${getStatusColor(sub.category)}`}>
                    {getStatusIcon(sub.category)}
                    <span>{sub.category}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Attendance Log list */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between min-h-[305px]">
          <div>
            <div className="p-6 border-b border-slate-50">
              <h3 className="font-extrabold text-slate-800 text-xs font-sans tracking-tight">Recent Attendance Ticker</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Dates are recorded directly into PostgreSQL with automatic timestamps.</p>
            </div>
            <div className="divide-y divide-slate-50">
              {data.recentLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="px-6 py-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50 transition-all">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="font-bold text-slate-700">{log.subjectName}</span>
                      <span className="text-[10px] text-slate-400 ml-1 font-mono">({log.subjectCode})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3.5">
                    <span className="text-slate-400 font-mono text-[10px]">{log.date}</span>
                    <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold ${
                      log.status === "PRESENT" 
                        ? "bg-emerald-50 border border-emerald-100 text-emerald-600" 
                        : "bg-rose-50 border border-rose-100 text-rose-600"
                    }`}>
                      {log.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Inbox Warnings & Updates */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[305px]">
          <div>
            <h3 className="font-extrabold text-slate-800 text-xs font-sans tracking-tight flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-500" />
              Personal Notification Inbox
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Triggered automatically on attendance modifications & alerts.</p>
            
            <div className="mt-4 space-y-3">
              {stuNotifications.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">No recent alert triggers.</div>
              ) : (
                stuNotifications.map((not) => (
                  <div key={not.id} className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl text-left">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700">{not.title}</span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {new Date(not.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{not.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
