import type { Database } from 'better-sqlite3';
import type {
  AnnualInternshipRow,
  Internship,
  InternshipDetail,
  InternshipDocument,
  InternshipDocumentKind,
  InternshipOriginType,
  InternshipStatus,
} from './internships.types';

export function findBlockingInternshipByStudent(db: Database, studentId: number): Internship | null {
  return (db.prepare(
    "SELECT * FROM internships WHERE student_id = ? AND status IN ('preparation', 'confirme') LIMIT 1",
  ).get(studentId) as Internship | undefined) ?? null;
}

export function insertInternship(
  db: Database,
  fields: {
    student_id: number;
    company_id: number;
    origin_type: InternshipOriginType;
    origin_offer_id: number;
    origin_application_id?: number | null;
  },
): Internship {
  return db.prepare(
    `INSERT INTO internships (
       student_id, company_id, origin_type, origin_offer_id, origin_application_id
     ) VALUES (
       @student_id, @company_id, @origin_type, @origin_offer_id, @origin_application_id
     ) RETURNING *`,
  ).get({ ...fields, origin_application_id: fields.origin_application_id ?? null }) as Internship;
}

export function findInternshipById(db: Database, id: number): Internship | null {
  return (db.prepare('SELECT * FROM internships WHERE id = ?').get(id) as Internship | undefined) ?? null;
}

export function findInternshipByOriginOffer(db: Database, offerId: number): Internship | null {
  return (db.prepare('SELECT * FROM internships WHERE origin_offer_id = ?').get(offerId) as Internship | undefined) ?? null;
}

export function listInternshipDocuments(db: Database, internshipId: number): InternshipDocument[] {
  return db.prepare(
    'SELECT * FROM internship_documents WHERE internship_id = ? ORDER BY kind, created_at DESC',
  ).all(internshipId) as InternshipDocument[];
}

export function findInternshipDocument(
  db: Database,
  internshipId: number,
  kind: InternshipDocumentKind,
): InternshipDocument | null {
  return (db.prepare(
    'SELECT * FROM internship_documents WHERE internship_id = ? AND kind = ?',
  ).get(internshipId, kind) as InternshipDocument | undefined) ?? null;
}

export function upsertInternshipDocument(
  db: Database,
  fields: {
    internship_id: number;
    kind: InternshipDocumentKind;
    storage_name: string;
    original_name: string;
    mime_type: string;
    size_bytes: number;
  },
): InternshipDocument {
  return db.prepare(
    `INSERT INTO internship_documents (
       internship_id, kind, storage_name, original_name, mime_type, size_bytes
     ) VALUES (
       @internship_id, @kind, @storage_name, @original_name, @mime_type, @size_bytes
     )
     ON CONFLICT(internship_id, kind) DO UPDATE SET
       storage_name = excluded.storage_name,
       original_name = excluded.original_name,
       mime_type = excluded.mime_type,
       size_bytes = excluded.size_bytes,
       created_at = datetime('now')
     RETURNING *`,
  ).get(fields) as InternshipDocument;
}

export function updateInternshipPreparation(
  db: Database,
  id: number,
  fields: { start_date: string; end_date: string; academic_year: string; signing_contact_id: number },
): Internship {
  return db.prepare(
    `UPDATE internships SET
       start_date = @start_date,
       end_date = @end_date,
       academic_year = @academic_year,
       signing_contact_id = @signing_contact_id,
       updated_at = datetime('now')
     WHERE id = @id RETURNING *`,
  ).get({ id, ...fields }) as Internship;
}

export function updateInternshipStatus(db: Database, id: number, status: InternshipStatus): Internship {
  return db.prepare(
    `UPDATE internships SET
       status = ?,
       confirmed_at = CASE WHEN ? = 'confirme' THEN datetime('now') ELSE confirmed_at END,
       updated_at = datetime('now')
     WHERE id = ? RETURNING *`,
  ).get(status, status, id) as Internship;
}

export function deleteInternshipRow(db: Database, id: number): void {
  db.prepare('DELETE FROM internships WHERE id = ?').run(id);
}

export function hasStudentEligibility(db: Database, studentId: number, academicYear: string): boolean {
  return Boolean(db.prepare(
    'SELECT 1 FROM student_academic_year_eligibility WHERE student_id = ? AND academic_year = ?',
  ).get(studentId, academicYear));
}

