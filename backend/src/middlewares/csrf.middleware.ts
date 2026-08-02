import type { Request, Response, NextFunction } from 'express';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
export const CSRF_HEADER = 'x-csrf-token';

/**
 * Valide le jeton CSRF sur les mutations authentifiees par cookie. Une
 * requete anonyme (pas de req.session.user) traverse sans verification : le
 * 401 "non authentifie" doit rester la reponse (voir requireRole), pas un
 * 403 CSRF qui masquerait l'absence de session.
 */
export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATING_METHODS.has(req.method) || !req.session.user) {
    next();
    return;
  }

  const provided = req.headers[CSRF_HEADER];
  if (!req.session.csrfToken || provided !== req.session.csrfToken) {
    res.status(403).json({ error: 'csrf_invalid' });
    return;
  }

  next();
}
