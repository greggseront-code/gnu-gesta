import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import { createTestDb, setDb } from '../src/db/db.connection';
import { insertCompany, insertContact } from '../src/features/companies/companies.queries';
import { loginAsGestionnaire, loginAsEtudiant, loginAsEntreprise, type AuthenticatedAgent } from './helpers/authenticated-agent';

describe('applications backend', () => {
  let db: Database;
  let manager: AuthenticatedAgent;
  let companyId: number;
  let contactId: number;
  let offerId: number;
  const studentEmail = 'alice@student.vinci.be';
  const student2Email = 'bob@student.vinci.be';
  let studentId: number;
  let student2Id: number;

  beforeEach(async () => {
    db = createTestDb();
    setDb(db);
    manager = await loginAsGestionnaire();

    const company = insertCompany(db, { name: 'Acme', general_email: 'contact@acme.com' });
    companyId = company.id;

    const contact = insertContact(db, companyId, {
      first_name: 'Jean', last_name: 'Dupont', email: 'jean@acme.com', roles: ['maitre_de_stage'],
    });
    contactId = contact.id;

    const offerRes = await manager.agent
      .post('/api/offers')
      .set('x-csrf-token', manager.csrfToken)
      .send({
        company_id: companyId,
        priority_contact_id: contactId,
        contact_ids: [contactId],
        description: 'Stage TypeScript',
        remote_allowed: false,
      });
    offerId = offerRes.body.id;

    await manager.agent.post(`/api/offers/${offerId}/validate`).set('x-csrf-token', manager.csrfToken);

    db.prepare('INSERT INTO students (first_name, last_name, email) VALUES (?, ?, ?)').run('Alice', 'Martin', studentEmail);
    studentId = (db.prepare('SELECT id FROM students WHERE email = ?').get(studentEmail) as { id: number }).id;

    db.prepare('INSERT INTO students (first_name, last_name, email) VALUES (?, ?, ?)').run('Bob', 'Durand', student2Email);
    student2Id = (db.prepare('SELECT id FROM students WHERE email = ?').get(student2Email) as { id: number }).id;
  });

  afterEach(() => db.close());

  const applyAs = async (email: string) => {
    const student = await loginAsEtudiant(email);
    const res = await student.agent
      .post(`/api/offers/${offerId}/applications`)
      .set('x-csrf-token', student.csrfToken)
      .send();
    return { student, res };
  };

  // ─── POST /api/offers/:offerId/applications ──────────────────────

  it('étudiant peut postuler à une offre (201)', async () => {
    const { res } = await applyAs(studentEmail);
    expect(res.status).toBe(201);
    expect(res.body.offer_id).toBe(offerId);
    expect(res.body.student_id).toBe(studentId);
    expect(res.body.selected).toBe(0);
  });

  it('double postulation retourne 409', async () => {
    const student = await loginAsEtudiant(studentEmail);
    await student.agent.post(`/api/offers/${offerId}/applications`).set('x-csrf-token', student.csrfToken);

    const res = await student.agent.post(`/api/offers/${offerId}/applications`).set('x-csrf-token', student.csrfToken);
    expect(res.status).toBe(409);
  });

  it('gestionnaire ne peut pas postuler (403)', async () => {
    const res = await manager.agent.post(`/api/offers/${offerId}/applications`).set('x-csrf-token', manager.csrfToken);
    expect(res.status).toBe(403);
  });

  // ─── GET /api/offers/:offerId/applications ───────────────────────

  it('gestionnaire peut lister les candidatures d\'une offre', async () => {
    await applyAs(studentEmail);
    await applyAs(student2Email);

    const res = await manager.agent.get(`/api/offers/${offerId}/applications`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    const studentIds = res.body.map((a: { student_id: number }) => a.student_id);
    expect(studentIds).toContain(studentId);
  });

  it('entreprise peut lister les candidatures de sa propre offre', async () => {
    await applyAs(studentEmail);

    const entreprise = await loginAsEntreprise(companyId);
    const res = await entreprise.agent.get(`/api/offers/${offerId}/applications`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('entreprise reçoit 403 sur les candidatures d\'une offre qui ne lui appartient pas', async () => {
    const otherCompany = insertCompany(db, { name: 'Other', general_email: 'other@other.com' });
    const entreprise = await loginAsEntreprise(otherCompany.id);

    const res = await entreprise.agent.get(`/api/offers/${offerId}/applications`);
    expect(res.status).toBe(403);
  });

  // ─── GET /api/students/:studentId/applications ───────────────────

  it('étudiant peut lister ses propres candidatures', async () => {
    const { student } = await applyAs(studentEmail);

    const res = await student.agent.get(`/api/students/${studentId}/applications`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].offer_id).toBe(offerId);
  });

  it('étudiant reçoit 403 en consultant les candidatures d\'un autre étudiant', async () => {
    const student = await loginAsEtudiant(studentEmail);
    const res = await student.agent.get(`/api/students/${student2Id}/applications`);
    expect(res.status).toBe(403);
  });

  it('gestionnaire peut consulter les candidatures d\'un étudiant quelconque', async () => {
    await applyAs(studentEmail);

    const res = await manager.agent.get(`/api/students/${studentId}/applications`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  // ─── POST /api/offers/:offerId/select-candidate ──────────────────

  it('entreprise peut sélectionner un candidat et l\'offre passe à prise', async () => {
    const { res: applyRes } = await applyAs(studentEmail);
    const applicationId = applyRes.body.id;

    const entreprise = await loginAsEntreprise(companyId);
    const res = await entreprise.agent
      .post(`/api/offers/${offerId}/select-candidate`)
      .set('x-csrf-token', entreprise.csrfToken)
      .send({ application_id: applicationId });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('prise');
  });

  it('gestionnaire reçoit 403 sur select-candidate', async () => {
    const { res: applyRes } = await applyAs(studentEmail);
    const applicationId = applyRes.body.id;

    const res = await manager.agent
      .post(`/api/offers/${offerId}/select-candidate`)
      .set('x-csrf-token', manager.csrfToken)
      .send({ application_id: applicationId });
    expect(res.status).toBe(403);
  });

  it('entreprise reçoit 403 sur select-candidate d\'une offre qui ne lui appartient pas', async () => {
    const { res: applyRes } = await applyAs(studentEmail);
    const applicationId = applyRes.body.id;

    const otherCompany = insertCompany(db, { name: 'Other', general_email: 'other@other.com' });
    const entreprise = await loginAsEntreprise(otherCompany.id);

    const res = await entreprise.agent
      .post(`/api/offers/${offerId}/select-candidate`)
      .set('x-csrf-token', entreprise.csrfToken)
      .send({ application_id: applicationId });
    expect(res.status).toBe(403);
  });

  // ─── Nouvelles tests de sécurité ─────────────────────────────────

  it('postuler à une offre non-validée retourne 422', async () => {
    // Create a new offer that stays in "soumise" status (not validated)
    const offerRes = await manager.agent
      .post('/api/offers')
      .set('x-csrf-token', manager.csrfToken)
      .send({
        company_id: companyId,
        priority_contact_id: contactId,
        contact_ids: [contactId],
        description: 'Stage non validé',
        remote_allowed: false,
      });
    const nonValidatedOfferId = offerRes.body.id;

    const student = await loginAsEtudiant(studentEmail);
    const res = await student.agent
      .post(`/api/offers/${nonValidatedOfferId}/applications`)
      .set('x-csrf-token', student.csrfToken);
    expect(res.status).toBe(422);
  });

  it('IDOR bloqué: select-candidate avec un application_id d\'une autre offre retourne 400', async () => {
    // Create a second company and offer
    const otherCompany = insertCompany(db, { name: 'OtherCo', general_email: 'other@other.com' });
    const otherContact = insertContact(db, otherCompany.id, {
      first_name: 'Marc', last_name: 'Leroy', email: 'marc@other.com', roles: ['maitre_de_stage'],
    });

    const offer2Res = await manager.agent
      .post('/api/offers')
      .set('x-csrf-token', manager.csrfToken)
      .send({
        company_id: otherCompany.id,
        priority_contact_id: otherContact.id,
        contact_ids: [otherContact.id],
        description: 'Stage OtherCo',
        remote_allowed: false,
      });
    const offer2Id = offer2Res.body.id;

    await manager.agent.post(`/api/offers/${offer2Id}/validate`).set('x-csrf-token', manager.csrfToken);

    // Student A applies to offer 1
    const { res: applyRes } = await applyAs(studentEmail);
    const applicationFromOffer1 = applyRes.body.id;

    // Entreprise of offer 2 tries to select the application from offer 1 — IDOR attempt
    const entreprise = await loginAsEntreprise(otherCompany.id);
    const res = await entreprise.agent
      .post(`/api/offers/${offer2Id}/select-candidate`)
      .set('x-csrf-token', entreprise.csrfToken)
      .send({ application_id: applicationFromOffer1 });
    expect(res.status).toBe(400);
  });

  it('après select-candidate, la candidature sélectionnée a selected === 1', async () => {
    const { res: applyRes } = await applyAs(studentEmail);
    const applicationId = applyRes.body.id;

    const entreprise = await loginAsEntreprise(companyId);
    await entreprise.agent
      .post(`/api/offers/${offerId}/select-candidate`)
      .set('x-csrf-token', entreprise.csrfToken)
      .send({ application_id: applicationId });

    // Verify the application is marked as selected in the DB
    const application = db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .get(applicationId) as { selected: number };
    expect(application.selected).toBe(1);
  });

  it('double select-candidate retourne 409', async () => {
    const { res: applyRes } = await applyAs(studentEmail);
    const applicationId = applyRes.body.id;

    const entreprise = await loginAsEntreprise(companyId);
    await entreprise.agent
      .post(`/api/offers/${offerId}/select-candidate`)
      .set('x-csrf-token', entreprise.csrfToken)
      .send({ application_id: applicationId });

    const res = await entreprise.agent
      .post(`/api/offers/${offerId}/select-candidate`)
      .set('x-csrf-token', entreprise.csrfToken)
      .send({ application_id: applicationId });
    expect(res.status).toBe(409);
  });
});
