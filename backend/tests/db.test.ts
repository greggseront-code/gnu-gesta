import { createTestDb } from '../src/db/db.connection';
import type { Database } from 'better-sqlite3';

let db: Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  db.close();
});

test('schema creates all required tables', () => {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all() as { name: string }[];
  const names = tables.map((t) => t.name);

  expect(names).toContain('users');
  expect(names).toContain('sessions');
  expect(names).toContain('students');
  expect(names).toContain('companies');
  expect(names).toContain('company_contacts');
  expect(names).toContain('offer_contacts');
  expect(names).toContain('offers');
  expect(names).toContain('applications');
  expect(names).toContain('offer_status_history');
});

test('foreign keys are enforced', () => {
  expect(() => {
    db.prepare('INSERT INTO company_contacts (company_id, first_name, last_name, email, roles) VALUES (?, ?, ?, ?, ?)').run(
      999,
      'Jean',
      'Dupont',
      'jean@example.com',
      '["maitre_de_stage"]',
    );
  }).toThrow();
});

test('each fresh test db starts empty', () => {
  db.prepare('INSERT INTO companies (name, general_email) VALUES (?, ?)').run('Acme', 'acme@example.com');
  db.close();

  db = createTestDb();
  const count = db.prepare('SELECT COUNT(*) as n FROM companies').get() as { n: number };
  expect(count.n).toBe(0);
});
