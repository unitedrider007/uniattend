import { Request, Response, NextFunction } from "express";
import { pool } from "./dbPool.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "ADMIN" | "TEACHER" | "STUDENT" | "EXECUTIVE";
    targetId?: string | null;
  };
}

import crypto from "crypto";

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  // Check secure cookies solely for the authentication session ID
  if ((req as any).cookies) {
    token = (req as any).cookies["uams_session_id"];
  }

  if (!token) {
    return res.status(401).json({ message: "Authentication token is required." });
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const sessionRes = await pool.query(
      `SELECT s.*, u.email, u.target_id 
       FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [hashedToken]
    );

    if (sessionRes.rowCount === 0) {
      return res.status(401).json({ message: "Invalid session or logged out." });
    }

    const session = sessionRes.rows[0];

    // Check if session has expired
    if (session.expires_at && new Date() > new Date(session.expires_at)) {
      // Clean up expired session
      await pool.query("DELETE FROM user_sessions WHERE id = $1", [hashedToken]);
      const sameSiteConfig = process.env.NODE_ENV === "production" ? "lax" : "none";
      res.clearCookie("uams_session_id", { httpOnly: true, secure: true, sameSite: sameSiteConfig });
      res.clearCookie("uams_access_token", { httpOnly: true, secure: true, sameSite: sameSiteConfig });
      res.clearCookie("uams_refresh_token", { httpOnly: true, secure: true, sameSite: sameSiteConfig });
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    // Slide student session window (15-minute inactivity-based timeout)
    if (session.role === "STUDENT") {
      const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await pool.query("UPDATE user_sessions SET expires_at = $1 WHERE id = $2", [newExpiresAt, hashedToken]);
      
      const sameSiteConfig = process.env.NODE_ENV === "production" ? "lax" : "none";
      res.cookie("uams_session_id", token, {
        httpOnly: true,
        secure: true,
        sameSite: sameSiteConfig,
        maxAge: 15 * 60 * 1000
      });
    }

    req.user = {
      id: session.user_id,
      email: session.email,
      role: session.role as any,
      targetId: session.target_id
    };
    next();
  } catch (err) {
    console.error("Authentication check error:", err);
    return res.status(500).json({ message: "Database lookup failed during auth handshake." });
  }
}

export function authorize(roles: ("ADMIN" | "TEACHER" | "STUDENT" | "EXECUTIVE")[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied. Insufficient privileges to view this resource." });
    }
    next();
  };
}
