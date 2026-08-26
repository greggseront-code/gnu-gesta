import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Database } from 'better-sqlite3';
import { createTestDb, setDb } from '../src/db/db.connection';
import { insertCompany } from '../src/features/companies/companies.queries';
import { setEntraProvider } from '../src/features/auth/entra.client';
import type { EntraAuthProvider, AuthCodeUrlRequest, TokenExchangeRequest } from '../src/features/auth/entra.client';
import type { AcquiredEntraToken, EntraProfile } from '../src/features/auth/auth.types';
import { testServer } from './helpers/test-server';

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

function extractState(location: string): string {
  return new URL(location).searchParams.get('state') ?? '';
}

async function loginAs(profile: EntraProfile) {
  setEntraProvider(new FakeEntraProvider(profile));
  const agent = request.agent(testServer);
  const loginRes = await agent.get('/api/auth/login');
  const state = extractState(loginRes.headers.location as string);
  await agent.get(`/api/auth/callback?code=valid-code&state=${state}`);
  const me = await agent.get('/api/auth/me');
  return { agent, csrfToken: me.body.csrfToken as string };
}

const MANAGER: EntraProfile = {
  oid: 'oid-manager',
  userPrincipalName: 'gregory.seront@vinci.be',
  mail: 'gregory.seront@vinci.be',
  displayName: 'Gregory Seront',
};

describe('incarnations gestionnaire', () => {
  let db: Database;
  let studentId: number;
  let companyId: number;

  beforeEach(() => {
    db = createTestDb();
    setDb(db);
    db.prepare('INSERT INTO students (first_name, last_name, email) VALUES (?, ?, ?)').run('Alice', 'Martin', 'alice@student.vinci.be');
    studentId = (db.prepare('SELECT id FROM students WHERE email = ?').get('alice@student.vinci.be') as { id: number }).id;
    companyId = insertCompany(db, { name: 'Acme', general_email: 'acme@acme.com' }).id;
  });

  afterEach(() => db.close());

  it('le gestionnaire peut activer le mode étudiant et voir le rôle effectif étudiant', async () => {
    const { agent, csrfToken } = await loginAs(MANAGER);

    const activate = await agent
      .post('/api/auth/impersonation')
      .set('x-csrf-token', csrfToken)
      .send({ kind: 'student', entityId: studentId });
    expect(activate.status).toBe(200);

    const me = await agent.get('/api/auth/me');
    expect(me.body).toMatchObject({ baseRole: 'gestionnaire', role: 'etudiant', entityId: studentId });
  });

  it('le gestionnaire peut activer le mode entreprise et voir le rôle effectif entreprise', async () => {
    const { agent, csrfToken } = await loginAs(MANAGER);

    const activate = await agent
      .post('/api/auth/impersonation')
      .set('x-csrf-token', csrfToken)
      .send({ kind: 'company', entityId: companyId });
    expect(activate.status).toBe(200);

    const me = await agent.get('/api/auth/me');
    expect(me.body).toMatchObject({ baseRole: 'gestionnaire', role: 'entreprise', entityId: companyId });
  });

  it('quitter le mode restaure le rôle gestionnaire', async () => {
    const { agent, csrfToken } = await loginAs(MANAGER);
    await agent.post('/api/auth/impersonation').set('x-csrf-token', csrfToken).send({ kind: 'student', entityId: studentId });

    const exit = await agent.delete('/api/auth/impersonation').set('x-csrf-token', csrfToken);
    expect(exit.status).toBe(204);

    const me = await agent.get('/api/auth/me');
    expect(me.body).toMatchObject({ baseRole: 'gestionnaire', role: 'gestionnaire', entityId: null });
  });

  it('un seul mode est actif à la fois : activer entreprise après étudiant remplace le mode', async () => {
    const { agent, csrfToken } = await loginAs(MANAGER);
    await agent.post('/api/auth/impersonation').set('x-csrf-token', csrfToken).send({ kind: 'student', entityId: studentId });
    await agent.post('/api/auth/impersonation').set('x-csrf-token', csrfToken).send({ kind: 'company', entityId: companyId });

    const me = await agent.get('/api/auth/me');
    expect(me.body).toMatchObject({ role: 'entreprise', entityId: companyId });
  });

  it('refuse une entité inexistante avec 404', async () => {
    const { agent, csrfToken } = await loginAs(MANAGER);
    const res = await agent
      .post('/api/auth/impersonation')
      .set('x-csrf-token', csrfToken)
      .send({ kind: 'student', entityId: 999999 });
    expect(res.status).toBe(404);
  });

  it('refuse un kind invalide avec 400', async () => {
    const { agent, csrfToken } = await loginAs(MANAGER);
    const res = await agent
      .post('/api/auth/impersonation')
      .set('x-csrf-token', csrfToken)
      .send({ kind: 'admin', entityId: studentId });
    expect(res.status).toBe(400);
  });

  it('refuse une mutation sans jeton CSRF valide', async () => {
    const { agent } = await loginAs(MANAGER);
    const res = await agent.post('/api/auth/impersonation').send({ kind: 'student', entityId: studentId });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('csrf_invalid');
  });

  it('un lecteur ne peut pas activer un mode (403), même par appel direct', async () => {
    const { agent, csrfToken } = await loginAs({
      oid: 'oid-lecteur',
      userPrincipalName: 'prof@vinci.be',
      mail: 'prof@vinci.be',
      displayName: 'Un Prof',
    });
    const res = await agent
      .post('/api/auth/impersonation')
      .set('x-csrf-token', csrfToken)
      .send({ kind: 'student', entityId: studentId });
    expect(res.status).toBe(403);
  });

  it('un étudiant réel ne peut pas activer un mode (403)', async () => {
    const { agent, csrfToken } = await loginAs({
      oid: 'oid-alice',
      userPrincipalName: 'alice@student.vinci.be',
      mail: null,
      displayName: 'Alice Martin',
    });
    const res = await agent
      .post('/api/auth/impersonation')
      .set('x-csrf-token', csrfToken)
      .send({ kind: 'company', entityId: companyId });
    expect(res.status).toBe(403);
  });

  it('une nouvelle connexion efface toute incarnation précédente', async () => {
    const { agent, csrfToken } = await loginAs(MANAGER);
    await agent.post('/api/auth/impersonation').set('x-csrf-token', csrfToken).send({ kind: 'student', entityId: studentId });

    // Se reconnecte (nouveau login/callback) sur le même agent : la session est régénérée.
    const loginRes = await agent.get('/api/auth/login');
    const state = extractState(loginRes.headers.location as string);
    await agent.get(`/api/auth/callback?code=valid-code&state=${state}`);

    const me = await agent.get('/api/auth/me');
    expect(me.body).toMatchObject({ role: 'gestionnaire', entityId: null });
  });
});
