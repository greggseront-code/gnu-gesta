import type { Request, Response, NextFunction } from 'express';
import type { Role } from './auth-context.middleware';

type Handler = (req: Request, res: Response, next: NextFunction) => void;

const NOT_AUTHENTICATED = { error: 'not_authenticated' };
const DENIED = { error: 'Accès refusé' };

export function requireRole(...roles: Role[]): Handler {
  return (req, res, next) => {
    if (!req.auth.authenticated) {
      res.status(401).json(NOT_AUTHENTICATED);
      return;
    }
    if (!req.auth.role || !roles.includes(req.auth.role)) {
      res.status(403).json(DENIED);
      return;
    }
    next();
  };
}

export const requireAnyRole = requireRole;

/** For entreprise role: verifies req.params[param] === req.auth.entityId. Other roles pass through. */
export function requireEntityOwnership(param = 'id'): Handler {
  return (req, res, next) => {
    if (req.auth.role === 'entreprise') {
      const resourceId = Number(req.params[param]);
      if (req.auth.entityId !== resourceId) {
        res.status(403).json(DENIED);
        return;
      }
    }
    next();
  };
}

/** Blocks POST/PATCH/PUT/DELETE for lecteur and unauthenticated users. Apply at router level. */
export function requireReadOnly(): Handler {
  return (req, res, next) => {
    const isWrite = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);
    if (!isWrite) {
      next();
      return;
    }
    if (!req.auth.authenticated) {
      res.status(401).json(NOT_AUTHENTICATED);
      return;
    }
    if (!req.auth.role || req.auth.role === 'lecteur') {
      res.status(403).json(DENIED);
      return;
    }
    next();
  };
}