export function listAcademicYears(db: Database): string[] {
  return (db.prepare(
    'SELECT DISTINCT academic_year FROM student_academic_year_eligibility ORDER BY academic_year DESC',
  ).all() as { academic_year: string }[]).map((row) => row.academic_year);
}

export function findInternshipDetail(db: Database, id: number): InternshipDetail | null {
  const row = db.prepare(
    `SELECT i.*,
            s.matricule, s.first_name AS student_first_name, s.last_name AS student_last_name, s.email AS student_email,
            c.name AS company_name, c.address AS company_address, c.general_email AS company_email,
            sc.first_name AS contact_first_name, sc.last_name AS contact_last_name, sc.email AS contact_email,
            o.description AS origin_description
       FROM internships i
       JOIN students s ON s.id = i.student_id
       JOIN companies c ON c.id = i.company_id
       JOIN offers o ON o.id = i.origin_offer_id
       LEFT JOIN company_contacts sc ON sc.id = i.signing_contact_id
      WHERE i.id = ?`,
  ).get(id) as (Internship & {
    matricule: string | null;
    student_first_name: string;
    student_last_name: string;
    student_email: string;
    company_name: string;
    company_address: string | null;
    company_email: string;
    contact_first_name: string | null;
    contact_last_name: string | null;
    contact_email: string | null;
    origin_description: string;
  }) | undefined;
  if (!row) return null;

  const contacts = db.prepare(
    `SELECT id, first_name, last_name, email, validation_status
       FROM company_contacts
      WHERE company_id = ?
      ORDER BY last_name, first_name`,
  ).all(row.company_id) as InternshipDetail['contacts'];

  return {
    id: row.id,
    student_id: row.student_id,
    company_id: row.company_id,
    origin_type: row.origin_type,
    origin_offer_id: row.origin_offer_id,
    origin_application_id: row.origin_application_id,
    start_date: row.start_date,
    end_date: row.end_date,
    academic_year: row.academic_year,
    signing_contact_id: row.signing_contact_id,
    status: row.status,
    confirmed_at: row.confirmed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    student: {
      id: row.student_id,
      matricule: row.matricule,
      first_name: row.student_first_name,
      last_name: row.student_last_name,
      email: row.student_email,
    },
    company: {
      id: row.company_id,
      name: row.company_name,
      address: row.company_address,
      general_email: row.company_email,
    },
    signing_contact: row.signing_contact_id == null ? null : {
      id: row.signing_contact_id,
      first_name: row.contact_first_name!,
      last_name: row.contact_last_name!,
      email: row.contact_email!,
    },
    origin_description: row.origin_description,
    contacts,
    documents: listInternshipDocuments(db, id),
  };
}

export function listAnnualInternshipRows(db: Database, academicYear: string): AnnualInternshipRow[] {
  const rows = db.prepare(
    `SELECT s.id AS student_id, s.matricule, s.last_name, s.first_name, s.email,
            i.id AS internship_id, i.status, c.name AS company_name,
            i.start_date, i.end_date,
            CASE WHEN sc.id IS NULL THEN NULL ELSE sc.first_name || ' ' || sc.last_name END AS signing_contact_name
       FROM student_academic_year_eligibility e
       JOIN students s ON s.id = e.student_id
       LEFT JOIN internships i ON i.id = (
         SELECT i2.id
           FROM internships i2
          WHERE i2.student_id = s.id
            AND (
              i2.academic_year = e.academic_year
              OR (
                i2.academic_year IS NULL
                AND e.academic_year = (
                  SELECT MAX(e2.academic_year)
                    FROM student_academic_year_eligibility e2
                   WHERE e2.student_id = s.id
                )
              )
            )
          ORDER BY i2.id DESC
          LIMIT 1
       )
       LEFT JOIN companies c ON c.id = i.company_id
       LEFT JOIN company_contacts sc ON sc.id = i.signing_contact_id
      WHERE e.academic_year = ?
      ORDER BY s.last_name COLLATE NOCASE, s.first_name COLLATE NOCASE, i.id`,
  ).all(academicYear) as Array<Omit<AnnualInternshipRow, 'has_internship'>>;
  return rows.map((row) => ({ ...row, has_internship: row.internship_id != null }));
}
