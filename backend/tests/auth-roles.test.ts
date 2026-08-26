import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Database } from 'better-sqlite3';
import { createTestDb, setDb } from '../src/db/db.connection';
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
  return { agent, me };
}

function insertStudent(db: Database, email: string): number {
  db.prepare('INSERT INTO students (first_name, last_name, email) VALUES (?, ?, ?)').run('Alice', 'Martin', email);
  return (db.prepare('SELECT id FROM students WHERE email = ?').get(email) as { id: number }).id;
}

describe('classification du rôle de base et liaison étudiante', () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDb();
    setDb(db);
  });

  afterEach(() => db.close());

  it('gregory.seront@vinci.be exact obtient gestionnaire, sans entityId', async () => {
    const { me } = await loginAs({
      oid: 'oid-1',
      userPrincipalName: 'gregory.seront@vinci.be',
      mail: 'gregory.seront@vinci.be',
      displayName: 'Gregory Seront',
    });
    expect(me.body).toMatchObject({ baseRole: 'gestionnaire', role: 'gestionnaire', entityId: null, status: 'ok' });
  });

  it('un domaine student.vinci.be avec fiche importée (même casse) devient étudiant avec entityId', async () => {
    const studentId = insertStudent(db, 'alice.martin@student.vinci.be');
    const { me } = await loginAs({
      oid: 'oid-2',
      userPrincipalName: 'alice.martin@student.vinci.be',
      mail: 'alice.martin@student.vinci.be',
      displayName: 'Alice Martin',
    });
    expect(me.body).toMatchObject({ baseRole: 'etudiant', role: 'etudiant', entityId: studentId, status: 'ok' });
  });

  it('la liaison ignore la casse entre le UPN vérifié et students.email', async () => {
    const studentId = insertStudent(db, 'Alice.Martin@Student.Vinci.Be');
    const { me } = await loginAs({
      oid: 'oid-3',
      userPrincipalName: 'alice.martin@student.vinci.be',
      mail: null,
      displayName: 'Alice Martin',
    });
    expect(me.body).toMatchObject({ baseRole: 'etudiant', entityId: studentId, status: 'ok' });
  });

  it('un domaine étudiant sans fiche importée reste authentifié mais bloqué', async () => {
    const { me } = await loginAs({
      oid: 'oid-4',
      userPrincipalName: 'inconnu@student.vinci.be',
      mail: null,
      displayName: 'Inconnu',
    });
    expect(me.body).toMatchObject({ baseRole: 'etudiant', role: null, entityId: null, status: 'student_not_imported' });
  });

  it('se rabat sur mail uniquement si le UPN ne correspond à aucune fiche', async () => {
    const studentId = insertStudent(db, 'alice.perso@student.vinci.be');
    const { me } = await loginAs({
      oid: 'oid-5',
      userPrincipalName: 'a.martin@student.vinci.be',
      mail: 'alice.perso@student.vinci.be',
      displayName: 'Alice Martin',
    });
    expect(me.body).toMatchObject({ baseRole: 'etudiant', entityId: studentId, status: 'ok' });
  });

  it('un domaine ressemblant mais invalide (suffixe après student.vinci.be) reste lecteur', async () => {
    const { me } = await loginAs({
      oid: 'oid-6',
      userPrincipalName: 'quelquun@student.vinci.be.example.org',
      mail: null,
      displayName: 'Quelqu\'un',
    });
    expect(me.body).toMatchObject({ baseRole: 'lecteur', role: 'lecteur', entityId: null, status: 'ok' });
  });

  it('mail ne peut jamais élever au rôle gestionnaire à lui seul', async () => {
    const { me } = await loginAs({
      oid: 'oid-7',
      userPrincipalName: 'quelquun@vinci.be',
      mail: 'gregory.seront@vinci.be',
      displayName: 'Quelqu\'un',
    });
    expect(me.body).toMatchObject({ baseRole: 'lecteur', role: 'lecteur' });
  });

  it('tout autre compte authentifié du tenant devient lecteur', async () => {
    const { me } = await loginAs({
      oid: 'oid-8',
      userPrincipalName: 'prof@vinci.be',
      mail: 'prof@vinci.be',
      displayName: 'Un Prof',
    });
    expect(me.body).toMatchObject({ baseRole: 'lecteur', role: 'lecteur', entityId: null, status: 'ok' });
  });

  it('le rôle est recalculé à chaque connexion : un import ultérieur débloque le compte', async () => {
    const { me: meBefore } = await loginAs({
      oid: 'oid-9',
      userPrincipalName: 'nouveau@student.vinci.be',
      mail: null,
      displayName: 'Nouveau',
    });
    expect(meBefore.body.status).toBe('student_not_imported');

    const studentId = insertStudent(db, 'nouveau@student.vinci.be');
    const { me: meAfter } = await loginAs({
      oid: 'oid-9',
      userPrincipalName: 'nouveau@student.vinci.be',
      mail: null,
      displayName: 'Nouveau',
    });
    expect(meAfter.body).toMatchObject({ status: 'ok', entityId: studentId });
  });
});
