/** Claims Microsoft retenus apres l'appel Graph /me, sans jeton. */
export interface EntraProfile {
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

/**
 * Session utilisateur du pilote uniquement : seul le gestionnaire exact
 * obtient un role metier. Tout autre compte du tenant est authentifie mais
 * marque `pilot_not_manager`, sans role ni entityId.
 */
export type PilotSessionUser =
  | { kind: 'gestionnaire'; displayName: string; email: string }
  | { kind: 'pilot_not_manager'; displayName: string; email: string };
