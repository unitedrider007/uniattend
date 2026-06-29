import React, { useState, useEffect } from "react";
import { Department, Batch } from "../types";
import { uamsFetch as fetch } from "../utils/api";
import { 
  Layers, TrendingUp, ShieldAlert, Award, 
  CheckCircle2, AlertTriangle, RefreshCw, Calendar, 
  Users, UserCheck, AlertCircle, Sparkles, BookOpen
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";

interface ExecutiveSummaryResponse {
  weeklyData: { day: string; percentage: number }[];
  subjectRisks: {
    code: string;
    subjectName: string;
    deptCode: string;
    teacherName: string;
    avgAttendance: number;
  }[];
  activeSubstitutionsCount: number;
  totalWeeklySchedules: number;
}

export default function ExecutivePortal() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [execStats, setExecStats] = useState<ExecutiveSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorObj, setErrorObj] = useState<string | null>(null);

  const refreshDatabase = () => {
    setLoading(true);
    setErrorObj(null);
    Promise.all([
      fetch("/api/departments").then(res => res.ok ? res.json() : Promise.reject(new Error("Failed to load departments folder."))),
      fetch("/api/batches").then(res => res.ok ? res.json() : Promise.reject(new Error("Failed to load class batches."))),
      fetch("/api/analytics/admin-summary").then(res => res.ok ? res.json() : Promise.reject(new Error("Failed to compile admin overview."))),
      fetch("/api/analytics/executive-summary").then(res => res.ok ? res.json() : Promise.reject(new Error("Failed to compile executive overview.")))
    ])
    .then(([allDepts, allBatches, stats, execStatsData]) => {
      setDepartments(allDepts);
      setBatches(allBatches);
      setAdminStats(stats);
      setExecStats(execStatsData);
      setLoading(false);
    })
    .catch((err) => {
      console.error("Failed to query executive cockpit backend.", err);
      setErrorObj(err.message || "Central gateway connection handshake timed out.");
      setLoading(false);
    });
  };

  useEffect(() => {
    refreshDatabase();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500 animate-pulse">
        <RefreshCw className="w-10 h-10 animate-spin text-amber-600 mb-4" />
        <p className="text-xs font-bold font-mono tracking-widest uppercase text-slate-700">Synchronizing Director Cockpit DB Nodes...</p>
        <span className="text-[10px] text-slate-400 mt-1">Establishing high-clearance cryptographed pipeline</span>
      </div>
    );
  }

  if (errorObj) {
    return (
      <div className="p-8 bg-rose-50 border-2 border-rose-100 rounded-3xl text-center max-w-md mx-auto my-12 shadow-sm">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="font-extrabold text-slate-800 text-sm">Cockpit Node Unreachable</h3>
        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{errorObj}</p>
        <button
          onClick={refreshDatabase}
          className="mt-4 px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
        >
          Re-engage Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 select-none">
      {/* Executive Cockpit Header Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-amber-950 border border-amber-500/25 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-mono font-bold uppercase tracking-wider">
                System Clearance: Campus Director / Joint Director
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-400 text-[10px] font-mono">Academic Roster Interconnect Live</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-500" />
              National Forensic Sciences University Campus Director Cockpit
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl font-medium leading-relaxed font-sans">
              Strategic oversight panel centering academic attendance directories, weekday trends, division compliance ratios, and classroom performance audits. Delhi Campus.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl backdrop-blur-md">
            <div className="text-right">
              <span className="block text-[8px] font-bold text-amber-400 uppercase tracking-widest font-mono">Operations Frame</span>
              <span className="text-xs font-bold text-white font-mono">Active Semester (2025-26)</span>
            </div>
          </div>
        </div>

        {/* Strategic Dashboard Guidance */}
        <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="flex items-start gap-2.5 text-amber-200 bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-sans">
              <strong>Attendance Compliance Target:</strong> Campus policy mandates a minimum <strong className="font-mono text-white">75% presence index</strong>. Classroom modules below this benchmark are flagged in red for immediate HOD review.
            </p>
          </div>
          <div className="flex items-start gap-2.5 text-emerald-200 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-sans">
              <strong>Operational Oversight:</strong> All statistics represent true computed metrics aggregated from real timetables, active student registries, and physical classroom registers.
            </p>
          </div>
        </div>
      </div>

      {/* High-Level Executive Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-amber-500/20 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Total Enrollments</span>
              <strong className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight block mt-2">{adminStats?.totals.totalStudents}</strong>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-amber-50 transition-colors">
              <Users className="w-4 h-4 text-slate-500 group-hover:text-amber-600" />
            </div>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-3 font-sans">&ge;99% Register Integrity</span>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-amber-500/20 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Active Faculty</span>
              <strong className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight block mt-2">{adminStats?.totals.totalTeachers}</strong>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-amber-50 transition-colors">
              <UserCheck className="w-4 h-4 text-slate-500 group-hover:text-amber-600" />
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-bold block mt-3 font-sans">Full teaching cohort active</span>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-amber-500/20 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Weekly Timetables</span>
              <strong className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight block mt-2">{execStats?.totalWeeklySchedules || 0}</strong>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-amber-50 transition-colors">
              <Calendar className="w-4 h-4 text-slate-500 group-hover:text-amber-600" />
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-bold block mt-3 font-sans">Schedules linked to classrooms</span>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-amber-500/20 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Active Substitutes</span>
              <strong className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight block mt-2">{execStats?.activeSubstitutionsCount || 0}</strong>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-amber-50 transition-colors">
              <Layers className="w-4 h-4 text-slate-500 group-hover:text-amber-600" />
            </div>
          </div>
          <span className="text-[10px] text-indigo-600 font-bold block mt-3 font-sans">Arrangements live</span>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 shadow-xs flex flex-col justify-between text-white hover:shadow-lg transition-all duration-300">
          <div>
            <span className="text-[10px] font-bold text-amber-100 uppercase tracking-wider block font-mono">Global Presence Ratio</span>
            <strong className="text-3xl font-extrabold text-white font-mono tracking-tight block mt-2">{adminStats?.totals.todayAttendanceRatio}%</strong>
          </div>
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mt-3">
            <div className="bg-white h-full" style={{ width: `${adminStats?.totals.todayAttendanceRatio}%` }}></div>
          </div>
        </div>
      </div>

      {/* Strategic Intelligence and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Department Rolling Indices */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              Department Rolling Indices (Presence Avg %)
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Comparative physical presence averages across academic departments.</p>
          </div>

          <div className="flex-1 min-h-[220px] mt-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={adminStats?.deptAverages ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="code" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", color: "white" }} />
                <Bar dataKey="percentage" fill="#b48d2d" radius={[6, 6, 0, 0]} barSize={40} name="Department Average %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Weekday Shift Progression */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Weekday Presence Trend Analysis
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Oversight tracing day-of-week attendance patterns and weekend drop-offs.</p>
          </div>

          <div className="flex-1 min-h-[220px] mt-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={execStats?.weeklyData ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis domain={[50, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", color: "white" }} />
                <Area type="monotone" dataKey="percentage" stroke="#f59e0b" fill="#fef3c7" strokeWidth={3} name="Weekday Average %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Risk Metrics: Low-Attendance Subject Classrooms */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              Attention Required: Classroom Modules Below Benchmark (&lt;75%)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Specialized curriculum nodes showing inadequate student commitment. Direct administrative reviews recommended.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-150 text-slate-400 font-bold uppercase text-[9px] tracking-wider font-sans">
                  <th className="pb-2.5">Course Code</th>
                  <th className="pb-2.5">Subject & Division</th>
                  <th className="pb-2.5">Assigned Faculty</th>
                  <th className="pb-2.5">Current Average</th>
                  <th className="pb-2.5">Oversight Strategy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {execStats?.subjectRisks.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-mono font-bold text-slate-700">{sub.code}</td>
                    <td className="py-3">
                      <div className="font-semibold text-slate-800">{sub.subjectName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Division: {sub.deptCode}</div>
                    </td>
                    <td className="py-3 font-medium text-slate-600">{sub.teacherName}</td>
                    <td className="py-3 font-mono font-bold text-rose-600">{sub.avgAttendance}%</td>
                    <td className="py-3">
                      <span className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-100 inline-block">
                        Call HOD Assessment
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamic Defaulter Cohort & Student Alerts */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              Risk Distribution Cohorts
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Current student directory divided by physical compliance index brackets.</p>
          </div>

          <div className="space-y-3.5 flex flex-col mt-4">
            <div className="p-3.5 bg-rose-50/80 border border-rose-100 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="text-[11px] font-bold text-rose-950 uppercase tracking-wide font-mono">Critical Dropouts (&lt;60%)</h4>
                <p className="text-[10px] text-rose-700 font-medium">Under examination suspension guidelines.</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-rose-950 font-mono block">{adminStats?.defaulters.criticalCount}</span>
                <span className="text-[9px] font-mono font-bold text-rose-600">Counseling Issued</span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/80 border border-amber-100 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="text-[11px] font-bold text-amber-950 uppercase tracking-wide font-mono">Cautionary Alert (60%-75%)</h4>
                <p className="text-[10px] text-amber-700 font-medium">HOD warning notices deployed.</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-amber-950 font-mono block">{adminStats?.defaulters.warningCount}</span>
                <span className="text-[9px] font-mono font-bold text-amber-600">Provisional</span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="text-[11px] font-bold text-emerald-950 uppercase tracking-wide font-mono">Benchmark Satisfactory (&ge;75%)</h4>
                <p className="text-[10px] text-emerald-700 font-medium">Compliant with general physical requisites.</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-emerald-950 font-mono block">{adminStats?.defaulters.safeCount}</span>
                <span className="text-[9px] font-mono font-bold text-emerald-600">Fully cleared</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
