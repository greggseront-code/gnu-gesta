import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Database } from 'better-sqlite3';
import { app } from '../src/app';
import { createTestDb, setDb } from '../src/db/db.connection';
import { insertCompany, insertContact } from '../src/features/companies/companies.queries';
import { loginAsGestionnaire, loginAsEtudiant, loginAsEntreprise, type AuthenticatedAgent } from './helpers/authenticated-agent';

function insertStudent(db: Database, email: string, firstName = 'Etu', lastName = 'Diant') {
  db.prepare('INSERT INTO students (first_name, last_name, email) VALUES (?, ?, ?)').run(firstName, lastName, email);
}

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

  it('POST /api/offers créée par le gestionnaire est directement validée et visible', async () => {
    const res = await postAsManager(offer());
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('validee_et_visible');
    expect(res.body.company_id).toBe(companyId);
    expect(res.body.description).toBe('Stage développement React TypeScript');
  });

  it('POST /api/offers créée par une entreprise reste soumise', async () => {
    const entreprise = await loginAsEntreprise(companyId);
    const res = await entreprise.agent.post('/api/offers').set('x-csrf-token', entreprise.csrfToken).send(offer());
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('soumise');
  });

  it('POST /api/offers créée par un étudiant reste soumise', async () => {
    const student = await loginAsEtudiant(studentEmail);
    const res = await student.agent.post('/api/offers').set('x-csrf-token', student.csrfToken).send(offer());
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('soumise');
  });

  it("POST /api/offers refuse une deuxième soumission tant que la première d'un étudiant est soumise", async () => {
    const student = await loginAsEtudiant(studentEmail);
    const first = await student.agent.post('/api/offers').set('x-csrf-token', student.csrfToken).send(offer());
    expect(first.status).toBe(201);

    const second = await student.agent.post('/api/offers').set('x-csrf-token', student.csrfToken).send(offer());
    expect(second.status).toBe(409);
    expect(second.body.existing_offer_id).toBe(first.body.id);
  });

  it("POST /api/offers autorise une nouvelle soumission après validation de la précédente", async () => {
    const student = await loginAsEtudiant(studentEmail);
    const first = await student.agent.post('/api/offers').set('x-csrf-token', student.csrfToken).send(offer());
    await manager.agent.post(`/api/offers/${first.body.id}/validate`).set('x-csrf-token', manager.csrfToken);

    const second = await student.agent.post('/api/offers').set('x-csrf-token', student.csrfToken).send(offer());
    expect(second.status).toBe(201);
  });

  it("POST /api/offers autorise une nouvelle soumission après refus de la précédente", async () => {
    const student = await loginAsEtudiant(studentEmail);
    const first = await student.agent.post('/api/offers').set('x-csrf-token', student.csrfToken).send(offer());
    await manager.agent.post(`/api/offers/${first.body.id}/reject`).set('x-csrf-token', manager.csrfToken);

    const second = await student.agent.post('/api/offers').set('x-csrf-token', student.csrfToken).send(offer());
    expect(second.status).toBe(201);
  });

  it("POST /api/offers n'applique pas la limite d'une offre en attente aux entreprises", async () => {
    const entreprise = await loginAsEntreprise(companyId);
    const first = await entreprise.agent.post('/api/offers').set('x-csrf-token', entreprise.csrfToken).send(offer());
    expect(first.status).toBe(201);

    const second = await entreprise.agent.post('/api/offers').set('x-csrf-token', entreprise.csrfToken).send(offer());
    expect(second.status).toBe(201);
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

  it('les réponses d\'offre incluent company_name et submitted_by_student_name', async () => {
    const created = await postAsManager(offer());
    expect(created.body.company_name).toBe('Acme');
    expect(created.body.submitted_by_student_name).toBeNull();

    const student = await loginAsEtudiant(studentEmail);
    const studentOffer = await student.agent.post('/api/offers').set('x-csrf-token', student.csrfToken).send(offer());
    expect(studentOffer.body.company_name).toBe('Acme');
    expect(studentOffer.body.submitted_by_student_name).toBe('Alice Martin');

    const list = await manager.agent.get('/api/offers');
    const fromList = list.body.find((o: { id: number }) => o.id === studentOffer.body.id);
    expect(fromList.company_name).toBe('Acme');
    expect(fromList.submitted_by_student_name).toBe('Alice Martin');

    const detail = await manager.agent.get(`/api/offers/${studentOffer.body.id}`);
    expect(detail.body.company_name).toBe('Acme');
    expect(detail.body.submitted_by_student_name).toBe('Alice Martin');
  });

  it('GET /api/offers etudiant voit uniquement validee_et_visible + ses propositions', async () => {
    // Offer A: créée par le gestionnaire → directement validee_et_visible, visible à tous
    await postAsManager(offer());
    // Offer B: soumise par l'étudiante Alice → visible seulement à elle
    const student = await loginAsEtudiant(studentEmail);
    await student.agent.post('/api/offers').set('x-csrf-token', student.csrfToken).send(offer());

    const res = await student.agent.get('/api/offers');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2); // A (validée, visible à tous) + B (own)
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
    const entreprise = await loginAsEntreprise(companyId);
    const created = (await entreprise.agent.post('/api/offers').set('x-csrf-token', entreprise.csrfToken).send(offer())).body;
    expect(created.status).toBe('soumise');

    const res = await manager.agent.post(`/api/offers/${created.id}/validate`).set('x-csrf-token', manager.csrfToken);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('validee_et_visible');
  });

  it("POST /api/offers/:id/validate est bloqué (409) tant que l'entreprise ou un contact est en attente", async () => {
    const alice = await loginAsEtudiant(studentEmail);
    const pendingCompanyRes = await alice.agent
      .post('/api/companies')
      .set('x-csrf-token', alice.csrfToken)
      .send({
        name: 'Pending Co',
        general_email: 'contact@pendingco.com',
        contacts: [{ first_name: 'P', last_name: 'C', email: 'p@pendingco.com', roles: ['maitre_de_stage'] }],
      });
    const pendingCompany = pendingCompanyRes.body;
    const pendingContactId = pendingCompany.contacts[0].id;

    const offerRes = await alice.agent
      .post('/api/offers')
      .set('x-csrf-token', alice.csrfToken)
      .send({
        company_id: pendingCompany.id,
        priority_contact_id: pendingContactId,
        contact_ids: [pendingContactId],
        description: 'Stage chez une entreprise proposée',
        remote_allowed: false,
      });
    expect(offerRes.status).toBe(201);
    expect(offerRes.body.status).toBe('soumise');

    const res = await manager.agent.post(`/api/offers/${offerRes.body.id}/validate`).set('x-csrf-token', manager.csrfToken);
    expect(res.status).toBe(409);
    expect(res.body.company_pending).toBe(true);
    expect(res.body.pending_contact_ids).toContain(pendingContactId);
  });

  it('GET /api/offers/:id/dependencies expose les dépendances en attente au gestionnaire', async () => {
    const alice = await loginAsEtudiant(studentEmail);
    const pendingCompanyRes = await alice.agent
      .post('/api/companies')
      .set('x-csrf-token', alice.csrfToken)
      .send({
        name: 'Pending Co',
        general_email: 'contact@pendingco.com',
        contacts: [{ first_name: 'P', last_name: 'C', email: 'p@pendingco.com', roles: ['maitre_de_stage'] }],
      });
    const pendingCompany = pendingCompanyRes.body;
    const pendingContactId = pendingCompany.contacts[0].id;
    const offerRes = await alice.agent
      .post('/api/offers')
      .set('x-csrf-token', alice.csrfToken)
      .send({
        company_id: pendingCompany.id,
        priority_contact_id: pendingContactId,
        contact_ids: [pendingContactId],
        description: 'Stage',
        remote_allowed: false,
      });

    const res = await manager.agent.get(`/api/offers/${offerRes.body.id}/dependencies`);
    expect(res.status).toBe(200);
    expect(res.body.company_pending).toBe(true);
    expect(res.body.pending_contact_ids).toContain(pendingContactId);
  });

  it("un étudiant ne peut pas créer une offre avec l'entreprise en attente d'un autre étudiant", async () => {
    insertStudent(db, 'bob@student.vinci.be');
    const alice = await loginAsEtudiant(studentEmail);
    const bob = await loginAsEtudiant('bob@student.vinci.be');

    const pendingCompanyRes = await alice.agent
      .post('/api/companies')
      .set('x-csrf-token', alice.csrfToken)
      .send({
        name: 'Alice Only Co',
        general_email: 'contact@aliceonly.com',
        contacts: [{ first_name: 'P', last_name: 'C', email: 'p@aliceonly.com', roles: ['maitre_de_stage'] }],
      });
    const pendingCompany = pendingCompanyRes.body;
    const pendingContactId = pendingCompany.contacts[0].id;

    const res = await bob.agent
      .post('/api/offers')
      .set('x-csrf-token', bob.csrfToken)
      .send({
        company_id: pendingCompany.id,
        priority_contact_id: pendingContactId,
        contact_ids: [pendingContactId],
        description: 'Stage usurpé',
        remote_allowed: false,
      });
    expect(res.status).toBe(404);
  });

  it("POST /api/offers avec un contact n'appartenant pas à l'entreprise retourne 400", async () => {
    const otherContact = insertContact(db, company2Id, {
      first_name: 'Autre', last_name: 'Contact', email: 'autre@beta.com', roles: ['maitre_de_stage'],
    });
    const res = await postAsManager({ ...offer(), contact_ids: [contactId, otherContact.id] });
    expect(res.status).toBe(400);
  });

  it('POST /api/offers avec priority_contact_id absent de contact_ids retourne 400', async () => {
    const otherContact = insertContact(db, companyId, {
      first_name: 'Autre', last_name: 'Contact', email: 'autre2@acme.com', roles: ['maitre_de_stage'],
    });
    const res = await postAsManager({ ...offer(), priority_contact_id: otherContact.id, contact_ids: [contactId] });
    expect(res.status).toBe(400);
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

  // ─── Réaffectation atomique (PATCH /:id/assignment, remplace PATCH /:id/company) ──────────────

  describe('PATCH /api/offers/:id/assignment', () => {
    let company2ContactId: number;

    beforeEach(() => {
      company2ContactId = insertContact(db, company2Id, {
        first_name: 'Beta', last_name: 'Contact', email: 'beta-contact@beta.com', roles: ['maitre_de_stage'],
      }).id;
    });

    it('remplace atomiquement entreprise, contact prioritaire et contacts associés', async () => {
      const created = (await postAsManager(offer())).body;

      const res = await manager.agent
        .patch(`/api/offers/${created.id}/assignment`)
        .set('x-csrf-token', manager.csrfToken)
        .send({ company_id: company2Id, priority_contact_id: company2ContactId, contact_ids: [company2ContactId] });

      expect(res.status).toBe(200);
      expect(res.body.company_id).toBe(company2Id);
      expect(res.body.priority_contact_id).toBe(company2ContactId);

      const detail = await manager.agent.get(`/api/offers/${created.id}`);
      const deps = await manager.agent.get(`/api/offers/${created.id}/dependencies`);
      expect(detail.body.company_id).toBe(company2Id);
      expect(deps.body.company_pending).toBe(false);
      expect(deps.body.pending_contact_ids).toHaveLength(0);
    });

    it("exige une entreprise et des contacts déjà validés (409 sinon)", async () => {
      const alice = await loginAsEtudiant(studentEmail);
      const pendingCompanyRes = await alice.agent
        .post('/api/companies')
        .set('x-csrf-token', alice.csrfToken)
        .send({
          name: 'Pending Co',
          general_email: 'contact@pendingco.com',
          contacts: [{ first_name: 'P', last_name: 'C', email: 'p@pendingco.com', roles: ['maitre_de_stage'] }],
        });
      const pendingCompany = pendingCompanyRes.body;
      const pendingContactId = pendingCompany.contacts[0].id;
      const created = (await postAsManager(offer())).body;

      const res = await manager.agent
        .patch(`/api/offers/${created.id}/assignment`)
        .set('x-csrf-token', manager.csrfToken)
        .send({ company_id: pendingCompany.id, priority_contact_id: pendingContactId, contact_ids: [pendingContactId] });

      expect(res.status).toBe(409);
    });

    it("rejette (400) un contact n'appartenant pas à l'entreprise choisie, sans modifier l'affectation initiale", async () => {
      const created = (await postAsManager(offer())).body;

      const res = await manager.agent
        .patch(`/api/offers/${created.id}/assignment`)
        .set('x-csrf-token', manager.csrfToken)
        .send({ company_id: company2Id, priority_contact_id: contactId, contact_ids: [contactId] }); // contactId appartient à companyId, pas company2Id

      expect(res.status).toBe(400);

      // L'affectation initiale n'a pas bougé.
      const detail = await manager.agent.get(`/api/offers/${created.id}`);
      expect(detail.body.company_id).toBe(companyId);
      expect(detail.body.priority_contact_id).toBe(contactId);
    });

    it('non gestionnaire reçoit 403', async () => {
      const created = (await postAsManager(offer())).body;
      const entreprise = await loginAsEntreprise(companyId);
      const res = await entreprise.agent
        .patch(`/api/offers/${created.id}/assignment`)
        .set('x-csrf-token', entreprise.csrfToken)
        .send({ company_id: company2Id, priority_contact_id: company2ContactId, contact_ids: [company2ContactId] });
      expect(res.status).toBe(403);
    });

    it('débloque ensuite le refus de la soumission de l\'ancienne entreprise', async () => {
      const alice = await loginAsEtudiant(studentEmail);
      const pendingCompanyRes = await alice.agent
        .post('/api/companies')
        .set('x-csrf-token', alice.csrfToken)
        .send({
          name: 'Pending Co',
          general_email: 'contact@pendingco.com',
          contacts: [{ first_name: 'P', last_name: 'C', email: 'p@pendingco.com', roles: ['maitre_de_stage'] }],
        });
      const pendingCompany = pendingCompanyRes.body;
      const pendingContactId = pendingCompany.contacts[0].id;

      const offerRes = await alice.agent
        .post('/api/offers')
        .set('x-csrf-token', alice.csrfToken)
        .send({
          company_id: pendingCompany.id,
          priority_contact_id: pendingContactId,
          contact_ids: [pendingContactId],
          description: 'Stage',
          remote_allowed: false,
        });

      // Refus bloqué tant que l'offre référence encore l'entreprise en attente.
      const blocked = await manager.agent.delete(`/api/companies/${pendingCompany.id}`).set('x-csrf-token', manager.csrfToken);
      expect(blocked.status).toBe(409);

      // Réaffectation vers l'entreprise validée existante.
      await manager.agent
        .patch(`/api/offers/${offerRes.body.id}/assignment`)
        .set('x-csrf-token', manager.csrfToken)
        .send({ company_id: companyId, priority_contact_id: contactId, contact_ids: [contactId] });

      // Le refus de l'ancienne entreprise n'est plus bloqué.
      const unblocked = await manager.agent.delete(`/api/companies/${pendingCompany.id}`).set('x-csrf-token', manager.csrfToken);
      expect(unblocked.status).toBe(204);
    });
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

  // ─── Vérification transversale (tâche 009) ────────────────────────

  it("un étudiant ne voit pas l'offre soumise d'un autre étudiant", async () => {
    insertStudent(db, 'bob@student.vinci.be');
    const alice = await loginAsEtudiant(studentEmail);
    const bob = await loginAsEtudiant('bob@student.vinci.be');

    const aliceOffer = (await alice.agent.post('/api/offers').set('x-csrf-token', alice.csrfToken).send(offer())).body;
    expect(aliceOffer.status).toBe('soumise');

    const bobList = await bob.agent.get('/api/offers');
    expect(bobList.body.map((o: { id: number }) => o.id)).not.toContain(aliceOffer.id);

    const bobDetail = await bob.agent.get(`/api/offers/${aliceOffer.id}`);
    expect(bobDetail.status).toBe(403);

    const managerDetail = await manager.agent.get(`/api/offers/${aliceOffer.id}`);
    expect(managerDetail.status).toBe(200);
  });

  it('cycle complet : proposition étudiante, contrôle des données, validation de l\'offre, puis visibilité pour un autre étudiant', async () => {
    insertStudent(db, 'bob@student.vinci.be');
    const alice = await loginAsEtudiant(studentEmail);
    const bob = await loginAsEtudiant('bob@student.vinci.be');

    // 1. Alice propose une nouvelle entreprise (en attente) avec son premier contact.
    const companyRes = await alice.agent
      .post('/api/companies')
      .set('x-csrf-token', alice.csrfToken)
      .send({
        name: 'Cycle Complet SPRL',
        general_email: 'contact@cyclecomplet.com',
        contacts: [{ first_name: 'Marc', last_name: 'Petit', email: 'marc@cyclecomplet.com', roles: ['maitre_de_stage'] }],
      });
    expect(companyRes.status).toBe(201);
    const pendingCompany = companyRes.body;
    const pendingContactId = pendingCompany.contacts[0].id;
    expect(pendingCompany.validation_status).toBe('pending');

    // 2. Alice soumet sa proposition de stage avec cette entreprise en attente.
    const offerRes = await alice.agent
      .post('/api/offers')
      .set('x-csrf-token', alice.csrfToken)
      .send({
        company_id: pendingCompany.id,
        priority_contact_id: pendingContactId,
        contact_ids: [pendingContactId],
        description: 'Stage cycle complet',
        remote_allowed: false,
      });
    expect(offerRes.status).toBe(201);
    expect(offerRes.body.status).toBe('soumise');
    const offerId = offerRes.body.id;

    // 3. Bob (un autre étudiant) ne voit ni l'entreprise en attente ni l'offre d'Alice.
    const bobCompanies = await bob.agent.get('/api/companies');
    expect(bobCompanies.body.map((c: { id: number }) => c.id)).not.toContain(pendingCompany.id);
    const bobOffers = await bob.agent.get('/api/offers');
    expect(bobOffers.body.map((o: { id: number }) => o.id)).not.toContain(offerId);

    // 4. Le gestionnaire ne peut pas encore valider l'offre : l'entreprise est en attente.
    const blockedValidate = await manager.agent.post(`/api/offers/${offerId}/validate`).set('x-csrf-token', manager.csrfToken);
    expect(blockedValidate.status).toBe(409);

    // 5. Le gestionnaire valide l'entreprise (et son premier contact) depuis la file de modération.
    const pendingQueue = await manager.agent.get('/api/companies/pending');
    expect(pendingQueue.body.companies.map((c: { id: number }) => c.id)).toContain(pendingCompany.id);
    const acceptCompany = await manager.agent.post(`/api/companies/${pendingCompany.id}/validate`).set('x-csrf-token', manager.csrfToken);
    expect(acceptCompany.status).toBe(200);
    expect(acceptCompany.body.validation_status).toBe('validated');
    expect(acceptCompany.body.contacts[0].validation_status).toBe('validated');

    // 6. Le gestionnaire peut désormais valider l'offre.
    const validateRes = await manager.agent.post(`/api/offers/${offerId}/validate`).set('x-csrf-token', manager.csrfToken);
    expect(validateRes.status).toBe(200);
    expect(validateRes.body.status).toBe('validee_et_visible');

    // 7. Bob voit maintenant l'offre publiée (et l'entreprise, désormais validée).
    const bobOffersAfter = await bob.agent.get('/api/offers');
    expect(bobOffersAfter.body.map((o: { id: number }) => o.id)).toContain(offerId);
    const bobCompaniesAfter = await bob.agent.get('/api/companies');
    expect(bobCompaniesAfter.body.map((c: { id: number }) => c.id)).toContain(pendingCompany.id);
  });
});
