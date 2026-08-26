import request from 'supertest';
import { app } from '../../src/app';
import { setEntraProvider } from '../../src/features/auth/entra.client';
import type { EntraAuthProvider, AuthCodeUrlRequest, TokenExchangeRequest } from '../../src/features/auth/entra.client';
import type { AcquiredEntraToken, EntraProfile } from '../../src/features/auth/auth.types';
import { testServer } from './test-server';

const TENANT_ID = 'test-tenant-id'; // matches TEST_CONFIG in auth.config.ts under NODE_ENV=test

class FakeEntraProvider implements EntraAuthProvider {
  constructor(private readonly profile: EntraProfile) {}

  async getAuthCodeUrl({ state }: AuthCodeUrlRequest): Promise<string> {
    return `https://login.microsoftonline.com/fake/oauth2/v2.0/authorize?state=${encodeURIComponent(state)}`;
  }

  async acquireTokenByCode(_req: TokenExchangeRequest): Promise<AcquiredEntraToken> {
    return { accessToken: 'fake-access-token', tenantId: TENANT_ID, cacheHandle: null };
  }

  async getMe(): Promise<EntraProfile> {
    return this.profile;
  }

  async clearCache(): Promise<void> {}
}

export interface AuthenticatedAgent {
  /** Agent Supertest avec un cookie de session valide : à réutiliser sur chaque requête du test. */
  agent: ReturnType<typeof request.agent>;
  /** À passer dans l'en-tête x-csrf-token sur les requêtes POST/PATCH/PUT/DELETE. */
  csrfToken: string;
}

/**
 * Etablit une vraie session (login + callback via un faux fournisseur Entra,
 * comme tests/auth-pilot.test.ts) plutôt que de simuler des headers x-role /
 * x-entity-id : depuis le jalon 4, ces headers n'ont plus aucune influence
 * sur req.auth (voir auth-context.middleware.ts).
 */
async function loginWithProfile(profile: EntraProfile): Promise<AuthenticatedAgent> {
  setEntraProvider(new FakeEntraProvider(profile));
  const agent = request.agent(testServer);
  const loginRes = await agent.get('/api/auth/login');
  const state = new URL(loginRes.headers.location as string).searchParams.get('state') ?? '';
  await agent.get(`/api/auth/callback?code=valid-code&state=${state}`);
  const me = await agent.get('/api/auth/me');
  return { agent, csrfToken: me.body.csrfToken as string };
}

export function loginAsGestionnaire(): Promise<AuthenticatedAgent> {
  return loginWithProfile({
    oid: 'test-oid-gestionnaire',
    userPrincipalName: 'gregory.seront@vinci.be',
    mail: 'gregory.seront@vinci.be',
    displayName: 'Gregory Seront',
  });
}

let lecteurCounter = 0;

/** Chaque appel utilise un oid distinct : deux lecteurs du test restent deux identités Entra différentes. */
export function loginAsLecteur(): Promise<AuthenticatedAgent> {
  lecteurCounter += 1;
  const suffix = lecteurCounter;
  return loginWithProfile({
    oid: `test-oid-lecteur-${suffix}`,
    userPrincipalName: `lecteur${suffix}@vinci.be`,
    mail: `lecteur${suffix}@vinci.be`,
    displayName: `Lecteur Test ${suffix}`,
  });
}

/**
 * `studentEmail` doit être une adresse `@student.vinci.be` déjà présente
 * dans `students` (insérée par le test) pour que la liaison automatique
 * associe le bon `entityId` — voir auth.service.linkStudentEntity().
 */
export function loginAsEtudiant(studentEmail: string): Promise<AuthenticatedAgent> {
  return loginWithProfile({
    oid: `test-oid-${studentEmail}`,
    userPrincipalName: studentEmail,
    mail: null,
    displayName: 'Étudiant Test',
  });
}

/**
 * Aucun compte Microsoft "entreprise" n'existe (V1, voir spec) : le seul
 * chemin vers le rôle effectif entreprise est l'incarnation gestionnaire.
 */
export async function loginAsEntreprise(companyId: number): Promise<AuthenticatedAgent> {
  const manager = await loginAsGestionnaire();
  const res = await manager.agent
    .post('/api/auth/impersonation')
    .set('x-csrf-token', manager.csrfToken)
    .send({ kind: 'company', entityId: companyId });
  if (res.status !== 200) {
    throw new Error(`loginAsEntreprise: activation de l'incarnation échouée (${res.status}) : ${JSON.stringify(res.body)}`);
  }
  return manager;
}
