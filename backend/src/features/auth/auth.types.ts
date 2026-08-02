/** Claims Microsoft retenus apres l'appel Graph /me, sans jeton. */
export interface EntraProfile {
  /** Object id Microsoft (`id` sur la ressource Graph User) : partie immuable de l'identite avec le tenant id. */
  oid: string;
  userPrincipalName: string;
  mail: string | null;
  displayName: string;
}

/** Resultat de l'echange de code, avant l'appel Graph. */
export interface AcquiredEntraToken {
  accessToken: string;
  tenantId: string;
  /** Handle opaque transmis a EntraAuthProvider.clearCache() ; ne pas interpreter hors du client Entra. */
  cacheHandle: unknown;
}

/** Etat temporaire de la demande de connexion, conserve dans la session. */
export interface PendingAuthState {
  state: string;
  nonce: string;
  codeVerifier: string;
}

/** Rôle de base calcule a chaque connexion a partir de l'identite Microsoft verifiee. */
export type BaseRole = 'gestionnaire' | 'etudiant' | 'lecteur';

/** Statut d'un compte etudiant vis-a-vis du referentiel `students`. */
export type AccountStatus = 'ok' | 'student_not_imported';

/**
 * Identite de session complete (cible post-pilote). `entityId` porte
 * l'`id` de la fiche `students` liee quand `baseRole === 'etudiant'` ;
 * `null` sinon, y compris quand `status === 'student_not_imported'`.
 */
export interface SessionUser {
  tid: string;
  oid: string;
  email: string;
  displayName: string;
  baseRole: BaseRole;
  entityId: number | null;
  status: AccountStatus;
}

export type ImpersonationKind = 'student' | 'company';

/**
 * Mode d'incarnation temporaire, reserve au gestionnaire (jalon 5). Stocke
 * uniquement dans la session : ne modifie jamais `users` ni `students`.
 */
export interface ImpersonationState {
  kind: ImpersonationKind;
  entityId: number;
}
