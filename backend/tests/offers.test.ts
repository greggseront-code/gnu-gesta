import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Database } from 'better-sqlite3';
import { app } from '../src/app';
import { createTestDb, setDb } from '../src/db/db.connection';
import { insertCompany, insertContact } from '../src/features/companies/companies.queries';
import { loginAsGestionnaire, loginAsEtudiant, loginAsEntreprise, type AuthenticatedAgent } from './helpers/authenticated-agent';

describe('offers backend', () => {
  let db: Database;
  let manager: AuthenticatedAgent;
  let companyId: number;
  let company2Id: number;
  let contactId: number;
  const studentEmail = 'alice@student.vinci.be';

  beforeEach(async () => {
    db = createTestDb();
    setDb(db);
    manager = await loginAsGestionnaire();

    const company = insertCompany(db, { name: 'Acme', general_email: 'contact@acme.com' });
    companyId = company.id;
    const company2 = insertCompany(db, { name: 'Beta', general_email: 'contact@beta.com' });
    company2Id = company2.id;

    const contact = insertContact(db, companyId, {
      first_name: 'Jean', last_name: 'Dupont', email: 'jean@acme.com', roles: ['maitre_de_stage'],
    });
    contactId = contact.id;

    db.prepare('INSERT INTO students (first_name, last_name, email) VALUES (?, ?, ?)').run('Alice', 'Martin', studentEmail);
  });

  afterEach(() => db.close());

  const offer = () => ({
    company_id: companyId,
    priority_contact_id: contactId,
    contact_ids: [contactId],
    description: 'Stage développement React TypeScript',
    location: 'Bruxelles',
    technologies: 'React, TypeScript, Node.js',
    remote_allowed: false,
  });

  const postAsManager = (body: object) =>
    manager.agent.post('/api/offers').set('x-csrf-token', manager.csrfToken).send(body);

  // ─── Création ───────────────────────────────────────────────────

  it('POST /api/offers crée une offre avec statut soumise', async () => {
    const res = await postAsManager(offer());
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('soumise');
    expect(res.body.company_id).toBe(companyId);
    expect(res.body.description).toBe('Stage développement React TypeScript');
  });

  it('POST /api/offers sans priority_contact_id retourne 400', async () => {
    const { priority_contact_id: _, ...body } = offer();
    const res = await postAsManager(body);
    expect(res.status).toBe(400);
  });

  it('POST /api/offers avec remote_allowed:true sans remote_percentage retourne 400', async () => {
    const res = await postAsManager({ ...offer(), remote_allowed: true });
    expect(res.status).toBe(400);
  });

  // ─── Listing ────────────────────────────────────────────────────

  it('GET /api/offers gestionnaire voit toutes les offres', async () => {
    await postAsManager(offer());
    const res = await manager.agent.get('/api/offers');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('GET /api/offers etudiant voit uniquement validee_et_visible + ses propositions', async () => {
    // Offer A: soumise, not theirs → invisible
    const a = (await postAsManager(offer())).body;
    // Offer B: validee_et_visible → visible to all
    await manager.agent.post(`/api/offers/${a.id}/validate`).set('x-csrf-token', manager.csrfToken);
    // Offer C: soumise by student Alice → visible to Alice
    const student = await loginAsEtudiant(studentEmail);
    await student.agent.post('/api/offers').set('x-csrf-token', student.csrfToken).send(offer());

    const res = await student.agent.get('/api/offers');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2); // B (visible) + C (own)
  });

  it('GET /api/offers?search= filtre par description/technologies/location', async () => {
    await postAsManager(offer());
    await postAsManager({
      ...offer(), description: 'Stage Java Spring Boot', technologies: 'Java', location: 'Liège',
    });

    const res = await manager.agent.get('/api/offers?search=react');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].technologies).toContain('React');
  });

  it('GET /api/offers entreprise voit uniquement ses offres', async () => {
    await postAsManager(offer());
    await postAsManager({ ...offer(), company_id: company2Id });

    const entreprise = await loginAsEntreprise(companyId);
    const res = await entreprise.agent.get('/api/offers');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].company_id).toBe(companyId);
  });

  // ─── Workflow statuts ────────────────────────────────────────────

  it('POST /api/offers/:id/validate passe le statut à validee_et_visible', async () => {
    const created = (await postAsManager(offer())).body;
    const res = await manager.agent.post(`/api/offers/${created.id}/validate`).set('x-csrf-token', manager.csrfToken);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('validee_et_visible');
  });

  it('POST /api/offers/:id/reject passe le statut à refusee', async () => {
    const created = (await postAsManager(offer())).body;
    const res = await manager.agent.post(`/api/offers/${created.id}/reject`).set('x-csrf-token', manager.csrfToken);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('refusee');
  });

  it('POST /api/offers/:id/mark-unavailable passe le statut à non_disponible', async () => {
    const created = (await postAsManager(offer())).body;
    const res = await manager.agent.post(`/api/offers/${created.id}/mark-unavailable`).set('x-csrf-token', manager.csrfToken);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('non_disponible');
  });

  // ─── Modification ────────────────────────────────────────────────

  it('PATCH /api/offers/:id modifie la description', async () => {
    const created = (await postAsManager(offer())).body;
    const res = await manager.agent
      .patch(`/api/offers/${created.id}`)
      .set('x-csrf-token', manager.csrfToken)
      .send({ description: 'Stage Vue.js mis à jour' });
    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Stage Vue.js mis à jour');
  });

  it("PATCH /api/offers/:id/company change l'entreprise rattachée", async () => {
    const created = (await postAsManager(offer())).body;
    const res = await manager.agent
      .patch(`/api/offers/${created.id}/company`)
      .set('x-csrf-token', manager.csrfToken)
      .send({ company_id: company2Id });
    expect(res.status).toBe(200);
    expect(res.body.company_id).toBe(company2Id);
  });

  // ─── Upload ──────────────────────────────────────────────────────

  it('POST /api/offers/:id/attachment upload un fichier PDF', async () => {
    const created = (await postAsManager(offer())).body;
    const pdfBuf = Buffer.from('%PDF-1.4 minimal');
    const res = await manager.agent
      .post(`/api/offers/${created.id}/attachment`)
      .set('x-csrf-token', manager.csrfToken)
      .attach('file', pdfBuf, { filename: 'test.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
    expect(res.body.attachment_path).toBeTruthy();
  });

  it('POST /api/offers/:id/attachment rejette un fichier non autorisé', async () => {
    const created = (await postAsManager(offer())).body;
    const res = await manager.agent
      .post(`/api/offers/${created.id}/attachment`)
      .set('x-csrf-token', manager.csrfToken)
      .attach('file', Buffer.from('data'), { filename: 'virus.exe', contentType: 'application/octet-stream' });
    expect(res.status).toBe(400);
  });

  it('GET /api/offers anonyme reçoit 401', async () => {
    const res = await request(app).get('/api/offers');
    expect(res.status).toBe(401);
  });
});
