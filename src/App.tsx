import React, { useState } from "react";
import { 
  Shield, Calendar, GraduationCap, CheckCircle,
  AlertOctagon, BookOpen, Lock, ArrowRight, Download 
} from "lucide-react";

// Context & Hooks
import { AuthProvider, useAuth } from "./context/AuthContext";

// Pages & Layout
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Services
import { authService } from "./services/authService";

// Utilities
import { performRobustAuthCleanup } from "./utils/authCleanup";

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

function AppContent() {
  const { 
    currentUser, 
    setCurrentUser, 
    bootState, 
    bootError, 
    isLoggingIn, 
    performStartupHandshake,
    handleSignOut
  } = useAuth();

  // Password Policy States (Local to this interceptor view)
  const [currentPassForm, setCurrentPassForm] = useState("");
  const [newPassForm, setNewPassForm] = useState("");
  const [confirmPassForm, setConfirmPassForm] = useState("");
  const [changePassError, setChangePassError] = useState("");
  const [changePassSuccess, setChangePassSuccess] = useState("");

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

    authService.changePassword(currentPassForm, newPassForm)
    .then(() => {
      setChangePassSuccess("Password updated successfully. Access level fully granted!");
      setChangePassError("");
      if (currentUser) {
        const updatedUser = { ...currentUser, mustChangePassword: false };
        setCurrentUser(updatedUser);
        localStorage.setItem("uams_user", JSON.stringify(updatedUser));
      }
      setCurrentPassForm("");
      setNewPassForm("");
      setConfirmPassForm("");
    })
    .catch((err) => {
      setChangePassError(err.message || "Failed to update credentials.");
      setChangePassSuccess("");
    });
  };

  // Rendering standard loading sequences
  if (bootState !== "ready") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center text-slate-800 select-none font-sans">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-xl flex flex-col items-center text-center animate-fade-in relative backdrop-blur-md">
          
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#b48d2d] rounded-t-3xl"></div>

          <div className="relative flex items-center justify-center mb-6 mt-2">
            <div className="absolute inset-0 rounded-full bg-amber-500/5 animate-ping"></div>
            <div className="relative p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-xs">
              {bootState === "booting" && (
                <BookOpen className="w-10 h-10 text-amber-600 animate-pulse" />
              )}
              {bootState === "re-authenticating" && (
                <Shield className="w-10 h-10 text-amber-600 animate-bounce" />
              )}
              {bootState === "fetching_catalogs" && (
                <GraduationCap className="w-10 h-10 text-amber-600 animate-pulse" />
              )}
              {bootState === "error" && (
                <AlertOctagon className="w-10 h-10 text-rose-500" />
              )}
            </div>
          </div>

          <p className="text-[10px] font-bold text-[#b48d2d] font-mono tracking-widest uppercase mb-1.5">
            {bootState === "booting" && "Gateway Boot Sequence"}
            {bootState === "re-authenticating" && "SSO Security Handshake"}
            {bootState === "fetching_catalogs" && "Data Catalog Synced"}
            {bootState === "error" && "Gateway Session Error"}
          </p>

          <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">
            {bootState === "booting" && "Initializing Gatekeeper..."}
            {bootState === "re-authenticating" && "Verifying Credentials..."}
            {bootState === "fetching_catalogs" && "Caching Central Directory..."}
            {bootState === "error" && "Sign-In Handshake Failed"}
          </h4>

          <p className="text-slate-500 text-xs mt-2.5 leading-relaxed max-w-xs font-sans">
            {bootState === "booting" && "Reading localized security credentials and preparing secure runtime environment..."}
            {bootState === "re-authenticating" && "Re-authenticating cryptographically signed session keys with the University Central Directory..."}
            {bootState === "fetching_catalogs" && "Handshaking with scholastic databases to query core enrollment details and classroom profiles..."}
            {bootState === "error" && (bootError || "The Delhi campus network nodes are currently stagnant or unreachable. HANDSHAKE_TIMEOUT.")}
          </p>

          {bootState !== "error" ? (
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-6 relative">
              <div 
                className="bg-amber-600 h-full rounded-full transition-all duration-700 ease-in-out" 
                style={{ 
                  width: 
                    bootState === "booting" ? "25%" :
                    bootState === "re-authenticating" ? "60%" :
                    bootState === "fetching_catalogs" ? "95%" : "10%"
                }}
              ></div>
            </div>
          ) : (
            <div className="w-full space-y-2 mt-6">
              <button
                onClick={() => performStartupHandshake()}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs tracking-wide transition-all shadow-md select-none cursor-pointer"
              >
                Retry Connection Handshake
              </button>
              <button
                onClick={() => {
                  performRobustAuthCleanup();
                  setCurrentUser(null);
                  window.location.reload();
                }}
                className="w-full py-2 px-4 bg-transparent hover:bg-slate-50 text-slate-500 font-bold rounded-xl text-[10.5px] tracking-wide transition-all uppercase cursor-pointer"
              >
                Force Gatekeeper Clean Exit
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Not signed-in yet
  if (!currentUser) {
    return <DashboardLayout><LoginPage /></DashboardLayout>;
  }

  // Mandatory Reset Creds flow active
  if (currentUser.mustChangePassword) {
    return (
      <DashboardLayout>
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
      </DashboardLayout>
    );
  }

  // Standard roles dashboard router
  return (
    <DashboardLayout>
      {currentUser.role === "ADMIN" && (
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminDashboard />
        </ProtectedRoute>
      )}
      {currentUser.role === "EXECUTIVE" && (
        <ProtectedRoute allowedRoles={["EXECUTIVE"]}>
          <ExecutiveDashboard />
        </ProtectedRoute>
      )}
      {currentUser.role === "TEACHER" && (
        <ProtectedRoute allowedRoles={["TEACHER"]}>
          <TeacherDashboard />
        </ProtectedRoute>
      )}
      {currentUser.role === "STUDENT" && (
        <ProtectedRoute allowedRoles={["STUDENT"]}>
          <StudentDashboard />
        </ProtectedRoute>
      )}

      {/* Gateway Handshake Loading Overlays */}
      {isLoggingIn && (
        <div id="uams-sso-gateway-handshake" className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-md transition-all duration-300">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center text-center animate-fade-in">
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 rounded-full bg-[#1b305a]/5 animate-ping"></div>
              <div className="relative p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-md">
                <img src="/nfsu-logo.png" alt="NFSU Logo" className="w-16 h-16 object-contain" />
              </div>
            </div>
            <p className="text-[9.5px] font-bold text-[#b48d2d] font-mono tracking-widest uppercase mb-1">
              Gateway Handshake Secure
            </p>
            <h4 className="font-extrabold text-slate-800 text-sm">Authenticating Directory Access...</h4>
            <p className="text-slate-400 text-[11px] mt-2 leading-relaxed max-w-xs font-sans">
              Verifying security tokens with National Forensic Sciences University SSO and sealing a secure session. Please wait...
            </p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-6 relative">
              <div className="bg-[#b48d2d] h-full rounded-full animate-pulse transition-all duration-500" style={{ width: "65%" }}></div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
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
