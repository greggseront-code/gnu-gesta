import { randomBytes, createHash } from 'crypto';
import type { Database } from 'better-sqlite3';
import type { AuthConfig } from './auth.config';
import type { EntraAuthProvider } from './entra.client';
import { upsertIdentity, findStudentIdByEmail } from './auth.queries';
import type { BaseRole, PendingAuthState, SessionUser } from './auth.types';

function base64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateState(): string {
  return base64url(randomBytes(24));
}

function generateNonce(): string {
  return base64url(randomBytes(24));
}

function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function generateCsrfToken(): string {
  return base64url(randomBytes(24));
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

const STUDENT_EMAIL_DOMAIN = 'student.vinci.be';

/** Domaine = partie apres le dernier `@` uniquement (rejette `...@student.vinci.be.example.org`). */
function emailDomain(email: string): string {
  const normalized = normalizeEmail(email);
  return normalized.slice(normalized.lastIndexOf('@') + 1);
}

/**
 * Ordre impose par la spec : gestionnaire exact, puis domaine etudiant
 * exact, puis lecteur par defaut. `mail` n'intervient jamais ici : seul le
 * `userPrincipalName` verifie peut elever au role gestionnaire ou etudiant.
 */
export function classifyBaseRole(config: AuthConfig, userPrincipalName: string): BaseRole {
  if (normalizeEmail(userPrincipalName) === normalizeEmail(config.GESTA_MANAGER_EMAIL)) {
    return 'gestionnaire';
  }
  if (emailDomain(userPrincipalName) === STUDENT_EMAIL_DOMAIN) {
    return 'etudiant';
  }
  return 'lecteur';
}

/**
 * Lie un compte etudiant a une fiche `students` existante : essaie d'abord
 * le `userPrincipalName` verifie, puis `mail` seulement s'il differe et
 * uniquement pour une correspondance exacte (unicite garantie par l'index
 * insensible a la casse sur students.email). Ne cree jamais de fiche.
 */
function linkStudentEntity(db: Database, profile: { userPrincipalName: string; mail: string | null }): number | null {
  const byUpn = findStudentIdByEmail(db, profile.userPrincipalName);
  if (byUpn !== null) return byUpn;

  if (profile.mail && normalizeEmail(profile.mail) !== normalizeEmail(profile.userPrincipalName)) {
    return findStudentIdByEmail(db, profile.mail);
  }
  return null;
}

export interface LoginRequestResult {
  authUrl: string;
  pendingAuth: PendingAuthState;
}

export async function buildLoginRequest(provider: EntraAuthProvider): Promise<LoginRequestResult> {
  const state = generateState();
  const nonce = generateNonce();
  const { verifier, challenge } = generatePkcePair();

  const authUrl = await provider.getAuthCodeUrl({ state, nonce, codeChallenge: challenge });

  return { authUrl, pendingAuth: { state, nonce, codeVerifier: verifier } };
}

export type CallbackErrorCode =
  | 'entra_error'
  | 'missing_pending_auth'
  | 'invalid_state'
  | 'missing_code'
  | 'invalid_tenant';

export class AuthCallbackError extends Error {
  constructor(public readonly code: CallbackErrorCode) {
    super(code);
    this.name = 'AuthCallbackError';
  }
}

export interface AuthCallbackQuery {
  code?: string;
  state?: string;
  error?: string;
}

/**
 * Valide le retour Microsoft (state, tenant), classe le compte et le lie au
 * referentiel etudiant si applicable. Cree/actualise `users` par tid+oid
 * sans jamais persister de jeton Microsoft.
 */
export async function handleAuthCallback(
  provider: EntraAuthProvider,
  config: AuthConfig,
  db: Database,
  pendingAuth: PendingAuthState | undefined,
  query: AuthCallbackQuery,
): Promise<SessionUser> {
  if (query.error) {
    throw new AuthCallbackError('entra_error');
  }
  if (!pendingAuth) {
    throw new AuthCallbackError('missing_pending_auth');
  }
  if (!query.state || query.state !== pendingAuth.state) {
    throw new AuthCallbackError('invalid_state');
  }
  if (!query.code) {
    throw new AuthCallbackError('missing_code');
  }

  const token = await provider.acquireTokenByCode({
    code: query.code,
    codeVerifier: pendingAuth.codeVerifier,
    state: pendingAuth.state,
  });

  // Le cache MSAL ne doit jamais survivre au-dela de cet appel : aucun jeton
  // Microsoft n'est conserve, quel que soit le resultat de la validation.
  try {
    if (token.tenantId !== config.ENTRA_TENANT_ID) {
      throw new AuthCallbackError('invalid_tenant');
    }

    const profile = await provider.getMe(token.accessToken);
    const baseRole = classifyBaseRole(config, profile.userPrincipalName);

    let entityId: number | null = null;
    if (baseRole === 'etudiant') {
      entityId = linkStudentEntity(db, profile);
    }
    const status = baseRole === 'etudiant' && entityId === null ? 'student_not_imported' : 'ok';

    upsertIdentity(db, {
      tid: token.tenantId,
      oid: profile.oid,
      email: profile.userPrincipalName,
      displayName: profile.displayName,
      role: baseRole,
      entityId,
    });

    return {
      tid: token.tenantId,
      oid: profile.oid,
      email: profile.userPrincipalName,
      displayName: profile.displayName,
      baseRole,
      entityId,
      status,
    };
  } finally {
    await provider.clearCache(token.cacheHandle);
  }
}

/** Seul le role de base gestionnaire peut activer/quitter un mode d'incarnation (jalon 5). */
export class ImpersonationForbiddenError extends Error {
  constructor() {
    super('impersonation_forbidden');
    this.name = 'ImpersonationForbiddenError';
  }
}

export function assertCanImpersonate(user: SessionUser | undefined): void {
  if (!user || user.baseRole !== 'gestionnaire') {
    throw new ImpersonationForbiddenError();
  }
}
