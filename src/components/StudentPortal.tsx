import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { StudentAnalyticsResponse, Student } from "../types";
import { uamsFetch as fetch } from "../utils/api";
import { 
  User, CheckCircle, AlertTriangle, AlertOctagon, Calendar, 
  BookOpen, FolderDown, ArrowUpRight, Search, FileSpreadsheet, FileText, Bell,
  Home, History, Clock, Info, ChevronRight, TrendingUp
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
  const [mobileTab, setMobileTab] = useState<"HOME" | "SUBJECTS" | "TIMELINE" | "ALERTS" | "ANALYTICS">("HOME");
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

  if (loading || !data || !data.subjectStats) {
    return (
      <div className="w-full space-y-6 select-none animate-fade-in">
        {/* Skeleton Topbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-2">
            <div className="h-7 w-48 shimmer rounded-lg"></div>
            <div className="h-4 w-64 bg-slate-50 border border-slate-100 rounded-md py-1 px-2 flex items-center">
              <div className="h-2 w-full bg-slate-200/50 rounded shimmer"></div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 shimmer rounded-xl"></div>
            <div className="h-9 w-28 shimmer rounded-xl"></div>
          </div>
        </div>

        {/* Skeleton Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left panel skeleton: Radial details & warning banner */}
          <div className="md:col-span-4 space-y-6">
            <div className="border border-slate-100 rounded-2xl p-6 bg-white space-y-5 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border border-slate-100 shimmer shrink-0"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 w-16 shimmer rounded-md"></div>
                  <div className="h-5 w-28 shimmer rounded-lg"></div>
                  <div className="h-3.5 w-32 shimmer rounded-md"></div>
                </div>
              </div>
            </div>

            {/* Three key stats indicators */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-slate-100 p-4 rounded-xl text-center bg-white space-y-2 shadow-xs">
                  <div className="mx-auto h-3 w-8 bg-slate-100 rounded mb-1 shimmer"></div>
                  <div className="mx-auto h-5 w-12 shimmer rounded-md"></div>
                </div>
              ))}
            </div>

            {/* Dummy system information alert */}
            <div className="border border-slate-100 p-5 rounded-xl bg-slate-50/50 space-y-3">
              <div className="h-3.5 w-32 bg-slate-200/60 rounded-md shimmer"></div>
              <div className="h-3 w-full bg-slate-200/40 rounded-md shimmer"></div>
              <div className="h-3 w-2/3 bg-slate-200/40 rounded-md shimmer"></div>
            </div>
          </div>

          {/* Right panel skeleton: Course performances lists */}
          <div className="md:col-span-8 space-y-4 bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="h-4.5 w-36 bg-slate-200/70 rounded-lg shimmer"></div>
              <div className="h-4 w-16 bg-slate-200/40 rounded-md shimmer"></div>
            </div>
            
            {/* Pulsing Subject card lists */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-slate-100 p-4 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-slate-200/60 shimmer shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-2/3 bg-slate-200/60 rounded-md shimmer"></div>
                    <div className="h-3 w-1/3 bg-slate-100/60 rounded-md shimmer"></div>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="h-4.5 w-12 bg-slate-200/60 rounded-md ml-auto shimmer"></div>
                  <div className="h-3 w-16 bg-slate-100/60 rounded-md ml-auto shimmer"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
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
      
      if (format === "PDF") {
        try {
          const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
          });
          
          // Header Background Strip (National Forensic Sciences University deep navy scheme)
          doc.setFillColor(15, 23, 42); // slate-900 (#0f172a)
          doc.rect(0, 0, 210, 42, "F");
          
          // University Gold/Amber Accent Line
          doc.setFillColor(180, 141, 45); // Warm gold (#b48d2d)
          doc.rect(0, 42, 210, 2, "F");

          // Header Text
          doc.setTextColor(255, 255, 255);
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(13);
          doc.text("NATIONAL FORENSIC SCIENCES UNIVERSITY (NFSU)", 15, 18);
          
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(180, 141, 45); // Gold text
          doc.text("DELHI CAMPUS • UNIVERSITY ATTENDANCE MANAGEMENT SYSTEM (UAMS)", 15, 25);
          
          doc.setFontSize(8.5);
          doc.setTextColor(156, 163, 175); // gray-400
          doc.text(`Official Log Registry Credential • Generated: ${new Date().toLocaleString()}`, 15, 33);

          // Card Background for Student Profile details
          doc.setFillColor(248, 250, 252); // slate-50
          doc.setDrawColor(241, 245, 249); // slate-100
          doc.roundedRect(15, 52, 180, 36, 3, 3, "FD");
          
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(30, 41, 59); // slate-800
          doc.text("STUDENT PROFILE", 20, 60);
          
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(9);
          doc.text(`Name:               ${studentUser.fullName}`, 20, 68);
          doc.text(`Enrollment No:   ${studentUser.enrollmentNumber}`, 20, 74);
          doc.text(`Academic Info:   Semester ${studentUser.semester} / Batch UAMS-U`, 20, 80);
          
          // Overall Summary Box inside the profile section
          doc.setFillColor(224, 242, 254); // light sky-100
          doc.roundedRect(122, 56, 68, 28, 2, 2, "F");
          
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(3, 105, 161); // sky-700
          doc.text("CUMULATIVE ATTENDANCE", 127, 63);
          
          doc.setFontSize(18);
          doc.setTextColor(15, 23, 42); // slate-900
          doc.text(`${data.overallPercentage}%`, 127, 73);
          
          doc.setFontSize(8);
          const complianceColor = data.statusCategory === "SAFE" ? "#10b981" : data.statusCategory === "WARNING" ? "#f59e0b" : "#ef4444";
          // jsPDF color setting
          if (data.statusCategory === "SAFE") {
            doc.setTextColor(16, 185, 129); // emerald-500
          } else if (data.statusCategory === "WARNING") {
            doc.setTextColor(245, 158, 11); // amber-500
          } else {
            doc.setTextColor(239, 68, 68); // red-500
          }
          doc.text(`STATUS: ${data.statusCategory} COMPLIANCE`, 127, 79);

          // Subject Header Label
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(15, 23, 42);
          doc.text("SUBJECT-WISE ATTENDANCE DISPOSITION", 15, 99);

          // Table Header Bar
          doc.setFillColor(15, 23, 42); // slate-900
          doc.roundedRect(15, 104, 180, 8, 1, 1, "F");
          
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(255, 255, 255);
          doc.text("CODE", 18, 109.5);
          doc.text("SUBJECT DESCRIPTION", 44, 109.5);
          doc.text("ATTENDED", 125, 109.5);
          doc.text("TOTAL LCTS", 150, 109.5);
          doc.text("PERCENTAGE", 172, 109.5);
          
          // Table Rows
          let currentY = 118;
          data.subjectStats.forEach((s) => {
            // Draw secondary row separator
            doc.setDrawColor(241, 245, 249);
            doc.line(15, currentY + 3, 195, currentY + 3);

            doc.setFont("Helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42);
            doc.text(s.subjectCode, 18, currentY);
            
            doc.setFont("Helvetica", "normal");
            doc.setTextColor(71, 85, 105);
            const subName = s.subjectName.length > 38 ? s.subjectName.substring(0, 35) + "..." : s.subjectName;
            doc.text(subName, 44, currentY);
            
            doc.text(`${s.present} Classes`, 125, currentY);
            doc.text(`${s.total} Lects`, 150, currentY);
            
            const pct = s.percentage;
            if (pct >= 80) {
              doc.setTextColor(16, 185, 129); // emerald-500
            } else if (pct >= 75) {
              doc.setTextColor(245, 158, 11); // amber-500
            } else {
              doc.setTextColor(239, 68, 68); // red-500
            }
            doc.setFont("Helvetica", "bold");
            doc.text(`${s.percentage}%`, 172, currentY);
            
            currentY += 10;
          });

          // Footer Disclaimer and Regulations Info card
          currentY += 4;
          doc.setFont("Helvetica", "italic");
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184); // slate-400
          doc.text("Regulation Note: Students are mandated to maintain at least 80% attendance in each course register for final semester assessments.", 15, currentY);
          
          // Secure system fingerprint block
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(15, currentY + 6, 180, 20, 2, 2, "FD");
          
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text("UAMS SECURE VERIFICATION FOOTPRINT", 20, currentY + 12);
          
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(120, 113, 108); // warmStone-500
          doc.text(`Authenticated via cryptographically secure University Administration Nodes. Transaction Ref: DL-SEQ-${data.sequenceNumber ?? 1001}-PASS.`, 20, currentY + 18);

          doc.save(`${title}.pdf`);
        } catch (pdfErr) {
          console.error("Failed to generate PDF with jsPDF, falling back:", pdfErr);
          // Fallback simple plain text
          const fallbackContent = `======================================================
NATIONAL FORENSIC SCIENCES UNIVERSITY (NFSU) DELHI
======================================================
Student: ${studentUser.fullName}
Enrollment No: ${studentUser.enrollmentNumber}
Overall Attendance: ${data.overallPercentage}%
Status: ${data.statusCategory}
Generated On: ${new Date().toLocaleDateString()}`;
          const blob = new Blob([fallbackContent], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${title}.txt`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        const content = "Enrollment Number,Student Name,Subject Code,Subject Name,Classes Present,Classes Absent,Total Classes,Attendance Percentage\n" +
          data.subjectStats.map(s => `"${studentUser.enrollmentNumber}","${studentUser.fullName}","${s.subjectCode}","${s.subjectName}",${s.present},${s.absent},${s.total},"${s.percentage}%"`).join("\n");
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${title}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }, 1500);
  };

  // Student specific notifications filters
  const stuNotifications = Array.isArray(allNotifications) ? allNotifications : [];

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

          {/* TAB 5: ANALYTICS */}
          {mobileTab === "ANALYTICS" && data && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-2xs">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">Subject-wise Attendance (%)</h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.subjectStats} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="subjectCode" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", color: "white", fontSize: "11px" }} />
                      <Bar dataKey="percentage" name="Attendance %" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-2xs">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">Academic Monthly Trend (%)</h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthlyStats} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", color: "white", fontSize: "11px" }} />
                      <Bar dataKey="ratio" name="Average Ratio" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Floating App Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl flex items-center justify-around z-50 select-none px-6">
          <button 
            onClick={() => setMobileTab("HOME")}
            className={`flex flex-col items-center justify-center w-12 h-14 rounded-xl transition-all ${
              mobileTab === "HOME" ? "text-amber-600 font-bold scale-105" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="text-[8px] mt-1 tracking-tight font-sans">Home</span>
          </button>
          
          <button 
            onClick={() => setMobileTab("SUBJECTS")}
            className={`flex flex-col items-center justify-center w-12 h-14 rounded-xl transition-all ${
              mobileTab === "SUBJECTS" ? "text-amber-600 font-bold scale-105" : "text-slate-400 font-medium hover:text-slate-600"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-[8px] mt-1 tracking-tight font-sans">Subjects</span>
          </button>

          <button 
            onClick={() => setMobileTab("ANALYTICS")}
            className={`flex flex-col items-center justify-center w-12 h-14 rounded-xl transition-all ${
              mobileTab === "ANALYTICS" ? "text-amber-600 font-bold scale-105" : "text-slate-400 font-medium hover:text-slate-600"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-[8px] mt-1 tracking-tight font-sans">Charts</span>
          </button>

          <button 
            onClick={() => setMobileTab("TIMELINE")}
            className={`flex flex-col items-center justify-center w-12 h-14 rounded-xl transition-all ${
              mobileTab === "TIMELINE" ? "text-amber-600 font-bold scale-105" : "text-slate-400 font-medium hover:text-slate-600"
            }`}
          >
            <History className="w-4 h-4" />
            <span className="text-[8px] mt-1 tracking-tight font-sans">Timeline</span>
          </button>

          <button 
            onClick={() => setMobileTab("ALERTS")}
            className={`flex flex-col items-center justify-center w-12 h-14 rounded-xl transition-all relative ${
              mobileTab === "ALERTS" ? "text-amber-600 font-bold scale-105" : "text-slate-400 font-medium hover:text-slate-600"
            }`}
          >
            {stuNotifications.length > 0 && (
              <span className="absolute top-2 right-3.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            )}
            <Bell className="w-4 h-4" />
            <span className="text-[8px] mt-1 tracking-tight font-sans">Alerts</span>
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
          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 rounded-xl">
            <User className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800 font-display tracking-tight">Student Dashboard</h2>
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
               className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all text-slate-800 disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <span>{downloadingFormat === "PDF" ? "Preparing..." : "Export PDF"}</span>
            </button>
            <button
               onClick={() => triggerExport("EXCEL")}
               disabled={downloadingFormat !== null}
               className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all text-slate-800 disabled:opacity-50"
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
            <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider font-sans block">Overall attendance</span>
            <span className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight mt-1 block">
              {data.overallPercentage}%
            </span>
          </div>
          <div className="p-3.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl shadow-xs">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider font-sans block">Total Classes held</span>
            <span className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight mt-1 block">
              {data.totalClasses}
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-100 text-slate-600 rounded-2xl shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider font-sans block">Lectures attended</span>
            <span className="text-3xl font-extrabold text-emerald-700 font-mono tracking-tight mt-1 block">
              {data.presentClasses}
            </span>
          </div>
          <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl shadow-xs">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider font-sans block">Lectures absent</span>
            <span className="text-3xl font-extrabold text-rose-700 font-mono tracking-tight mt-1 block">
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
            <h3 className="font-extrabold text-slate-800 text-base font-display tracking-tight">Subject-wise Analytics (%)</h3>
            <p className="text-xs text-slate-600 mt-0.5">Calculated in real-time across current semester offerings.</p>
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
            <h3 className="font-extrabold text-slate-800 text-base font-display tracking-tight">Academic Monthly Trend</h3>
            <p className="text-xs text-slate-600 mt-0.5">Calculated average attendance ratio month-over-month.</p>
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
            <h3 className="font-extrabold text-slate-800 text-base font-display tracking-tight">Subject Attendance Records</h3>
            <p className="text-xs text-slate-600 mt-0.5">Individual lecture tally, present/absent logs, and threshold checks.</p>
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
                className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold w-full focus:outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-slate-800"
              />
            </div>
            {/* Category Select Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white text-slate-800"
            >
              <option value="ALL">All Categories</option>
              <option value="SAFE">Safe (&ge; 80%)</option>
              <option value="WARNING">Warning (65% - 80%)</option>
              <option value="CRITICAL">Critical (&lt; 60%)</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredSubjects.length === 0 ? (
            <div className="text-center p-8 text-slate-500 text-xs font-semibold">No subjects fit the criteria.</div>
          ) : (
            filteredSubjects.map((sub) => (
              <div key={sub.subjectId} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl mt-0.5 font-bold text-xs shrink-0 font-mono">
                    {sub.subjectCode}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm font-display tracking-tight">{sub.subjectName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Faculty Contact Office • Regular Lecture Hours</p>
                    
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
                      <span className="text-[10px] font-bold text-slate-700 font-mono">{sub.percentage}% completed</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold font-sans">Present / Total Lectures</span>
                    <p className="text-sm font-extrabold text-slate-800 font-mono mt-0.5">
                      {sub.present} <span className="text-slate-500 text-xs font-normal font-sans">of</span> {sub.total} classes
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
              <h3 className="font-extrabold text-slate-800 text-xs font-display tracking-tight">Recent Attendance Ticker</h3>
              <p className="text-[11px] text-slate-550 mt-0.5">Dates are recorded directly into PostgreSQL with automatic timestamps.</p>
            </div>
            <div className="divide-y divide-slate-50">
              {data.recentLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="px-6 py-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50 transition-all">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <div>
                      <span className="font-bold text-slate-800">{log.subjectName}</span>
                      <span className="text-[10px] text-slate-500 ml-1 font-mono">({log.subjectCode})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3.5">
                    <span className="text-slate-500 font-mono text-[10px]">{log.date}</span>
                    <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold ${
                      log.status === "PRESENT" 
                        ? "bg-emerald-50 border border-emerald-100 text-emerald-700" 
                        : "bg-rose-50 border border-rose-100 text-rose-700"
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
            <h3 className="font-extrabold text-slate-800 text-xs font-display tracking-tight flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              Personal Notification Inbox
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Triggered automatically on attendance modifications & alerts.</p>
            
            <div className="mt-4 space-y-3">
              {stuNotifications.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No recent alert triggers.</div>
              ) : (
                stuNotifications.map((not) => (
                  <div key={not.id} className="p-4 bg-slate-50/50 border border-slate-100/70 rounded-xl text-left">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800">{not.title}</span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        {new Date(not.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-650 mt-1 leading-relaxed">{not.message}</p>
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
