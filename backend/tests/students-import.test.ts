import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Database } from 'better-sqlite3';
import { createTestDb, setDb } from '../src/db/db.connection';
import {
  loginAsEntreprise,
  loginAsEtudiant,
  loginAsGestionnaire,
  loginAsLecteur,
} from './helpers/authenticated-agent';
import { testServer } from './helpers/test-server';

const alice = {
  matricule: '202502681',
  last_name: 'Dupont',
  first_name: 'Alice',
  email: 'alice.dupont@student.vinci.be',
  date_naissance: '2006-06-20',
};

const bob = {
  matricule: '202400390',
  last_name: 'Martin',
  first_name: 'Bob',
  email: 'bob.martin@student.vinci.be',
  date_naissance: '2005-03-15',
};

const annualImport = (students: Array<typeof alice>, academicYear = '2026-2027') => ({
  academic_year: academicYear,
  students,
});

describe('students import', () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDb();
    setDb(db);
  });

  afterEach(() => db.close());

  it('GET /api/students exige une session gestionnaire', async () => {
    const anon = await request(testServer).get('/api/students');
    expect(anon.status).toBe(401);

    const { agent } = await loginAsGestionnaire();
    const res = await agent.get('/api/students');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('F12 schema import owned by students: importe et rattache les étudiants à l’année demandée', async () => {
    const { agent, csrfToken } = await loginAsGestionnaire();
    const res = await agent
      .post('/api/students/import')
      .set('x-csrf-token', csrfToken)
      .send(annualImport([alice, bob]));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ imported: 2, academic_year: '2026-2027' });

    const eligibilities = db
      .prepare(`
        SELECT s.email, e.academic_year
        FROM student_academic_year_eligibility e
        JOIN students s ON s.id = e.student_id
        ORDER BY s.email
      `)
      .all();
    expect(eligibilities).toEqual([
      { email: alice.email, academic_year: '2026-2027' },
      { email: bob.email, academic_year: '2026-2027' },
    ]);
  });

  it('GET /api/students retourne les étudiants importés triés par nom', async () => {
    const { agent, csrfToken } = await loginAsGestionnaire();
    await agent
      .post('/api/students/import')
      .set('x-csrf-token', csrfToken)
      .send(annualImport([alice, bob]));

    const res = await agent.get('/api/students');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].last_name).toBe('Dupont');
    expect(res.body[0].matricule).toBe('202502681');
    expect(res.body[0].date_naissance).toBe('2006-06-20');
    expect(res.body[1].last_name).toBe('Martin');
  });

  it('POST /api/students/import avec email invalide retourne 400', async () => {
    const { agent, csrfToken } = await loginAsGestionnaire();
    const res = await agent
      .post('/api/students/import')
      .set('x-csrf-token', csrfToken)
      .send(annualImport([{ ...alice, email: 'pas-un-email' }]));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Les données d'import sont invalides.");
    expect(res.body.details).toBeDefined();
  });

  it.each(['2026/2027', '2026-2028'])('refuse l’année académique invalide %s', async (academicYear) => {
    const { agent, csrfToken } = await loginAsGestionnaire();
    const res = await agent
      .post('/api/students/import')
      .set('x-csrf-token', csrfToken)
      .send(annualImport([alice], academicYear));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Les données d'import sont invalides.");
    expect((db.prepare('SELECT COUNT(*) AS count FROM students').get() as { count: number }).count).toBe(0);
  });

  it('refuse l’ancien contrat tableau afin que le schéma reste propriétaire de students', async () => {
    const { agent, csrfToken } = await loginAsGestionnaire();
    const res = await agent
      .post('/api/students/import')
      .set('x-csrf-token', csrfToken)
      .send([alice]);

    expect(res.status).toBe(400);
  });

  it('POST /api/students/import est idempotent (upsert par email)', async () => {
    const { agent, csrfToken } = await loginAsGestionnaire();
    await agent
      .post('/api/students/import')
      .set('x-csrf-token', csrfToken)
      .send(annualImport([alice]));

    // Reimport with updated first_name
    await agent
      .post('/api/students/import')
      .set('x-csrf-token', csrfToken)
      .send(annualImport([{ ...alice, first_name: 'Alice-Updated' }]));

    const res = await agent.get('/api/students');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].first_name).toBe('Alice-Updated');
    expect(
      (db.prepare('SELECT COUNT(*) AS count FROM student_academic_year_eligibility').get() as { count: number }).count,
    ).toBe(1);
  });

  it('un étudiant peut être éligible sur plusieurs années et un réimport reste additif', async () => {
    const { agent, csrfToken } = await loginAsGestionnaire();
    await agent
      .post('/api/students/import')
      .set('x-csrf-token', csrfToken)
      .send(annualImport([alice, bob], '2026-2027'));
    await agent
      .post('/api/students/import')
      .set('x-csrf-token', csrfToken)
      .send(annualImport([alice], '2027-2028'));

    const rows = db
      .prepare(`
        SELECT s.email, e.academic_year
        FROM student_academic_year_eligibility e
        JOIN students s ON s.id = e.student_id
        ORDER BY e.academic_year, s.email
      `)
      .all();
    expect(rows).toEqual([
      { email: alice.email, academic_year: '2026-2027' },
      { email: bob.email, academic_year: '2026-2027' },
      { email: alice.email, academic_year: '2027-2028' },
    ]);
  });

  it('annule étudiants et éligibilités si une ligne fait échouer l’import', async () => {
    const { agent, csrfToken } = await loginAsGestionnaire();
    const res = await agent
      .post('/api/students/import')
      .set('x-csrf-token', csrfToken)
      .send(annualImport([alice, { ...bob, matricule: alice.matricule }]));

    expect(res.status).toBe(500);
    expect((db.prepare('SELECT COUNT(*) AS count FROM students').get() as { count: number }).count).toBe(0);
    expect(
      (db.prepare('SELECT COUNT(*) AS count FROM student_academic_year_eligibility').get() as { count: number }).count,
    ).toBe(0);
  });

  it('lecteur reçoit 403 sur POST /api/students/import', async () => {
    const { agent, csrfToken } = await loginAsLecteur();
    const res = await agent
      .post('/api/students/import')
      .set('x-csrf-token', csrfToken)
      .send(annualImport([alice]));
    expect(res.status).toBe(403);
  });

  it('etudiant reçoit 403 sur POST /api/students/import', async () => {
    db.prepare('INSERT INTO students (first_name, last_name, email) VALUES (?, ?, ?)').run('Zoé', 'Zenith', 'zoe@student.vinci.be');
    const { agent, csrfToken } = await loginAsEtudiant('zoe@student.vinci.be');
    const res = await agent
      .post('/api/students/import')
      .set('x-csrf-token', csrfToken)
      .send(annualImport([alice]));
    expect(res.status).toBe(403);
  });

  it('entreprise reçoit 403 sur POST /api/students/import', async () => {
    const company = db
      .prepare('INSERT INTO companies (name, general_email) VALUES (?, ?) RETURNING id')
      .get('Acme', 'contact@acme.test') as { id: number };
    const { agent, csrfToken } = await loginAsEntreprise(company.id);
    const res = await agent
      .post('/api/students/import')
      .set('x-csrf-token', csrfToken)
      .send(annualImport([alice]));
    expect(res.status).toBe(403);
  });

  it('une requête POST sans jeton CSRF est refusée', async () => {
    const { agent } = await loginAsGestionnaire();
    const res = await agent.post('/api/students/import').send(annualImport([alice]));
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('csrf_invalid');
  });
});
