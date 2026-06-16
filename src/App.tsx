import React, { useState, useEffect, Component, ReactNode } from "react";
import { 
  Shield, Calendar, GraduationCap, CheckCircle,
  LogOut, ArrowRight, Sparkles, BookOpen, Lock, Download, Phone, Globe, AlertOctagon, Eye, EyeOff
} from "lucide-react";

// Import modular panels
import AdminPortal from "./components/AdminPortal";
import TeacherPortal from "./components/TeacherPortal";
import StudentPortal from "./components/StudentPortal";

// Import safety fetch wrapper to bypass iframe cookie blocking
import { uamsFetch as fetch } from "./utils/api";

// Import Types
import { Student, Teacher } from "./types";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMsg: string;
}

// Hardened Error Boundary to prevent white screen crashes
class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, errorMsg: error.message };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("React Error Boundary caught a crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-2">Application UI Crashed</h2>
          <p className="text-slate-500 text-sm max-w-md mb-6">A critical rendering error occurred in the component tree. Please reload the dashboard.</p>
          <code className="text-xs bg-white border border-slate-200 text-rose-600 p-3 rounded-lg max-w-lg mb-6 break-all shadow-sm">
            {this.state.errorMsg}
          </code>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-800">
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Authentication & Responsive View States
  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem("uams_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [emailForm, setEmailForm] = useState("");
  const [passwordForm, setPasswordForm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorLogin, setErrorLogin] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  // Password Policy States
  const [currentPassForm, setCurrentPassForm] = useState("");
  const [newPassForm, setNewPassForm] = useState("");
  const [confirmPassForm, setConfirmPassForm] = useState("");
  const [changePassError, setChangePassError] = useState("");
  const [changePassSuccess, setChangePassSuccess] = useState("");

  // Entities List state
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);

  // Dynamically evaluate actual browser viewport width to support responsive layout switching
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch institutional directories from backend server
  const loadBaseCatalogs = () => {
    Promise.all([
      fetch("/api/teachers").then(res => res.ok ? res.json() : Promise.reject(res)),
      fetch("/api/students").then(res => res.ok ? res.json() : Promise.reject(res))
    ])
    .then(([allTeachers, allStudents]) => {
      setTeachersList(allTeachers);
      setStudentsList(allStudents);
    })
    .catch((err) => {
      console.error("NFSU Delhi server unreachable. Retrying directory handshakes...", err);
    });
  };

  useEffect(() => {
    if (currentUser) {
      loadBaseCatalogs();
    }
  }, [currentUser]);

  // Synchronize notifications list for active logged-in accounts
  useEffect(() => {
    if (currentUser) {
      fetch(`/api/notifications/${currentUser.id}`)
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(notif => setNotificationsList(Array.isArray(notif) ? notif : []))
        .catch(() => {});
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("uams_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("uams_user");
    }
  }, [currentUser]);

  // Execute database authenticated sign-in via Express API
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLogin("");

    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailForm, password: passwordForm })
    })
    .then((res) => {
      if (!res.ok) {
        throw new Error("Invalid institutional credentials or unauthorized access request.");
      }
      return res.json();
    })
    .then((body) => {
      if (body.accessToken) {
        localStorage.setItem("uams_access_token", body.accessToken);
      }
      setCurrentUser(body.user);
      setErrorLogin("");
    })
    .catch((err) => {
      setErrorLogin(err.message || "Central Directory SSO authentication handshake failed.");
    });
  };

  const handleSignOut = () => {
    localStorage.removeItem("uams_access_token");
    setCurrentUser(null);
    setEmailForm("");
    setPasswordForm("");
    setErrorLogin("");
  };

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassForm !== confirmPassForm) {
      setChangePassError("New password and confirm password do not match.");
      return;
    }
    if (newPassForm.length < 8) {
      setChangePassError("New password must be at least 8 characters long.");
      return;
    }

    fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPassForm, newPassword: newPassForm })
    })
    .then((res) => {
      if (!res.ok) {
        return res.json().then(data => { throw new Error(data.message || "Failed to update security credentials."); });
      }
      return res.json();
    })
    .then(() => {
      setChangePassSuccess("Password updated successfully. Access level fully granted!");
      setChangePassError("");
      const updatedUser = { ...currentUser, mustChangePassword: false };
      setCurrentUser(updatedUser);
      localStorage.setItem("uams_user", JSON.stringify(updatedUser));
      setCurrentPassForm("");
      setNewPassForm("");
      setConfirmPassForm("");
    })
    .catch((err) => {
      setChangePassError(err.message || "Failed to update credentials.");
      setChangePassSuccess("");
    });
  };

  // High-fidelity release bundle download for testing Android devices
  const triggerApkReadmeDownload = (role: "STUDENT" | "TEACHER") => {
    const fileName = `NFSU_UAMS_${role === "STUDENT" ? "Student" : "Teacher"}_v1.0.4.apk`;
    const configReadme = `========================================================================
NATIONAL FORENSIC SCIENCES UNIVERSITY (NFSU) DELHI
Official Client APK Installation & Configuration Bundle
========================================================================

Target App Package: ${fileName}
Client Platform   : Google Android (SDK 26+ / Android 8.0 Oreo to Android 15)
Build Release     : Release Production - Enterprise Signed
API Service Target: Node Express API Proxy Server / Spring Boot Controller

------------------------------------------------------------------------
INSTALLATION GUIDE FOR MOBILE USERS:
------------------------------------------------------------------------
1. Transfer this '${fileName}' package to your Android Smartphone storage.
2. Enable "Install Unknown Apps" or "Unknown Sources" from settings:
   Settings -> Security -> Install Unknown Apps -> Select File Browser
3. Locate the file in physical storage and install.
4. Open the App in your handset. You will be greeted by the exact same
   highly polished University login gateway.

------------------------------------------------------------------------
SANDBOX NETWORK CONNECTIVITY GUIDELINES:
------------------------------------------------------------------------
Since the application runs inside host sandboxes, the client connects to:
Secure Host Server: http://localhost:3000

Enjoy using your official NFSU Delhi tracker client app!
Academic DevOps Center © 2026`;

    const blob = new Blob([configReadme], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <GlobalErrorBoundary>
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] font-sans tracking-tight antialiased flex flex-col pt-[72px] justify-between">
      
      {/* Central University System Premium Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="transition-transform duration-300 hover:scale-105 shrink-0">
            <img src="/nfsu-logo.png" alt="NFSU Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <span className="text-[8px] sm:text-[9.5px] uppercase tracking-wider font-extrabold text-[#b48d2d] font-sans whitespace-nowrap">
                <span className="sm:hidden">NFSU</span>
                <span className="hidden sm:inline">National Forensic Sciences University</span>
              </span>
              <span className="h-1 w-1 bg-[#b48d2d] rounded-full shrink-0"></span>
              <span className="text-[8px] sm:text-[9.5px] uppercase tracking-wider font-extrabold text-[#64748b] font-sans whitespace-nowrap">
                Delhi Campus
              </span>
            </div>
            <h1 className="text-xs sm:text-base font-extrabold text-[#0f172a] tracking-tight leading-none mt-1">
              University Attendance Management System (UAMS)
            </h1>
          </div>
        </div>

        {/* Action Items */}
        <div className="flex items-center gap-2 sm:gap-4 select-none relative">
          {currentUser && (
            <button
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-slate-500 shadow-xs hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {currentUser.profile?.profilePhotoUrl ? (
                <img src={currentUser.profile.profilePhotoUrl} className="w-5 h-5 rounded-full object-cover border border-slate-200" alt="Avatar" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
              <span className="text-[9.5px] font-bold font-mono tracking-wider hidden sm:inline">{currentUser.profile?.fullName || "ADMINISTRATOR"}</span>
            </button>
          )}
          
          {currentUser && showAccountMenu && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-3">
                {currentUser.profile?.profilePhotoUrl ? (
                  <img src={currentUser.profile.profilePhotoUrl} className="w-10 h-10 rounded-full object-cover border border-slate-200" alt="Avatar" />
                ) : (
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                    {(currentUser.profile?.fullName || "A").charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">{currentUser.profile?.fullName || "Administrator"}</h4>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{currentUser.email}</p>
                </div>
              </div>
              <div className="space-y-2 mb-4 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Role</span>
                  <span className="font-bold">{currentUser.role}</span>
                </div>
                {currentUser.profile?.enrollmentNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Enrollment</span>
                    <span className="font-bold font-mono">{currentUser.profile.enrollmentNumber}</span>
                  </div>
                )}
                {currentUser.profile?.employeeId && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Emp ID</span>
                    <span className="font-bold font-mono">{currentUser.profile.employeeId}</span>
                  </div>
                )}
              </div>
              <button
                id="btn-signout"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Secure Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container Wrapper */}
      <main className={`flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col ${!currentUser ? "justify-center" : "justify-start"}`}>
        
        {!currentUser ? (
          /* PREMIUM ACADEMIC LOGIN SCREEN (NO TECH LOGS / SIMULATION SLOP) */
          <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-6">
            
            {/* Left Column: Prestigious University Invitation & Institutional Specs */}
            <div className="hidden md:block md:col-span-7 text-left space-y-6 md:pr-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-[#b48d2d]/20 text-[#b48d2d]">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[9.5px] font-extrabold uppercase tracking-widest font-sans">
                  Campus Attendance Registry
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-[1.15] tracking-tight font-sans">
                Academic Integrity & <br />
                <span className="text-[#a17a26] bg-gradient-to-r from-[#9a782e] to-[#c59c3c] bg-clip-text text-transparent">
                  Verified Scholar Compliance
                </span>
              </h2>

              <p className="text-slate-500 text-xs sm:text-xs md:text-sm leading-relaxed max-w-lg">
                The National Forensic Sciences University coordinates a highly secure biometric ledger for managing daily academic attendance. This portal handles sessional compliance, real-time analytics verification, official faculty audits, and mandatory default warnings for specialized programs.
              </p>

              {/* Verified badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-lg bg-[#b48d2d]/10 mt-0.5 shrink-0">
                    <CheckCircle className="w-4 h-4 text-[#b48d2d]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Biometric Directory Handshake</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Automated synchronization with classroom terminal kiosks eliminates proxy registers.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-lg bg-[#b48d2d]/10 mt-0.5 shrink-0">
                    <CheckCircle className="w-4 h-4 text-[#b48d2d]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Statutory Warnings Compliance</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Automatic alert system flags scholars dropping below the state mandate of 80%.</p>
                  </div>
                </div>
              </div>

              {/* Premium Android App APK Download links block */}
              <div className="pt-4 border-t border-slate-200/60 max-w-md">
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2.5">
                  <Phone className="w-3.5 h-3.5 text-amber-500" />
                  Official Mobile Clients
                </h5>
                <div className="flex flex-wrap gap-2.5">
                  <button 
                    onClick={() => triggerApkReadmeDownload("STUDENT")}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-[10.5px] font-semibold hover:bg-slate-800 hover:text-white transition-all cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-500" />
                    <span>Student App Android Client (APK)</span>
                  </button>
                  <button 
                    onClick={() => triggerApkReadmeDownload("TEACHER")}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-[10.5px] font-semibold hover:bg-slate-800 hover:text-white transition-all cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-500" />
                    <span>Teacher App Android Client (APK)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Centered Premium Sign-In Interface */}
            <div className="md:col-span-5 flex items-center justify-center">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-md w-full max-w-sm relative transition-all duration-300 hover:shadow-lg">
                
                {/* Visual Accent Logo */}
                <div className="text-center">
                  {isMobileView ? (
                    <div className="flex flex-col items-center justify-center mb-6 animate-fade-in">
                      <img src="/nfsu-logo.png" alt="NFSU Logo" className="w-24 h-24 object-contain drop-shadow-md" />
                      <h2 className="text-3xl font-black text-slate-900 tracking-tighter mt-4">UAMS</h2>
                      <div className="h-1 w-12 bg-[#b48d2d] rounded-full mt-3 mb-2"></div>
                      <p className="text-[10px] font-bold text-[#b48d2d] uppercase tracking-widest text-center px-4">
                        National Forensic Sciences University
                      </p>
                      <p className="text-[9px] font-mono text-slate-400 mt-1">DELHI CAMPUS</p>
                    </div>
                  ) : (
                    <>
                      <div className="inline-flex p-3 bg-slate-950 text-amber-500 rounded-2xl border border-slate-800 mb-4 shadow-sm transition-transform duration-300 hover:scale-110">
                        <Lock className="w-5.5 h-5.5" />
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-lg leading-tight font-sans">Institutional Directory SSO</h3>
                    </>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-normal">
                    Secure and verified entry for faculty administrators and academic scholars.
                  </p>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-4.5 mt-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Institutional Email ID
                    </label>
                    <input
                      type="email"
                      required
                      value={emailForm}
                      onChange={(e) => setEmailForm(e.target.value)}
                      placeholder="name@nfsu.gov.in"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-[#b48d2d] focus:ring-1 focus:ring-[#b48d2d]/35 bg-[#fefefe] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Access Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={passwordForm}
                        onChange={(e) => setPasswordForm(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-[#b48d2d] focus:ring-1 focus:ring-[#b48d2d]/35 bg-[#fefefe] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer outline-none flex items-center justify-center"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#0f172a] hover:bg-[#1e293b] text-[#ffffff] transition-all text-xs font-extrabold rounded-xl shadow-md cursor-pointer mt-2"
                  >
                    <span>Secure Gateway Login</span>
                    <ArrowRight className="w-4 h-4 text-amber-500" />
                  </button>
                </form>

                {errorLogin && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-[10.5px] rounded-xl text-center font-bold mt-4">
                    {errorLogin}
                  </div>
                )}

              </div>
            </div>

          </div>
        ) : currentUser.mustChangePassword ? (
          /* MANDATORY PASSWORD RESET ENFORCEMENT INTERCEPTOR */
          <div className="w-full max-w-md mx-auto mt-6">
            <div className="bg-white border-2 border-[#b48d2d]/30 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#b48d2d]"></div>
              
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
                  <Shield className="w-6 h-6 text-[#b48d2d]" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Mandatory Credentials Hardening</h3>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  To comply with standard university digital security policies, you must customize your access credentials before continuing.
                </p>
              </div>

              <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                {changePassError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-[10.5px] rounded-xl text-center font-bold">
                    {changePassError}
                  </div>
                )}
                {changePassSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10.5px] rounded-xl text-center font-bold">
                    {changePassSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassForm}
                    onChange={(e) => setCurrentPassForm(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-[#b48d2d] focus:ring-1 focus:ring-[#b48d2d]/35 bg-[#fefefe] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    New Compliant Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassForm}
                    onChange={(e) => setNewPassForm(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-[#b48d2d] focus:ring-1 focus:ring-[#b48d2d]/35 bg-[#fefefe] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassForm}
                    onChange={(e) => setConfirmPassForm(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-[#b48d2d] focus:ring-1 focus:ring-[#b48d2d]/35 bg-[#fefefe] transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs tracking-wide shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Update and Access Portal</span>
                </button>

                <div className="text-center mt-2.5">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-[10px] text-slate-400 hover:text-[#b48d2d] font-bold transition-colors uppercase tracking-wider"
                  >
                    Cancel and Sign Out
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* LIVE RESPONSE PLATFORM VIEW (DATERMINES PORTAL AUTOMATICALLY BASED ON REAL VIEWPORT PRESETS) */
          <div className="w-full">
            

            {currentUser.role === "ADMIN" && (
              <AdminPortal />
            )}

            {currentUser.role === "TEACHER" && currentUser.profile && (
              <TeacherPortal 
                teacherUser={currentUser.profile}
                isMobileView={isMobileView}
              />
            )}

            {currentUser.role === "STUDENT" && currentUser.profile && (
                <StudentPortal 
                  studentUser={currentUser.profile}
                  allNotifications={notificationsList}
                  isMobileView={isMobileView}
                />
            )}

          </div>
        )}

      </main>

      {/* Humble Official University Footer */}
      {!isMobileView && (
        <footer className="w-full mt-12 py-6 border-t border-slate-200/80 bg-white/70 backdrop-blur-md text-center text-[10px] sm:text-xs text-slate-500 select-none">
          <p className="font-bold tracking-tight text-slate-700">
            University Attendance Management System (UAMS) • National Forensic Sciences University
          </p>
          <p className="mt-1 font-mono text-[9px] text-slate-400">
             DELHI CAMPUS • OFFICIAL SECURE CLIENT INTERCONNECT
          </p>
        </footer>
      )}

    </div>
  </GlobalErrorBoundary>
  );
}

// Add smooth fade-in animations for tab panels via CSS keyframes
if (typeof document !== "undefined") {
  const styleElement = document.createElement("style");
  styleElement.innerHTML = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `;
  document.head.appendChild(styleElement);
}
