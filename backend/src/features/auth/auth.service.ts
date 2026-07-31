import { randomBytes, createHash } from 'crypto';
import type { AuthConfig } from './auth.config';
import type { EntraAuthProvider } from './entra.client';
import type { PendingAuthState, PilotSessionUser } from './auth.types';

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

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
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
 * Valide le retour Microsoft (state, tenant) et classe le compte. Le pilote
 * ne reconnait qu'une seule adresse gestionnaire ; tout autre compte du
 * tenant reste authentifie mais sans role metier (`pilot_not_manager`).
 */
export async function handleAuthCallback(
  provider: EntraAuthProvider,
  config: AuthConfig,
  pendingAuth: PendingAuthState | undefined,
  query: AuthCallbackQuery,
): Promise<PilotSessionUser> {
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

    const isManager = normalizeEmail(profile.userPrincipalName) === normalizeEmail(config.GESTA_MANAGER_EMAIL);

    return isManager
      ? { kind: 'gestionnaire', displayName: profile.displayName, email: profile.userPrincipalName }
      : { kind: 'pilot_not_manager', displayName: profile.displayName, email: profile.userPrincipalName };
  } finally {
    await provider.clearCache(token.cacheHandle);
  }
}
