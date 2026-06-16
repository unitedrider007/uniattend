import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_123456789_!@#$";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "ADMIN" | "TEACHER" | "STUDENT";
    targetId?: string | null;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];

  // If no auth header was present, check secure cookies
  if (!token && (req as any).cookies) {
    token = (req as any).cookies["uams_access_token"];
  }

  if (!token) {
    return res.status(401).json({ message: "Authentication token is required." });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decodedUser: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired access token." });
    }
    req.user = {
      id: decodedUser.userId || decodedUser.id || "",
      email: decodedUser.email || "",
      role: decodedUser.role || "STUDENT",
      targetId: decodedUser.targetId || null
    };
    next();
  });
}

export function authorize(roles: ("ADMIN" | "TEACHER" | "STUDENT")[]) {
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
