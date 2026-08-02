import type { Request, Response, NextFunction } from 'express';

export type Role = 'gestionnaire' | 'lecteur' | 'etudiant' | 'entreprise';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth: {
        /** false uniquement en l'absence totale de session (401 attendu sur les routes protegees). */
        authenticated: boolean;
        /** Role Microsoft verifie ; jamais modifie par une incarnation. */
        baseRole: Role | null;
        /** Role utilise par les autorisations : egal a baseRole hors incarnation gestionnaire active. */
        role: Role | null;
        entityId: number | null;
      };
    }
  }
}

/**
 * Construit req.auth exclusivement depuis la session serveur (jalon 4) :
 * les headers x-role/x-entity-id du selecteur historique ne sont plus lus
 * ici et n'ont donc plus aucune influence sur les autorisations.
 */
export function authContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const user = req.session.user;

  if (!user) {
    req.auth = { authenticated: false, baseRole: null, role: null, entityId: null };
    next();
    return;
  }

  // Un etudiant authentifie mais absent du referentiel n'obtient aucun role
  // metier (ni son role de base, ni un repli lecteur) : voir spec. baseRole
  // reste expose pour l'affichage frontend du blocage.
  if (user.status === 'student_not_imported') {
    req.auth = { authenticated: true, baseRole: user.baseRole, role: null, entityId: null };
    next();
    return;
  }

  const impersonation = req.session.impersonation;
  const isImpersonating = Boolean(impersonation) && user.baseRole === 'gestionnaire';
  const role: Role = isImpersonating
    ? impersonation!.kind === 'student' ? 'etudiant' : 'entreprise'
    : user.baseRole;
  const entityId: number | null = isImpersonating ? impersonation!.entityId : user.entityId;

  req.auth = { authenticated: true, baseRole: user.baseRole, role, entityId };
  next();
}
