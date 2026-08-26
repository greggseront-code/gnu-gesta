import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Database } from 'better-sqlite3';
import { createTestDb, setDb } from '../src/db/db.connection';
import { insertCompany, insertContact } from '../src/features/companies/companies.queries';
import { loginAsGestionnaire, loginAsLecteur, loginAsEtudiant, loginAsEntreprise, type AuthenticatedAgent } from './helpers/authenticated-agent';
import { testServer } from './helpers/test-server';

const validContact = { first_name: 'Jean', last_name: 'Dupont', email: 'j@d.com', roles: ['maitre_de_stage'] };
// Nom distinct des entreprises créées par le beforeEach ('Acme Corp' / 'Other
// Corp') : le couple nom/adresse est désormais unique, une même valeur
// entrerait en conflit (409) avec la fixture plutôt que de tester le rôle.
const validCompanyBody = {
  name: 'New Ventures SPRL',
  general_email: 'contact@newventures.com',
  contacts: [validContact],
};

describe('access control — companies routes', () => {
  let db: Database;
  let manager: AuthenticatedAgent;
  let companyId: number;
  let otherCompanyId: number;

  beforeEach(async () => {
    db = createTestDb();
    setDb(db);
    manager = await loginAsGestionnaire();
    companyId = insertCompany(db, { name: 'Acme Corp', general_email: 'contact@acme.com' }).id;
    otherCompanyId = insertCompany(db, { name: 'Other Corp', general_email: 'other@other.com' }).id;
  });

  afterEach(() => db.close());

  // ─── GET / ───────────────────────────────────────────────────────

  it('GET /api/companies anonyme reçoit 401', async () => {
    const res = await request(testServer).get('/api/companies');
    expect(res.status).toBe(401);
  });

  it('gestionnaire peut GET /api/companies', async () => {
    const res = await manager.agent.get('/api/companies');
    expect(res.status).toBe(200);
  });

  it('lecteur peut GET /api/companies (référentiel de lecture)', async () => {
    const lecteur = await loginAsLecteur();
    const res = await lecteur.agent.get('/api/companies');
    expect(res.status).toBe(200);
  });

  // ─── GET /:id ────────────────────────────────────────────────────

  it('unauthenticated request receives 401 on GET /api/companies/:id', async () => {
    const res = await request(testServer).get(`/api/companies/${companyId}`);
    expect(res.status).toBe(401);
  });

  it('lecteur can GET /api/companies/:id', async () => {
    const lecteur = await loginAsLecteur();
    const res = await lecteur.agent.get(`/api/companies/${companyId}`);
    expect(res.status).toBe(200);
  });

  it('entreprise can GET its own company detail', async () => {
    const entreprise = await loginAsEntreprise(companyId);
    const res = await entreprise.agent.get(`/api/companies/${companyId}`);
    expect(res.status).toBe(200);
  });

  it('entreprise receives 403 on GET another company detail', async () => {
    const entreprise = await loginAsEntreprise(companyId);
    const res = await entreprise.agent.get(`/api/companies/${otherCompanyId}`);
    expect(res.status).toBe(403);
  });

  // ─── POST / ──────────────────────────────────────────────────────

  it('lecteur receives 403 on POST /api/companies', async () => {
    const lecteur = await loginAsLecteur();
    const res = await lecteur.agent.post('/api/companies').set('x-csrf-token', lecteur.csrfToken).send(validCompanyBody);
    expect(res.status).toBe(403);
  });

  it('unauthenticated receives 401 on POST /api/companies', async () => {
    const res = await request(testServer).post('/api/companies').send(validCompanyBody);
    expect(res.status).toBe(401);
  });

  it('etudiant can POST /api/companies', async () => {
    db.prepare('INSERT INTO students (first_name, last_name, email) VALUES (?,?,?)').run('E', 'T', 'e@student.vinci.be');
    const etudiant = await loginAsEtudiant('e@student.vinci.be');
    const res = await etudiant.agent.post('/api/companies').set('x-csrf-token', etudiant.csrfToken).send(validCompanyBody);
    expect(res.status).toBe(201);
  });

  it('gestionnaire can POST /api/companies', async () => {
    const res = await manager.agent.post('/api/companies').set('x-csrf-token', manager.csrfToken).send(validCompanyBody);
    expect(res.status).toBe(201);
  });

  it('POST /api/companies sans jeton CSRF est refusé (403)', async () => {
    const res = await manager.agent.post('/api/companies').send(validCompanyBody);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('csrf_invalid');
  });

  // ─── PATCH /:id ──────────────────────────────────────────────────

  it('lecteur receives 403 on PATCH /api/companies/:id', async () => {
    const lecteur = await loginAsLecteur();
    const res = await lecteur.agent.patch(`/api/companies/${companyId}`).set('x-csrf-token', lecteur.csrfToken).send({ name: 'X' });
    expect(res.status).toBe(403);
  });

  it('etudiant receives 403 on PATCH /api/companies/:id', async () => {
    db.prepare('INSERT INTO students (first_name, last_name, email) VALUES (?,?,?)').run('E', 'T', 'e@student.vinci.be');
    const etudiant = await loginAsEtudiant('e@student.vinci.be');
    const res = await etudiant.agent.patch(`/api/companies/${companyId}`).set('x-csrf-token', etudiant.csrfToken).send({ name: 'X' });
    expect(res.status).toBe(403);
  });

  it('entreprise can PATCH its own company', async () => {
    const entreprise = await loginAsEntreprise(companyId);
    const res = await entreprise.agent
      .patch(`/api/companies/${companyId}`)
      .set('x-csrf-token', entreprise.csrfToken)
      .send({ name: 'Acme Updated' });
    expect(res.status).toBe(200);
  });

  it('entreprise receives 403 on PATCH another company', async () => {
    const entreprise = await loginAsEntreprise(companyId);
    const res = await entreprise.agent
      .patch(`/api/companies/${otherCompanyId}`)
      .set('x-csrf-token', entreprise.csrfToken)
      .send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });

  it('gestionnaire can PATCH any company', async () => {
    const res = await manager.agent.patch(`/api/companies/${companyId}`).set('x-csrf-token', manager.csrfToken).send({ name: 'Updated' });
    expect(res.status).toBe(200);
  });

  // ─── POST /:id/contacts ──────────────────────────────────────────

  it('lecteur receives 403 on POST /api/companies/:id/contacts', async () => {
    const lecteur = await loginAsLecteur();
    const res = await lecteur.agent
      .post(`/api/companies/${companyId}/contacts`)
      .set('x-csrf-token', lecteur.csrfToken)
      .send(validContact);
    expect(res.status).toBe(403);
  });

  it('entreprise can POST contact to its own company', async () => {
    const entreprise = await loginAsEntreprise(companyId);
    const res = await entreprise.agent
      .post(`/api/companies/${companyId}/contacts`)
      .set('x-csrf-token', entreprise.csrfToken)
      .send(validContact);
    expect(res.status).toBe(201);
  });

  it('entreprise receives 403 on POST contact to another company', async () => {
    const entreprise = await loginAsEntreprise(companyId);
    const res = await entreprise.agent
      .post(`/api/companies/${otherCompanyId}/contacts`)
      .set('x-csrf-token', entreprise.csrfToken)
      .send(validContact);
    expect(res.status).toBe(403);
  });

  it('gestionnaire can POST contact to any company', async () => {
    const res = await manager.agent
      .post(`/api/companies/${companyId}/contacts`)
      .set('x-csrf-token', manager.csrfToken)
      .send(validContact);
    expect(res.status).toBe(201);
  });
});

