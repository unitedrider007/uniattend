import React from "react";
import { useAuth } from "../hooks/useAuth";
import { ShieldAlert, LogOut, RefreshCw } from "lucide-react";

interface ProtectedRouteProps {
  allowedRoles: ("ADMIN" | "EXECUTIVE" | "TEACHER" | "STUDENT")[];
  children: React.ReactNode;
}

export function ForbiddenPage() {
  const { currentUser, handleSignOut } = useAuth();
  
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none font-sans animate-fade-in">
      <div className="bg-white border border-slate-200/85 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-xl flex flex-col items-center text-center relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600 rounded-t-3xl"></div>
        <div className="relative p-4 bg-rose-50 rounded-2xl border border-rose-100 shadow-xs mb-5">
          <ShieldAlert className="w-10 h-10 text-rose-600 animate-pulse" />
        </div>
        
        <span className="text-[10px] font-bold text-rose-600 font-mono tracking-widest uppercase mb-1">
          Access Denied (403)
        </span>
        <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">
          Forbidden Clearance Level
        </h4>
        <p className="text-slate-505 text-xs text-slate-500 mt-2.5 leading-relaxed font-sans max-w-xs">
          Your active security role <strong className="font-mono text-rose-600 bg-rose-50 px-1 py-0.5 rounded text-[10px]">{currentUser?.role || "GUEST"}</strong> is not authorized to cross this security gate. Authenticate with an eligible privilege level.
        </p>

        <div className="w-full space-y-2 mt-6 font-sans">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs tracking-wide transition-all shadow-md select-none cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload Portal Dashboard
          </button>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-rose-100 hover:bg-rose-50/50 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out and Re-login</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    // Falls back to login rendering in App.tsx (if no session found)
    return null;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
