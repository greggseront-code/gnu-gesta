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

/** Ephemeral secret used only when the real config is missing outside tests/production. */
export function getFallbackSessionSecret(): string {
  if (!devSessionSecret) {
    devSessionSecret = randomBytes(32).toString('hex');
  }
  return devSessionSecret;
}

/**
 * Le pilote utilise un MemoryStore de session (jalon 1). Il ne doit jamais
 * tourner avec NODE_ENV=production tant que le store SQLite du jalon 2 n'a
 * pas remplace ce MemoryStore.
 */
export function assertPilotEnvironmentAllowed(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Le pilote authentification (MemoryStore) refuse de demarrer avec NODE_ENV=production. ' +
        'Voir docs/plans/2026-07-31-authentification-microsoft-entra-v1.md (jalon 2 requis avant tout deploiement).',
    );
  }
}