describe('access control — offers routes', () => {
  let db: Database;
  let manager: AuthenticatedAgent;
  let companyId: number;
  let contactId: number;
  let offerId: number;

  beforeEach(async () => {
    db = createTestDb();
    setDb(db);
    manager = await loginAsGestionnaire();
    companyId = insertCompany(db, { name: 'Acme', general_email: 'acme@acme.com' }).id;
    contactId = insertContact(db, companyId, {
      first_name: 'Jean', last_name: 'Dupont', email: 'j@d.com', roles: ['maitre_de_stage'],
    }).id;

    const res = await manager.agent
      .post('/api/offers')
      .set('x-csrf-token', manager.csrfToken)
      .send({ company_id: companyId, priority_contact_id: contactId, contact_ids: [contactId], description: 'Test', remote_allowed: false });
    offerId = res.body.id;
  });

  afterEach(() => db.close());

  it('lecteur reçoit 403 sur POST /api/offers', async () => {
    const lecteur = await loginAsLecteur();
    const res = await lecteur.agent
      .post('/api/offers')
      .set('x-csrf-token', lecteur.csrfToken)
      .send({ company_id: companyId, priority_contact_id: contactId, contact_ids: [contactId], description: 'Test', remote_allowed: false });
    expect(res.status).toBe(403);
  });

  it('etudiant peut créer une offre (proposition)', async () => {
    db.prepare('INSERT INTO students (first_name, last_name, email) VALUES (?,?,?)').run('Alice', 'Martin', 'a@student.vinci.be');
    const studentId = (db.prepare('SELECT id FROM students WHERE email=?').get('a@student.vinci.be') as { id: number }).id;
    const etudiant = await loginAsEtudiant('a@student.vinci.be');
    const res = await etudiant.agent
      .post('/api/offers')
      .set('x-csrf-token', etudiant.csrfToken)
      .send({ company_id: companyId, priority_contact_id: contactId, contact_ids: [contactId], description: 'Proposition', remote_allowed: false });
    expect(res.status).toBe(201);
    expect(res.body.submitted_by_student_id).toBe(studentId);
  });

  it('entreprise ne peut pas valider une offre', async () => {
    const entreprise = await loginAsEntreprise(companyId);
    const res = await entreprise.agent
      .post(`/api/offers/${offerId}/validate`)
      .set('x-csrf-token', entreprise.csrfToken);
    expect(res.status).toBe(403);
  });

  it("le lecteur ne voit pas une offre soumise en liste ni en détail (403)", async () => {
    const entreprise = await loginAsEntreprise(companyId);
    const soumiseRes = await entreprise.agent
      .post('/api/offers')
      .set('x-csrf-token', entreprise.csrfToken)
      .send({ company_id: companyId, priority_contact_id: contactId, contact_ids: [contactId], description: 'Soumise', remote_allowed: false });
    expect(soumiseRes.body.status).toBe('soumise');

    const lecteur = await loginAsLecteur();
    const list = await lecteur.agent.get('/api/offers');
    expect(list.body.map((o: { id: number }) => o.id)).not.toContain(soumiseRes.body.id);
    expect(list.body.map((o: { id: number }) => o.id)).toContain(offerId); // validee_et_visible, créée par le gestionnaire

    const detail = await lecteur.agent.get(`/api/offers/${soumiseRes.body.id}`);
    expect(detail.status).toBe(403);
  });

  it('GET /api/offers/:id/dependencies est réservé au gestionnaire', async () => {
    const lecteur = await loginAsLecteur();
    expect((await lecteur.agent.get(`/api/offers/${offerId}/dependencies`)).status).toBe(403);
    expect((await request(testServer).get(`/api/offers/${offerId}/dependencies`)).status).toBe(401);
    expect((await manager.agent.get(`/api/offers/${offerId}/dependencies`)).status).toBe(200);
  });
});

