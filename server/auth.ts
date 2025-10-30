import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { User, UserRole } from "@shared/schema";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT payload interface
interface JWTPayload {
  userId: string;
  username: string;
  roles: UserRole[];
}

// Generate access token
export function generateAccessToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    roles: user.roles ? JSON.parse(user.roles) : [],
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

// Generate refresh token
export function generateRefreshToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    roles: user.roles ? JSON.parse(user.roles) : [],
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
}

// Verify token
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

// Extend Express Request with user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Authentication middleware
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: "Token de autenticação não fornecido",
    });
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: "Token expirado",
        code: "TOKEN_EXPIRED",
      });
    }

    return res.status(403).json({
      error: "Token inválido",
    });
  }
}

// Authorization middleware factory
export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Usuário não autenticado",
      });
    }

    const userRoles = req.user.roles;
    const hasPermission = allowedRoles.some((role) =>
      userRoles.includes(role)
    );

    // Superadmin always has access
    if (userRoles.includes("superadmin")) {
      return next();
    }

    if (!hasPermission) {
      return res.status(403).json({
        error: "Acesso negado. Permissões insuficientes.",
        requiredRoles: allowedRoles,
        userRoles: userRoles,
      });
    }

    next();
  };
}

// Optional authentication middleware (doesn't fail if no token)
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next();
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
  } catch (error) {
    // Silently fail, continue without user
  }

  next();
}
