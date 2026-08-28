import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
import PizZip from 'pizzip';
import ExcelJS from 'exceljs';
import { createTestDb, setDb } from '../src/db/db.connection';
import { insertCompany, insertContact } from '../src/features/companies/companies.queries';
import { academicYearForDate } from '../src/features/internships/internships.service';
import { removeInternshipDocument } from '../src/features/internships/internship-documents.storage';
import {
  loginAsEntreprise,
  loginAsEtudiant,
  loginAsGestionnaire,
  loginAsLecteur,
  type AuthenticatedAgent,
} from './helpers/authenticated-agent';

function binaryParser(response: NodeJS.ReadableStream, callback: (error: Error | null, body?: Buffer) => void) {
  const chunks: Buffer[] = [];
  response.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
  response.on('end', () => callback(null, Buffer.concat(chunks)));
  response.on('error', (error) => callback(error as Error));
}

describe('internships backend', () => {
  let db: Database;
  let manager: AuthenticatedAgent;
  let student: AuthenticatedAgent;
  let companyAgent: AuthenticatedAgent;
  let companyId: number;
  let contactId: number;
  let studentId: number;
  let secondStudentId: number;

  beforeEach(async () => {
    db = createTestDb();
    setDb(db);
    const company = insertCompany(db, {
      name: 'Acme',
      address: '1 rue du Test, 1200 Bruxelles',
      general_email: 'contact@acme.test',
    });
    companyId = company.id;
    contactId = insertContact(db, companyId, {
      first_name: 'Jeanne',
      last_name: 'Martin',
      email: 'jeanne@acme.test',
      roles: ['maitre_de_stage'],
    }).id;
    studentId = Number(db.prepare(
      'INSERT INTO students (matricule, first_name, last_name, email) VALUES (?, ?, ?, ?) RETURNING id',
    ).pluck().get('S001', 'Alice', 'Dupont', 'alice@student.vinci.be'));
    secondStudentId = Number(db.prepare(
      'INSERT INTO students (matricule, first_name, last_name, email) VALUES (?, ?, ?, ?) RETURNING id',
    ).pluck().get('S002', 'Bob', 'Durand', 'bob@student.vinci.be'));
    db.prepare(
      'INSERT INTO student_academic_year_eligibility (student_id, academic_year) VALUES (?, ?), (?, ?)',
    ).run(studentId, '2029-2030', secondStudentId, '2029-2030');
    manager = await loginAsGestionnaire();
    student = await loginAsEtudiant('alice@student.vinci.be');
    companyAgent = await loginAsEntreprise(companyId);
  });

  afterEach(() => {
    const documents = db.prepare('SELECT storage_name FROM internship_documents').all() as { storage_name: string }[];
    for (const document of documents) removeInternshipDocument(document.storage_name);
    db.close();
  });

  async function createOffer(description = 'Stage TypeScript') {
    const response = await manager.agent.post('/api/offers').set('x-csrf-token', manager.csrfToken).send({
      company_id: companyId,
      priority_contact_id: contactId,
      contact_ids: [contactId],
      description,
      remote_allowed: false,
    });
    expect(response.status).toBe(201);
    return response.body.id as number;
  }

  async function createSelectedInternship() {
    const offerId = await createOffer();
    const application = await student.agent
      .post(`/api/offers/${offerId}/applications`)
      .set('x-csrf-token', student.csrfToken);
    expect(application.status).toBe(201);
    const selection = await companyAgent.agent
      .post(`/api/offers/${offerId}/select-candidate`)
      .set('x-csrf-token', companyAgent.csrfToken)
      .send({ application_id: application.body.id });
    expect(selection.status).toBe(200);
    const internship = db.prepare('SELECT * FROM internships WHERE origin_offer_id = ?').get(offerId) as { id: number };
    return { offerId, applicationId: application.body.id as number, internshipId: internship.id };
  }

  async function prepareInternship(internshipId: number) {
    return manager.agent.patch(`/api/internships/${internshipId}`).set('x-csrf-token', manager.csrfToken).send({
      start_date: '2030-03-01',
      end_date: '2030-06-30',
      signing_contact_id: contactId,
    });
  }

  it('calcule les frontières du 14 et du 15 septembre', () => {
    expect(academicYearForDate('2026-09-14')).toBe('2025-2026');
    expect(academicYearForDate('2026-09-15')).toBe('2026-2027');
  });

  it('la sélection crée atomiquement un dossier bloquant', async () => {
    const { offerId, applicationId, internshipId } = await createSelectedInternship();
    const internship = db.prepare('SELECT * FROM internships WHERE id = ?').get(internshipId) as {
      origin_type: string;
      student_id: number;
      status: string;
    };
    expect(internship).toMatchObject({ origin_type: 'candidature', student_id: studentId, status: 'preparation' });
    expect((db.prepare('SELECT status FROM offers WHERE id = ?').get(offerId) as { status: string }).status).toBe('prise');
    expect((db.prepare('SELECT selected FROM applications WHERE id = ?').get(applicationId) as { selected: number }).selected).toBe(1);

    const annualList = await manager.agent.get('/api/internships?academic_year=2029-2030');
    expect(annualList.status).toBe(200);
    expect(annualList.body.find((row: { student_id: number }) => row.student_id === studentId)).toMatchObject({
      has_internship: true,
      internship_id: internshipId,
      status: 'preparation',
    });

    const secondOffer = await createOffer('Autre stage');
    const blockedApplication = await student.agent
      .post(`/api/offers/${secondOffer}/applications`)
      .set('x-csrf-token', student.csrfToken);
    expect(blockedApplication.status).toBe(409);

    const blockedProposal = await student.agent.post('/api/offers').set('x-csrf-token', student.csrfToken).send({
      company_id: companyId,
      priority_contact_id: contactId,
      contact_ids: [contactId],
      description: 'Proposition concurrente',
      remote_allowed: false,
    });
    expect(blockedProposal.status).toBe(409);
  });

  it('une proposition acceptée crée le dossier sans candidature artificielle ni publication', async () => {
    const proposal = await student.agent.post('/api/offers').set('x-csrf-token', student.csrfToken).send({
      company_id: companyId,
      priority_contact_id: contactId,
      contact_ids: [contactId],
      description: 'Stage trouvé par Alice',
      remote_allowed: false,
    });
    const accepted = await manager.agent
      .post(`/api/offers/${proposal.body.id}/validate`)
      .set('x-csrf-token', manager.csrfToken);
    expect(accepted.status).toBe(200);
    expect(accepted.body.status).toBe('prise');
    const internship = db.prepare('SELECT * FROM internships WHERE origin_offer_id = ?').get(proposal.body.id) as {
      origin_type: string;
      origin_application_id: number | null;
    };
    expect(internship).toMatchObject({ origin_type: 'proposition', origin_application_id: null });
    expect((db.prepare('SELECT COUNT(*) AS count FROM applications').get() as { count: number }).count).toBe(0);
  });

  it('valide les dates, le signataire et l\'éligibilité annuelle', async () => {
    const { internshipId } = await createSelectedInternship();
    const invalidDates = await manager.agent.patch(`/api/internships/${internshipId}`).set('x-csrf-token', manager.csrfToken).send({
      start_date: '2030-06-30', end_date: '2030-03-01', signing_contact_id: contactId,
    });
    expect(invalidDates.status).toBe(400);
    const valid = await prepareInternship(internshipId);
    expect(valid.status).toBe(200);
    expect(valid.body.academic_year).toBe('2029-2030');
  });

  it('génère, protège et régénère une convention DOCX sans variable restante', async () => {
    const { internshipId } = await createSelectedInternship();
    await prepareInternship(internshipId);
    const generated = await manager.agent
      .post(`/api/internships/${internshipId}/generate-convention`)
      .set('x-csrf-token', manager.csrfToken);
    expect(generated.status).toBe(200);
    expect(generated.body.documents).toHaveLength(1);

    const download = await manager.agent
      .get(`/api/internships/${internshipId}/documents/generated`)
      .buffer(true)
      .parse(binaryParser);
    expect(download.status).toBe(200);
    expect(download.headers['content-disposition']).toContain('convention-dupont-alice-2029-2030.docx');
    const zip = new PizZip(download.body as Buffer);
    const xml = zip.file('word/document.xml')!.asText();
    expect(xml).toContain('Alice');
    expect(xml).toContain('1 rue du Test');
    expect(xml).not.toMatch(/\{\{[a-z_]+\}\}/);

    const reader = await loginAsLecteur();
    expect((await reader.agent.get(`/api/internships/${internshipId}/documents/generated`)).status).toBe(200);
    expect((await student.agent.get(`/api/internships/${internshipId}/documents/generated`)).status).toBe(403);

    await prepareInternship(internshipId);
    expect((db.prepare(
      "SELECT COUNT(*) AS count FROM internship_documents WHERE internship_id = ? AND kind = 'generated'",
    ).get(internshipId) as { count: number }).count).toBe(0);

    const regenerated = await manager.agent
      .post(`/api/internships/${internshipId}/generate-convention`)
      .set('x-csrf-token', manager.csrfToken);
    expect(regenerated.status).toBe(200);
    expect((db.prepare(
      "SELECT COUNT(*) AS count FROM internship_documents WHERE internship_id = ? AND kind = 'generated'",
    ).get(internshipId) as { count: number }).count).toBe(1);
  });

  it('le téléversement signé ne confirme pas, puis la confirmation distincte réussit', async () => {
    const { internshipId } = await createSelectedInternship();
    await prepareInternship(internshipId);
    const withoutSigned = await manager.agent
      .post(`/api/internships/${internshipId}/confirm`)
      .set('x-csrf-token', manager.csrfToken);
    expect(withoutSigned.status).toBe(409);

    const upload = await manager.agent
      .post(`/api/internships/${internshipId}/signed-convention`)
      .set('x-csrf-token', manager.csrfToken)
      .attach('file', Buffer.from('%PDF-1.4 signed'), { filename: 'convention-signee.pdf', contentType: 'application/pdf' });
    expect(upload.status).toBe(200);
    expect(upload.body.status).toBe('preparation');

    const confirmation = await manager.agent
      .post(`/api/internships/${internshipId}/confirm`)
      .set('x-csrf-token', manager.csrfToken);
    expect(confirmation.status).toBe(200);
    expect(confirmation.body.status).toBe('confirme');

    const terminal = await manager.agent
      .post(`/api/internships/${internshipId}/terminal-status`)
      .set('x-csrf-token', manager.csrfToken)
      .send({ status: 'termine' });
    expect(terminal.status).toBe(200);
    const nextOffer = await createOffer('Stage suivant');
    expect((await student.agent.post(`/api/offers/${nextOffer}/applications`).set('x-csrf-token', student.csrfToken)).status).toBe(201);
  });

  it('la suppression restaure atomiquement candidature et offre', async () => {
    const { offerId, applicationId, internshipId } = await createSelectedInternship();
    const deleted = await manager.agent
      .delete(`/api/internships/${internshipId}`)
      .set('x-csrf-token', manager.csrfToken);
    expect(deleted.status).toBe(204);
    expect(db.prepare('SELECT 1 FROM internships WHERE id = ?').get(internshipId)).toBeUndefined();
    expect((db.prepare('SELECT status FROM offers WHERE id = ?').get(offerId) as { status: string }).status).toBe('validee_et_visible');
    expect((db.prepare('SELECT selected FROM applications WHERE id = ?').get(applicationId) as { selected: number }).selected).toBe(0);
  });

  it('la liste et l\'export comprennent les étudiants sans stage et de vraies dates', async () => {
    const { internshipId } = await createSelectedInternship();
    await prepareInternship(internshipId);
    const reader = await loginAsLecteur();
    const list = await reader.agent.get('/api/internships?academic_year=2029-2030');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(2);
    expect(list.body.find((row: { student_id: number }) => row.student_id === secondStudentId)).toMatchObject({
      has_internship: false,
      internship_id: null,
    });

    const exported = await reader.agent
      .get('/api/internships/export/2029-2030')
      .buffer(true)
      .parse(binaryParser);
    expect(exported.status).toBe(200);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(exported.body as Buffer);
    const sheet = workbook.getWorksheet('Stages');
    expect(sheet).toBeDefined();
    expect(sheet!.getCell('H2').value).toBeInstanceOf(Date);
    expect(sheet!.rowCount).toBe(3);
  });
});
