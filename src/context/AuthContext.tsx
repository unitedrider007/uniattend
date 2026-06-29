import React, { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { User, Teacher, Student } from "../types";
import { authService } from "../services/authService";
import { adminService } from "../services/adminService";
import { studentService } from "../services/studentService";
import { uamsFetch } from "../utils/api";
import { performRobustAuthCleanup } from "../utils/authCleanup";

export type BootState = 'booting' | 're-authenticating' | 'fetching_catalogs' | 'ready' | 'error';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  bootState: BootState;
  bootError: string;
  isLoggingIn: boolean;
  errorLogin: string;
  setErrorLogin: (e: string) => void;
  notificationsList: any[];
  setNotificationsList: React.Dispatch<React.SetStateAction<any[]>>;
  isMobileView: boolean;
  
  handleAuthSubmit: (emailForm: string, passwordForm: string) => Promise<void>;
  handleSignOut: () => void;
  performStartupHandshake: () => Promise<void>;
  triggerApkReadmeDownload: (role: "STUDENT" | "TEACHER") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [bootState, setBootState] = useState<BootState>('booting');

  const [bootError, setBootError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorLogin, setErrorLogin] = useState("");
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);



  const performStartupHandshake = async () => {
    const savedUser = localStorage.getItem("uams_user");

    if (!savedUser) {
      setBootState('ready');
      return;
    }

    setBootState('re-authenticating');
    setBootError("");

    try {
      const res = await authService.refresh();

      if (res.ok) {
        const body = await res.json();
        if (body.user) {
          localStorage.setItem("uams_user", JSON.stringify(body.user));
          setCurrentUser(body.user);
        }
        setBootState('ready');
      } else if (res.status === 401 || res.status === 403) {
        console.warn("Stored session expired. Re-routing back to secure login.");
        performRobustAuthCleanup();
        setCurrentUser(null);
        setBootState('ready');
      } else {
        throw new Error(`SSO Gateway system issue (code ${res.status}).`);
      }
    } catch (err: any) {
      console.error("Gateway session handshake failed:", err);
      setBootError(err.message || "SSO network handshake failed. Please check your connection.");
      setBootState('error');
    }
  };

  useEffect(() => {
    performStartupHandshake();
  }, []);



  useEffect(() => {
    if (currentUser) {
      studentService.getNotifications(currentUser.id)
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

  useEffect(() => {
    const handleUnauthorized = () => {
      handleSignOut();
    };
    window.addEventListener("uams-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("uams-unauthorized", handleUnauthorized);
  }, []);

  // Client-side student inactivity tracker (15 minutes timeout)
  useEffect(() => {
    if (!currentUser || currentUser.role !== "STUDENT") return;

    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.warn("Student session idle for 15 minutes. Automatically logging out.");
        handleSignOut();
      }, 15 * 60 * 1000); // 15 minutes
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [currentUser]);

  const handleAuthSubmit = async (emailForm: string, passwordForm: string) => {
    setErrorLogin("");
    setIsLoggingIn(true);
    try {
      const body = await authService.login(emailForm, passwordForm);
      setCurrentUser(body.user);
      setErrorLogin("");
    } catch (err: any) {
      setErrorLogin(err.message || "Central Directory SSO authentication handshake failed.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = () => {
    uamsFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    performRobustAuthCleanup();
    setCurrentUser(null);
    setErrorLogin("");
  };

  const triggerApkReadmeDownload = (role: "STUDENT" | "TEACHER") => {
    const readmeName = `NFSU_UAMS_${role === "STUDENT" ? "Student" : "Teacher"}_v1.0.4_Readme.txt`;
    const apkName = `NFSU_UAMS_${role === "STUDENT" ? "Student" : "Teacher"}_v1.0.4.apk`;
    const configReadme = `========================================================================
NATIONAL FORENSIC SCIENCES UNIVERSITY (NFSU) DELHI
Official Client APK Installation & Configuration Guide
========================================================================

Target App Package: ${apkName}
Client Platform   : Google Android (SDK 26+ / Android 8.0 Oreo to Android 15)
Build Release     : Release Production - Enterprise Signed
API Service Target: Node Express API Proxy Server / Spring Boot Controller

------------------------------------------------------------------------
INSTALLATION GUIDE FOR MOBILE USERS:
------------------------------------------------------------------------
1. Download or transfer the official app package '${apkName}' to your Android Smartphone storage.
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
    link.download = readmeName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      setCurrentUser,
      bootState,
      bootError,
      isLoggingIn,
      errorLogin,
      setErrorLogin,
      notificationsList,
      setNotificationsList,
      isMobileView,
      
      handleAuthSubmit,
      handleSignOut,
      performStartupHandshake,
      triggerApkReadmeDownload
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
