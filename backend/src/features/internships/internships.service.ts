import type { Database } from 'better-sqlite3';
import { getDb } from '../../db/db.connection';
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/http-errors';
import {
  deleteInternshipRow,
  findBlockingInternshipByStudent,
  findInternshipById,
  findInternshipDetail,
  hasStudentEligibility,
  listAcademicYears,
  listAnnualInternshipRows,
  listInternshipDocuments,
  updateInternshipPreparation as updatePreparationQuery,
  updateInternshipStatus,
  findInternshipDocument,
  upsertInternshipDocument,
} from './internships.queries';
import type {
  AnnualInternshipRow,
  Internship,
  InternshipDetail,
  InternshipDocument,
  InternshipDocumentKind,
  InternshipStatus,
} from './internships.types';
import {
  removeInternshipDocument,
  resolveInternshipDocument,
  storeGeneratedConvention,
} from './internship-documents.storage';
import { conventionDownloadName, generateConventionDocument } from './convention-generator';
import { buildAnnualInternshipsWorkbook } from './internships-export';

export function academicYearForDate(startDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  if (!match) throw new BadRequestError('Date de début invalide.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime())
    || date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new BadRequestError('Date de début invalide.');
  }
  const academicStart = month > 9 || (month === 9 && day >= 15) ? year : year - 1;
  return `${academicStart}-${academicStart + 1}`;
}

export function studentHasBlockingInternship(db: Database, studentId: number): boolean {
  return findBlockingInternshipByStudent(db, studentId) != null;
}

export function getInternship(id: number): InternshipDetail {
  const internship = findInternshipDetail(getDb(), id);
  if (!internship) throw new NotFoundError('Dossier de stage non trouvé.');
  return internship;
}

export function updateInternshipPreparation(
  id: number,
  fields: { start_date: string; end_date: string; signing_contact_id: number },
): InternshipDetail {
  const db = getDb();
  const internship = findInternshipById(db, id);
  if (!internship) throw new NotFoundError('Dossier de stage non trouvé.');
  if (internship.status !== 'preparation') {
    throw new ConflictError('Un stage confirmé ou clôturé ne peut plus être préparé.');
  }
  if (fields.end_date < fields.start_date) {
    throw new BadRequestError('La date de fin doit être égale ou postérieure à la date de début.');
  }
  const contact = db.prepare(
    `SELECT id, company_id, validation_status FROM company_contacts WHERE id = ?`,
  ).get(fields.signing_contact_id) as {
    id: number;
    company_id: number;
    validation_status: string;
  } | undefined;
  if (!contact || contact.company_id !== internship.company_id) {
    throw new BadRequestError("Le contact signataire doit appartenir à l'entreprise du stage.");
  }
  if (contact.validation_status !== 'validated') {
    throw new ConflictError('Le contact signataire doit être validé.');
  }
  const academicYear = academicYearForDate(fields.start_date);
  if (!hasStudentEligibility(db, internship.student_id, academicYear)) {
    throw new ConflictError(
      `L'étudiant n'est pas renseigné comme éligible pour l'année ${academicYear}.`,
      { academic_year: academicYear },
    );
  }
  const staleConvention = findInternshipDocument(db, id, 'generated');
  db.transaction(() => {
    updatePreparationQuery(db, id, { ...fields, academic_year: academicYear });
    if (staleConvention) {
      db.prepare("DELETE FROM internship_documents WHERE internship_id = ? AND kind = 'generated'").run(id);
    }
  })();
  if (staleConvention) {
    try {
      removeInternshipDocument(staleConvention.storage_name);
    } catch {
      console.warn(`[internships] ancienne convention à nettoyer : ${staleConvention.storage_name}`);
    }
  }
  return findInternshipDetail(db, id)!;
}

export function confirmInternship(id: number): InternshipDetail {
  const db = getDb();
  const internship = findInternshipById(db, id);
  if (!internship) throw new NotFoundError('Dossier de stage non trouvé.');
  if (internship.status !== 'preparation') {
    throw new ConflictError('Seul un dossier en préparation peut être confirmé.');
  }
  if (!internship.start_date || !internship.end_date || !internship.signing_contact_id) {
    throw new ConflictError('Complétez les dates et le signataire avant de confirmer le stage.');
  }
  const signed = db.prepare(
    "SELECT 1 FROM internship_documents WHERE internship_id = ? AND kind = 'signed'",
  ).get(id);
  if (!signed) throw new ConflictError('Ajoutez la convention signée avant de confirmer le stage.');
  updateInternshipStatus(db, id, 'confirme');
  return findInternshipDetail(db, id)!;
}

export function closeInternship(id: number, status: Exclude<InternshipStatus, 'preparation' | 'confirme'>): InternshipDetail {
  const db = getDb();
  const internship = findInternshipById(db, id);
  if (!internship) throw new NotFoundError('Dossier de stage non trouvé.');
  if (internship.status !== 'confirme') {
    throw new ConflictError('Seul un stage confirmé peut être clôturé.');
  }
  updateInternshipStatus(db, id, status);
  return findInternshipDetail(db, id)!;
}