describe('access control — applications routes', () => {
  let db: Database;
  let manager: AuthenticatedAgent;
  let companyId: number;
  let otherCompanyId: number;
  let contactId: number;
  let offerId: number;
  const studentEmail = 'alice@student.vinci.be';
  let applicationId: number;

  beforeEach(async () => {
    db = createTestDb();
    setDb(db);
    manager = await loginAsGestionnaire();

    companyId = insertCompany(db, { name: 'Acme', general_email: 'acme@acme.com' }).id;
    otherCompanyId = insertCompany(db, { name: 'Other', general_email: 'other@other.com' }).id;
    contactId = insertContact(db, companyId, {
      first_name: 'Jean', last_name: 'Dupont', email: 'j@d.com', roles: ['maitre_de_stage'],
    }).id;

    // Create and validate an offer belonging to companyId
    const offerRes = await manager.agent
      .post('/api/offers')
      .set('x-csrf-token', manager.csrfToken)
      .send({ company_id: companyId, priority_contact_id: contactId, contact_ids: [contactId], description: 'Test', remote_allowed: false });
    offerId = offerRes.body.id;
    await manager.agent.post(`/api/offers/${offerId}/validate`).set('x-csrf-token', manager.csrfToken);

    // Insert a student and have them apply
    db.prepare('INSERT INTO students (first_name, last_name, email) VALUES (?,?,?)').run('Alice', 'Martin', studentEmail);

    const etudiant = await loginAsEtudiant(studentEmail);
    const applyRes = await etudiant.agent.post(`/api/offers/${offerId}/applications`).set('x-csrf-token', etudiant.csrfToken);
    applicationId = applyRes.body.id;
  });

  afterEach(() => db.close());

  it('entreprise reçoit 403 sur GET /api/offers/:offerId/applications d\'une offre qui ne lui appartient pas', async () => {
    const entreprise = await loginAsEntreprise(otherCompanyId);
    const res = await entreprise.agent.get(`/api/offers/${offerId}/applications`);
    expect(res.status).toBe(403);
  });

  it('etudiant reçoit 403 sur POST /api/offers/:offerId/select-candidate', async () => {
    const etudiant = await loginAsEtudiant(studentEmail);
    const res = await etudiant.agent
      .post(`/api/offers/${offerId}/select-candidate`)
      .set('x-csrf-token', etudiant.csrfToken)
      .send({ application_id: applicationId });
    expect(res.status).toBe(403);
  });

  it('entreprise peut POST select-candidate sur sa propre offre et celle-ci passe à prise', async () => {
    const entreprise = await loginAsEntreprise(companyId);
    const res = await entreprise.agent
      .post(`/api/offers/${offerId}/select-candidate`)
      .set('x-csrf-token', entreprise.csrfToken)
      .send({ application_id: applicationId });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('prise');
  });
});

