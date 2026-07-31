import { ConfidentialClientApplication, type AccountInfo } from '@azure/msal-node';
import type { AuthConfig } from './auth.config';
import type { AcquiredEntraToken, EntraProfile } from './auth.types';

// Seule permission deleguee demandee : lecture du profil de l'utilisateur
// connecte. Ne jamais etendre sans mettre a jour la spec et le consentement
// Entra.
const SCOPES = ['openid', 'profile', 'email', 'User.Read'];

export interface AuthCodeUrlRequest {
  state: string;
  nonce: string;
  codeChallenge: string;
}

export interface TokenExchangeRequest {
  code: string;
  codeVerifier: string;
  state: string;
}

/**
 * Frontiere reseau vers Microsoft Entra, injectable pour permettre des tests
 * sans appel reseau (voir tests/auth-pilot.test.ts).
 */
export interface EntraAuthProvider {
  getAuthCodeUrl(request: AuthCodeUrlRequest): Promise<string>;
  acquireTokenByCode(request: TokenExchangeRequest): Promise<AcquiredEntraToken>;
  getMe(accessToken: string): Promise<EntraProfile>;
  /** Purges the MSAL token cache entry for this account. Called once per callback, after getMe(). */
  clearCache(cacheHandle: unknown): Promise<void>;
}

export function createMsalEntraProvider(config: AuthConfig): EntraAuthProvider {
  const msalClient = new ConfidentialClientApplication({
    auth: {
      clientId: config.ENTRA_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${config.ENTRA_TENANT_ID}`,
      clientSecret: config.ENTRA_CLIENT_SECRET,
    },
  });

  return {
    async getAuthCodeUrl({ state, nonce, codeChallenge }) {
      return msalClient.getAuthCodeUrl({
        scopes: SCOPES,
        redirectUri: config.ENTRA_REDIRECT_URI,
        state,
        nonce,
        codeChallenge,
        codeChallengeMethod: 'S256',
      });
    },

    async acquireTokenByCode({ code, codeVerifier, state }) {
      const result = await msalClient.acquireTokenByCode({
        code,
        scopes: SCOPES,
        redirectUri: config.ENTRA_REDIRECT_URI,
        codeVerifier,
        state,
      });
      if (!result?.accessToken || !result.tenantId) {
        throw new Error('entra_token_exchange_failed');
      }
      return { accessToken: result.accessToken, tenantId: result.tenantId, cacheHandle: result.account };
    },

    async getMe(accessToken) {
      const res = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error('entra_graph_me_failed');
      }
      const body = (await res.json()) as {
        userPrincipalName: string;
        mail: string | null;
        displayName: string;
      };
      return {
        userPrincipalName: body.userPrincipalName,
        mail: body.mail,
        displayName: body.displayName,
      };
    },

    async clearCache(cacheHandle) {
      if (!cacheHandle) return;
      await msalClient.getTokenCache().removeAccount(cacheHandle as AccountInfo);
    },
  };
}

let cachedProvider: EntraAuthProvider | null = null;

/** Mirrors db.connection.ts's getDb()/setDb() lazy-singleton pattern. */
export function getEntraProvider(config: AuthConfig): EntraAuthProvider {
  if (!cachedProvider) {
    cachedProvider = createMsalEntraProvider(config);
  }
  return cachedProvider;
}

/** Test-only override — see tests/auth-pilot.test.ts for the fake provider used there. */
export function setEntraProvider(provider: EntraAuthProvider): void {
  cachedProvider = provider;
}
