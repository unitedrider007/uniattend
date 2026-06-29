import React, { useState } from "react";
import { LogOut, AlertOctagon } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { currentUser, handleSignOut, isMobileView } = useAuth();
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  return (
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
        {children}
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
  );
}
