import 'dotenv/config';
import { randomBytes } from 'crypto';
import { z } from 'zod';

// V1 pilote : liste minimale de variables necessaires au seul scenario
// gestionnaire. Etendue au jalon 2 (store SQLite, secrets production).
const AuthEnvSchema = z.object({
  ENTRA_TENANT_ID: z.string().min(1),
  ENTRA_CLIENT_ID: z.string().min(1),
  ENTRA_CLIENT_SECRET: z.string().min(1),
  ENTRA_REDIRECT_URI: z.string().url(),
  APP_BASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(16),
  GESTA_MANAGER_EMAIL: z.string().email(),
});

const AuthModeSchema = z.enum(['entra', 'dev']);

export type AuthMode = z.infer<typeof AuthModeSchema>;

export interface AuthModeParseResult {
  success: boolean;
  data?: AuthMode;
  error?: string;
}

/** `entra` reste le défaut : une activation locale doit être explicite. */
export function parseAuthMode(value: string | undefined): AuthModeParseResult {
  const result = AuthModeSchema.safeParse(value ?? 'entra');
  if (!result.success) {
    return { success: false, error: 'AUTH_MODE doit valoir "entra" ou "dev".' };
  }
  return { success: true, data: result.data };
}

export function loadAuthMode(): AuthMode {
  // La suite automatisee utilise le faux fournisseur Entra et doit rester
  // independante du .env local du developpeur.
  if (process.env.NODE_ENV === 'test') return 'entra';

  const result = parseAuthMode(process.env.AUTH_MODE);
  if (!result.success) {
    throw new Error(`Configuration d'authentification invalide : ${result.error}`);
  }
  return result.data!;
}

/** Hôtes acceptables pour un service explicitement limité à la machine locale. */
export function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

function isLocalHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && isLoopbackHost(url.hostname);
  } catch {
    return false;
  }
}

const DevAuthEnvSchema = z.object({
  APP_BASE_URL: z.string().url().refine(isLocalHttpUrl, 'APP_BASE_URL doit être une URL HTTP locale.'),
  SESSION_SECRET: z.string().min(16),
  GESTA_MANAGER_EMAIL: z.string().email(),
  HOST: z.string().default('127.0.0.1').refine(isLoopbackHost, 'HOST doit être localhost, 127.0.0.1 ou ::1.'),
});

export type DevAuthConfig = z.infer<typeof DevAuthEnvSchema>;

export type DevAuthConfigParseResult =
  | { success: true; data: DevAuthConfig }
  | { success: false; missing: string[] };

export function parseDevAuthConfig(
  env: Partial<Record<string, string | undefined>>,
): DevAuthConfigParseResult {
  const result = DevAuthEnvSchema.safeParse(env);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const missing = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
  return { success: false, missing };
}

export function loadDevAuthConfig(): DevAuthConfig {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('AUTH_MODE=dev est autorisé uniquement avec NODE_ENV=development.');
  }

  const result = parseDevAuthConfig(process.env);
  if (!result.success) {
    throw new Error(
      `Configuration d'authentification locale incomplete ou invalide : ${result.missing.join(', ')}. ` +
        'Voir backend/.env.example.',
    );
  }
  return result.data;
}

export type AuthConfig = z.infer<typeof AuthEnvSchema>;

export type AuthConfigParseResult =
  | { success: true; data: AuthConfig }
  | { success: false; missing: string[] };

/** Pure validation, no process.env access — used directly by tests and by auth-config-check.ts. */
export function parseAuthConfig(env: Partial<Record<string, string | undefined>>): AuthConfigParseResult {
  const result = AuthEnvSchema.safeParse(env);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const missing = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
  return { success: false, missing };
}

// Valeurs de test insensibles, jamais utilisees en dehors de NODE_ENV=test.
// Elles evitent qu'un .env absent ne casse la suite de tests existante, tout
// en gardant parseAuthConfig() strict pour dev/production.
const TEST_CONFIG: AuthConfig = {
  ENTRA_TENANT_ID: 'test-tenant-id',
  ENTRA_CLIENT_ID: 'test-client-id',
  ENTRA_CLIENT_SECRET: 'test-client-secret',
  ENTRA_REDIRECT_URI: 'http://localhost:5173/api/auth/callback',
  APP_BASE_URL: 'http://localhost:5173',
  SESSION_SECRET: 'test-only-insecure-session-secret',
  GESTA_MANAGER_EMAIL: 'gregory.seront@vinci.be',
};

let cachedConfig: AuthConfig | null = null;

export function loadAuthConfig(): AuthConfig {
  if (cachedConfig) return cachedConfig;

  if (process.env.NODE_ENV === 'test') {
    cachedConfig = TEST_CONFIG;
    return cachedConfig;
  }

  const result = parseAuthConfig(process.env);
  if (!result.success) {
    throw new Error(
      `Configuration Entra incomplete ou invalide. Variables manquantes ou invalides : ${result.missing.join(', ')}. Voir backend/.env.example.`,
    );
  }
  cachedConfig = result.data;
  return cachedConfig;
}

/** Only for tests exercising both cached and freshly-parsed config. */
export function resetAuthConfigCacheForTests(): void {
  cachedConfig = null;
}

/**
 * Non-throwing variant used by app.ts to wire the session middleware. A
 * missing/invalid .env must not prevent the rest of the app (routes metier
 * existantes) from starting — only the auth routes themselves need to fail
 * clearly, which they do via loadAuthConfig() inside auth.routes.ts.
 */
export function loadAuthConfigOrNull(): AuthConfig | null {
  try {
    return loadAuthConfig();
  } catch {
    return null;
  }
}

let devSessionSecret: string | null = null;

/** Ephemeral secret used only when the real config is missing outside tests/production/staging. */
export function getFallbackSessionSecret(): string {
  if (!devSessionSecret) {
    devSessionSecret = randomBytes(32).toString('hex');
  }
  return devSessionSecret;
}

/** production et staging partagent le meme domaine HTTPS (voir docs/deployment.md) : la config Entra y est obligatoire. */
export function isProductionLikeEnvironment(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
}
