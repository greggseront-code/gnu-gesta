import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import { createTestDb } from '../src/db/db.connection';
import { buildDevAuthSession, listDevAuthFixtures } from '../src/features/auth/dev-auth';
import type { DevAuthConfig } from '../src/features/auth/auth.config';

const DEV_CONFIG: DevAuthConfig = {
  APP_BASE_URL: 'http://localhost:5173',
  SESSION_SECRET: 'test-only-local-auth-secret',
  GESTA_MANAGER_EMAIL: 'gregory.seront@vinci.be',
  HOST: '127.0.0.1',
};

let db: Database;

beforeEach(() => {
  db = createTestDb();
  db.prepare('INSERT INTO students (id, first_name, last_name, email) VALUES (1, ?, ?, ?)').run('Alice', 'Local', 'alice@local.test');
  db.prepare('INSERT INTO students (id, first_name, last_name, email) VALUES (2, ?, ?, ?)').run('Bob', 'Local', 'bob@local.test');
  db.prepare('INSERT INTO companies (id, name, general_email) VALUES (1, ?, ?)').run('Entreprise locale', 'contact@local.test');
});

afterEach(() => db.close());

describe('fixtures d’authentification locale', () => {
  it('expose uniquement les fixtures allowlistées dont les entités existent', () => {
    expect(listDevAuthFixtures(db, DEV_CONFIG).map((fixture) => fixture.name)).toEqual([
      'manager',
      'reader',
      'student-alice',
      'student-bob',
      'company',
    ]);
  });

  it('construit une identité gestionnaire sans écrire de faux compte', () => {
    const session = buildDevAuthSession(db, DEV_CONFIG, 'manager');

    expect(session).toMatchObject({
      user: {
        tid: 'dev-local',
        oid: 'dev-manager',
        email: DEV_CONFIG.GESTA_MANAGER_EMAIL,
        baseRole: 'gestionnaire',
        entityId: null,
        status: 'ok',
      },
    });
    expect((db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count).toBe(0);
  });

  it('lie les fixtures étudiants aux fiches locales existantes', () => {
    const session = buildDevAuthSession(db, DEV_CONFIG, 'student-alice');

    expect(session?.user).toMatchObject({
      email: 'alice@local.test',
      displayName: 'Alice Local',
      baseRole: 'etudiant',
      entityId: 1,
      status: 'ok',
    });
  });

  it('représente l’entreprise par la même incarnation gestionnaire que le flux réel', () => {
    const session = buildDevAuthSession(db, DEV_CONFIG, 'company');

    expect(session).toMatchObject({
      user: { baseRole: 'gestionnaire', entityId: null },
      impersonation: { kind: 'company', entityId: 1 },
    });
  });

  it('rend indisponible une fixture liée à une entité absente', () => {
    db.prepare('DELETE FROM students WHERE id = 2').run();
    db.prepare('DELETE FROM companies WHERE id = 1').run();

    expect(buildDevAuthSession(db, DEV_CONFIG, 'student-bob')).toBeNull();
    expect(buildDevAuthSession(db, DEV_CONFIG, 'company')).toBeNull();
  });
});