export function deleteInternship(id: number, today = new Date().toISOString().slice(0, 10)): void {
  const db = getDb();
  const internship = findInternshipById(db, id);
  if (!internship) throw new NotFoundError('Dossier de stage non trouvé.');
  if (internship.status !== 'preparation') {
    throw new ConflictError('Un stage confirmé ou clôturé doit être conservé dans le suivi.');
  }
  if (internship.start_date && internship.start_date <= today) {
    throw new ConflictError("Un stage dont la date de début est atteinte ne peut plus être supprimé simplement.");
  }
  const documentNames = listInternshipDocuments(db, id).map((document) => document.storage_name);

  db.transaction(() => {
    if (internship.origin_type === 'candidature') {
      db.prepare('UPDATE applications SET selected = 0 WHERE id = ?').run(internship.origin_application_id);
      restoreOfferStatus(db, internship.origin_offer_id, 'validee_et_visible');
    } else {
      restoreOfferStatus(db, internship.origin_offer_id, 'soumise');
    }
    deleteInternshipRow(db, id);
  })();

  for (const storageName of documentNames) {
    try {
      removeInternshipDocument(storageName);
    } catch {
      console.warn(`[internships] fichier orphelin à nettoyer : ${storageName}`);
    }
  }
}

function restoreOfferStatus(db: Database, offerId: number, status: 'soumise' | 'validee_et_visible'): void {
  const current = db.prepare('SELECT status FROM offers WHERE id = ?').get(offerId) as { status: string };
  db.prepare(
    'INSERT INTO offer_status_history (offer_id, from_status, to_status) VALUES (?, ?, ?)',
  ).run(offerId, current.status, status);
  db.prepare(
    "UPDATE offers SET status = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(status, offerId);
}

export function getAcademicYears(): string[] {
  return listAcademicYears(getDb());
}

export function getAnnualInternships(academicYear: string): AnnualInternshipRow[] {
  return listAnnualInternshipRows(getDb(), academicYear);
}

export function getInternshipRow(id: number): Internship {
  const internship = findInternshipById(getDb(), id);
  if (!internship) throw new NotFoundError('Dossier de stage non trouvé.');
  return internship;
}

export function generateConvention(id: number): InternshipDetail {
  const db = getDb();
  const detail = findInternshipDetail(db, id);
  if (!detail) throw new NotFoundError('Dossier de stage non trouvé.');
  if (detail.status !== 'preparation') {
    throw new ConflictError('La convention ne peut plus être régénérée après confirmation.');
  }
  const bytes = generateConventionDocument(detail);
  const stored = storeGeneratedConvention(bytes);
  const previous = findInternshipDocument(db, id, 'generated');
  try {
    upsertInternshipDocument(db, {
      internship_id: id,
      kind: 'generated',
      storage_name: stored.storageName,
      original_name: conventionDownloadName(detail),
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size_bytes: stored.size,
    });
  } catch (error) {
    removeInternshipDocument(stored.storageName);
    throw error;
  }
  if (previous) removeInternshipDocument(previous.storage_name);
  return findInternshipDetail(db, id)!;
}

export function saveSignedConvention(
  id: number,
  file: { filename: string; originalname: string; mimetype: string; size: number },
): InternshipDetail {
  const db = getDb();
  const internship = findInternshipById(db, id);
  if (!internship) {
    removeInternshipDocument(file.filename);
    throw new NotFoundError('Dossier de stage non trouvé.');
  }
  if (internship.status !== 'preparation') {
    removeInternshipDocument(file.filename);
    throw new ConflictError('La convention signée ne peut plus être remplacée après confirmation.');
  }
  const previous = findInternshipDocument(db, id, 'signed');
  try {
    upsertInternshipDocument(db, {
      internship_id: id,
      kind: 'signed',
      storage_name: file.filename,
      original_name: file.originalname,
      mime_type: file.mimetype,
      size_bytes: file.size,
    });
  } catch (error) {
    removeInternshipDocument(file.filename);
    throw error;
  }
  if (previous) removeInternshipDocument(previous.storage_name);
  return findInternshipDetail(db, id)!;
}

export function getInternshipDocumentDownload(
  id: number,
  kind: InternshipDocumentKind,
): { document: InternshipDocument; path: string } {
  const document = findInternshipDocument(getDb(), id, kind);
  if (!document) throw new NotFoundError('Document non trouvé.');
  return { document, path: resolveInternshipDocument(document.storage_name) };
}

export function exportAnnualInternships(academicYear: string): Promise<Buffer> {
  return buildAnnualInternshipsWorkbook(academicYear, listAnnualInternshipRows(getDb(), academicYear));
}
