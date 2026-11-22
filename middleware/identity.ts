import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from './role.js';

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
}

// Makes req.user typed on every Express Request in this service.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const SECRET = process.env.INTERNAL_JWT_SECRET;
if (!SECRET) throw new Error('INTERNAL_JWT_SECRET is not set');

const AUDIENCE = 'docker';

/// Requires all requests to carry a valid identity from the gateway
export function identity(req: Request, res: Response, next: NextFunction) {
  const token = req.get('x-internal-auth');
  if (!token) return res.status(401).json({ message: 'Missing identity' });

  try {
    const p = jwt.verify(token, SECRET as string, {
      algorithms: ['HS256'],
      audience: AUDIENCE,
      issuer: 'gateway',
    }) as jwt.JwtPayload;

    req.user = { id: p.id, email: p.email, role: p.role as Role };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid identity' });
  }
}

/// Requires exactly this role
export const requireRole =
  (role: Role) => (req: Request, res: Response, next: NextFunction) =>
    req.user?.role === role
      ? next()
      : res.status(403).json({ message: 'Forbidden' });

/// Requires this role or higher (roles are ordered by privilege)
export const requireMinRole =
  (min: Role) => (req: Request, res: Response, next: NextFunction) =>
    req.user !== undefined && req.user.role >= min
      ? next()
      : res.status(403).json({ message: 'Forbidden' });

/// Shortcut for the common admin check
export const requireAdmin = requireRole(Role.ADMIN);
