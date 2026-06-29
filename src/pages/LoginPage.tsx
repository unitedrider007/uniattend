import React, { useState } from "react";
import { Sparkles, CheckCircle, Phone, Download, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { 
    handleAuthSubmit, 
    errorLogin, 
    triggerApkReadmeDownload, 
    isMobileView 
  } = useAuth();

  const [emailForm, setEmailForm] = useState("");
  const [passwordForm, setPasswordForm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await handleAuthSubmit(emailForm, passwordForm);
    setLoading(false);
  };

  return (
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

          <form onSubmit={onSubmit} className="space-y-4.5 mt-6">
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
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#0f172a] hover:bg-[#1e293b] text-[#ffffff] transition-all text-xs font-extrabold rounded-xl shadow-md cursor-pointer mt-2 disabled:opacity-50"
            >
              <span>{loading ? "Signing in..." : "Secure Gateway Login"}</span>
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
  );
}