describe('access control — routes de modération gestionnaire (401/403)', () => {
  let db: Database;
  let manager: AuthenticatedAgent;
  let companyId: number;
  let contactId: number;

  beforeEach(async () => {
    db = createTestDb();
    setDb(db);
    manager = await loginAsGestionnaire();
    companyId = insertCompany(db, { name: 'Acme', general_email: 'acme@acme.com' }).id;
    contactId = insertContact(db, companyId, {
      first_name: 'Jean', last_name: 'Dupont', email: 'j@d.com', roles: ['maitre_de_stage'],
    }).id;
  });

  afterEach(() => db.close());

  // `label` decrit la route dans le titre du test : `path()` n'est resolu qu'a
  // l'execution (companyId/contactId sont encore undefined a la collecte).
  const moderationRoutes: { method: 'get' | 'post' | 'patch' | 'delete'; label: string; path: () => string }[] = [
    { method: 'get', label: '/api/companies/pending', path: () => '/api/companies/pending' },
    { method: 'post', label: '/api/companies/:id/validate', path: () => `/api/companies/${companyId}/validate` },
    { method: 'delete', label: '/api/companies/:id', path: () => `/api/companies/${companyId}` },
    { method: 'post', label: '/api/companies/contacts/:id/validate', path: () => `/api/companies/contacts/${contactId}/validate` },
    { method: 'patch', label: '/api/companies/contacts/:id', path: () => `/api/companies/contacts/${contactId}` },
    { method: 'delete', label: '/api/companies/contacts/:id', path: () => `/api/companies/contacts/${contactId}` },
  ];

  for (const { method, label, path } of moderationRoutes) {
    it(`${method.toUpperCase()} ${label} anonyme reçoit 401`, async () => {
      const res = await request(testServer)[method](path());
      expect(res.status).toBe(401);
    });

    it(`${method.toUpperCase()} ${label} lecteur reçoit 403`, async () => {
      const lecteur = await loginAsLecteur();
      const res = lecteur.agent[method](path()).set('x-csrf-token', lecteur.csrfToken);
      expect((await res).status).toBe(403);
    });

    it(`${method.toUpperCase()} ${label} étudiant reçoit 403`, async () => {
      db.prepare('INSERT INTO students (first_name, last_name, email) VALUES (?,?,?)').run('E', 'T', 'moderation-check@student.vinci.be');
      const etudiant = await loginAsEtudiant('moderation-check@student.vinci.be');
      const res = etudiant.agent[method](path()).set('x-csrf-token', etudiant.csrfToken);
      expect((await res).status).toBe(403);
    });
  }

  it('PATCH /api/offers/:id/assignment anonyme reçoit 401, étudiant reçoit 403', async () => {
    const offerRes = await manager.agent
      .post('/api/offers')
      .set('x-csrf-token', manager.csrfToken)
      .send({ company_id: companyId, priority_contact_id: contactId, contact_ids: [contactId], description: 'Test', remote_allowed: false });
    const offerId = offerRes.body.id;
    const assignment = { company_id: companyId, priority_contact_id: contactId, contact_ids: [contactId] };

    const anon = await request(testServer).patch(`/api/offers/${offerId}/assignment`).send(assignment);
    expect(anon.status).toBe(401);

    db.prepare('INSERT INTO students (first_name, last_name, email) VALUES (?,?,?)').run('E', 'T', 'assignment-check@student.vinci.be');
    const etudiant = await loginAsEtudiant('assignment-check@student.vinci.be');
    const res = await etudiant.agent
      .patch(`/api/offers/${offerId}/assignment`)
      .set('x-csrf-token', etudiant.csrfToken)
      .send(assignment);
    expect(res.status).toBe(403);
  });
});
