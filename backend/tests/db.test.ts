import RawDatabase from 'better-sqlite3';
import { createTestDb } from '../src/db/db.connection';
import { runMigrations } from '../src/db/db.migrate';
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

// ─── Validation status (moderation) ────────────────────────────────────────

test('une entreprise insérée sans validation_status est validée par défaut', () => {
  // validated_at n'a volontairement pas de défaut SQLite (ALTER TABLE ADD
  // COLUMN interdit les défauts non constants) : il est renseigné par la
  // couche service à la création (voir companies.queries), pas par la DB.
  const company = db
    .prepare('INSERT INTO companies (name, general_email) VALUES (?, ?) RETURNING *')
    .get('Acme', 'acme@example.com') as { validation_status: string; submitted_by_student_id: number | null };

  expect(company.validation_status).toBe('validated');
  expect(company.submitted_by_student_id).toBeNull();
});

test('un contact inséré sans validation_status est validé par défaut, created_with_company à 0', () => {
  const companyId = (
    db.prepare('INSERT INTO companies (name, general_email) VALUES (?, ?) RETURNING id').get('Acme', 'a@a.com') as { id: number }
  ).id;
  const contact = db
    .prepare('INSERT INTO company_contacts (company_id, first_name, last_name, email, roles) VALUES (?, ?, ?, ?, ?) RETURNING *')
    .get(companyId, 'Jean', 'Dupont', 'jean@acme.com', '["maitre_de_stage"]') as {
    validation_status: string;
    created_with_company: number;
  };

  expect(contact.validation_status).toBe('validated');
  expect(contact.created_with_company).toBe(0);
});

// ─── Unicité normalisée ─────────────────────────────────────────────────────

test('deux contacts ne peuvent pas partager le même email normalisé (casse et espaces)', () => {
  const companyId = (
    db.prepare('INSERT INTO companies (name, general_email) VALUES (?, ?) RETURNING id').get('Acme', 'a@a.com') as { id: number }
  ).id;
  db.prepare('INSERT INTO company_contacts (company_id, first_name, last_name, email, roles) VALUES (?, ?, ?, ?, ?)').run(
    companyId, 'Jean', 'Dupont', 'jean@acme.com', '["maitre_de_stage"]',
  );

  expect(() => {
    db.prepare('INSERT INTO company_contacts (company_id, first_name, last_name, email, roles) VALUES (?, ?, ?, ?, ?)').run(
      companyId, 'Jean2', 'D2', '  JEAN@ACME.COM  ', '["maitre_de_stage"]',
    );
  }).toThrow();
});

test('deux entreprises ne peuvent pas partager le même nom et la même adresse normalisés', () => {
  db.prepare('INSERT INTO companies (name, address, general_email) VALUES (?, ?, ?)').run('Acme', '1 rue A', 'a@a.com');

  expect(() => {
    db.prepare('INSERT INTO companies (name, address, general_email) VALUES (?, ?, ?)').run('  ACME  ', ' 1 RUE A ', 'b@b.com');
  }).toThrow();
});

test('deux entreprises de même nom peuvent coexister avec des adresses différentes', () => {
  db.prepare('INSERT INTO companies (name, address, general_email) VALUES (?, ?, ?)').run('Acme', '1 rue A', 'a@a.com');

  expect(() => {
    db.prepare('INSERT INTO companies (name, address, general_email) VALUES (?, ?, ?)').run('Acme', '2 rue B', 'b@b.com');
  }).not.toThrow();
});

test('deux entreprises de même nom et sans adresse ne peuvent pas coexister', () => {
  db.prepare('INSERT INTO companies (name, general_email) VALUES (?, ?)').run('Acme', 'a@a.com');

  expect(() => {
    db.prepare('INSERT INTO companies (name, address, general_email) VALUES (?, ?, ?)').run('Acme', '   ', 'b@b.com');
  }).toThrow();
});

// ─── Migration d'une base historique en conflit ────────────────────────────

function createLegacyDb(): InstanceType<typeof RawDatabase> {
  const raw = new RawDatabase(':memory:');
  raw.pragma('foreign_keys = ON');
  raw.exec(`
    CREATE TABLE companies (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      address       TEXT,
      general_email TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE company_contacts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      first_name    TEXT    NOT NULL,
      last_name     TEXT    NOT NULL,
      email         TEXT    NOT NULL,
      phone         TEXT,
      roles         TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return raw;
}

test('la migration bloque sur un conflit historique d\'email sans supprimer de données', () => {
  const raw = createLegacyDb();
  const companyId = (
    raw.prepare('INSERT INTO companies (name, general_email) VALUES (?, ?) RETURNING id').get('Acme', 'a@a.com') as { id: number }
  ).id;
  raw.prepare('INSERT INTO company_contacts (company_id, first_name, last_name, email, roles) VALUES (?, ?, ?, ?, ?)').run(
    companyId, 'Jean', 'Dupont', 'jean@acme.com', '["maitre_de_stage"]',
  );
  raw.prepare('INSERT INTO company_contacts (company_id, first_name, last_name, email, roles) VALUES (?, ?, ?, ?, ?)').run(
    companyId, 'Jean2', 'D2', ' JEAN@ACME.COM ', '["maitre_de_stage"]',
  );

  expect(() => runMigrations(raw)).toThrow(/Conflits d'unicite/);

  const count = (raw.prepare('SELECT COUNT(*) as n FROM company_contacts').get() as { n: number }).n;
  expect(count).toBe(2);
  raw.close();
});

test('la migration bloque sur un conflit historique nom/adresse sans supprimer de données', () => {
  const raw = createLegacyDb();
  raw.prepare('INSERT INTO companies (name, address, general_email) VALUES (?, ?, ?)').run('Acme', '1 rue A', 'a@a.com');
  raw.prepare('INSERT INTO companies (name, address, general_email) VALUES (?, ?, ?)').run('  ACME  ', ' 1 RUE A ', 'b@b.com');

  expect(() => runMigrations(raw)).toThrow(/Conflits d'unicite/);

  const count = (raw.prepare('SELECT COUNT(*) as n FROM companies').get() as { n: number }).n;
  expect(count).toBe(2);
  raw.close();
});

test('la migration réussit sur une base historique sans conflit et marque tout comme validé', () => {
  const raw = createLegacyDb();
  const companyId = (
    raw.prepare('INSERT INTO companies (name, address, general_email) VALUES (?, ?, ?) RETURNING id').get('Acme', '1 rue A', 'a@a.com') as {
      id: number;
    }
  ).id;
  raw.prepare('INSERT INTO company_contacts (company_id, first_name, last_name, email, roles) VALUES (?, ?, ?, ?, ?)').run(
    companyId, 'Jean', 'Dupont', 'jean@acme.com', '["maitre_de_stage"]',
  );

  expect(() => runMigrations(raw)).not.toThrow();

  const company = raw.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) as {
    validation_status: string;
    validated_at: string | null;
  };
  expect(company.validation_status).toBe('validated');
  expect(company.validated_at).not.toBeNull();
  raw.close();
});
