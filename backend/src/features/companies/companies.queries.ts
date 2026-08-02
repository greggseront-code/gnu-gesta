import type { Database } from 'better-sqlite3';
import type {
  AuthContext,
  Company,
  CompanyContact,
  CompanyInput,
  CompanyWithContacts,
  ContactInput,
  ContactPatchInput,
  StudentSummary,
  SubmissionFields,
} from './companies.types';

export const GESTIONNAIRE_AUTH: AuthContext = { role: 'gestionnaire', entityId: null };

export interface ContactSubmissionFields extends SubmissionFields {
  created_with_company?: boolean;
}

const DEFAULT_VALIDATED: SubmissionFields = { validation_status: 'validated' };

/**
 * Un element en attente est visible par le gestionnaire et par l'etudiant qui
 * l'a cree ; les autres roles (lecteur, entreprise, etudiant sur la
 * soumission d'un autre etudiant) ne voient que les elements valides. Utilise
 * telle quelle pour `companies` et `company_contacts`, qui partagent les
 * memes colonnes de moderation.
 */
const VISIBILITY_CLAUSE = `(
  validation_status = 'validated'
  OR @role = 'gestionnaire'
  OR (@role = 'etudiant' AND submitted_by_student_id = @entityId)
)`;

export function insertCompany(
  db: Database,
  input: Omit<CompanyInput, 'contacts'>,
  fields: SubmissionFields = DEFAULT_VALIDATED,
): Company {
  return db
    .prepare(
      `INSERT INTO companies (name, general_email, address, validation_status, submitted_by_student_id, validated_at)
       VALUES (@name, @general_email, @address, @validation_status, @submitted_by_student_id,
         CASE WHEN @validation_status = 'validated' THEN datetime('now') ELSE NULL END)
       RETURNING *`,
    )
    .get({
      name: input.name,
      general_email: input.general_email,
      address: input.address ?? null,
      validation_status: fields.validation_status,
      submitted_by_student_id: fields.submitted_by_student_id ?? null,
    }) as Company;
}

export function insertContact(
  db: Database,
  companyId: number,
  contact: ContactInput,
  fields: ContactSubmissionFields = DEFAULT_VALIDATED,
): CompanyContact {
  const row = db
    .prepare(
      `INSERT INTO company_contacts
         (company_id, first_name, last_name, email, phone, roles,
          validation_status, submitted_by_student_id, created_with_company, validated_at)
       VALUES
         (@company_id, @first_name, @last_name, @email, @phone, @roles,
          @validation_status, @submitted_by_student_id, @created_with_company,
          CASE WHEN @validation_status = 'validated' THEN datetime('now') ELSE NULL END)
       RETURNING *`,
    )
    .get({
      company_id: companyId,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone ?? null,
      roles: JSON.stringify(contact.roles),
      validation_status: fields.validation_status,
      submitted_by_student_id: fields.submitted_by_student_id ?? null,
      created_with_company: fields.created_with_company ? 1 : 0,
    }) as Omit<CompanyContact, 'roles'> & { roles: string };

  return { ...row, roles: JSON.parse(row.roles) };
}

export function listCompanies(db: Database, auth: AuthContext, search?: string): Company[] {
  const { role, entityId } = auth;
  const searchClause = search ? `AND LOWER(name) LIKE @search` : '';
  const sp = search ? `%${search.toLowerCase()}%` : undefined;

  return db
    .prepare(`SELECT * FROM companies WHERE ${VISIBILITY_CLAUSE} ${searchClause} ORDER BY name`)
    .all({ role, entityId, ...(sp ? { search: sp } : {}) }) as Company[];
}

export function findContactsByCompanyId(db: Database, companyId: number, auth: AuthContext): CompanyContact[] {
  const { role, entityId } = auth;
  const rows = db
    .prepare(`SELECT * FROM company_contacts WHERE company_id = @companyId AND ${VISIBILITY_CLAUSE} ORDER BY id`)
    .all({ companyId, role, entityId }) as (Omit<CompanyContact, 'roles'> & { roles: string })[];

  return rows.map((row) => ({ ...row, roles: JSON.parse(row.roles) }));
}

export function findCompanyById(db: Database, id: number, auth: AuthContext): CompanyWithContacts | null {
  const { role, entityId } = auth;
  const company = db
    .prepare(`SELECT * FROM companies WHERE id = @id AND ${VISIBILITY_CLAUSE}`)
    .get({ id, role, entityId }) as Company | undefined;
  if (!company) return null;
  return { ...company, contacts: findContactsByCompanyId(db, id, auth) };
}

export function updateCompany(
  db: Database,
  id: number,
  fields: { name?: string; general_email?: string; address?: string },
): Company {
  return db
    .prepare(
      `UPDATE companies
       SET name          = COALESCE(@name, name),
           general_email = COALESCE(@general_email, general_email),
           address       = COALESCE(@address, address)
       WHERE id = @id
       RETURNING *`,
    )
    .get({ id, name: fields.name ?? null, general_email: fields.general_email ?? null, address: fields.address ?? null }) as Company;
}

export function findCompaniesWithDuplicateRisk(db: Database, auth: AuthContext): Company[] {
  const { role, entityId } = auth;
  const all = db.prepare(`SELECT * FROM companies WHERE ${VISIBILITY_CLAUSE} ORDER BY name`).all({ role, entityId }) as Company[];
  const atRisk = new Set<number>();
  for (const company of all) {
    // V1 duplicate detection is intentionally heuristic: it flags review work
    // without blocking creation or attempting a merge.
    const keywords = company.name
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-ZÀ-ÿ0-9]/g, ''))
      .filter((w) => w.length > 3);
    if (keywords.length === 0) continue;
    const matches = all.filter(
      (c) => c.id !== company.id && c.name.toLowerCase().includes(keywords[0].toLowerCase()),
    );
    if (matches.length > 0) {
      atRisk.add(company.id);
      matches.forEach((m) => atRisk.add(m.id));
    }
  }
  return all.filter((c) => atRisk.has(c.id));
}

export function findProbableDuplicates(db: Database, name: string, excludeId: number, auth: AuthContext): Company[] {
  const { role, entityId } = auth;
  const keywords = name
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-ZÀ-ÿ0-9]/g, ''))
    .filter((w) => w.length > 3);

  if (keywords.length === 0) return [];

  return db
    .prepare(`SELECT * FROM companies WHERE LOWER(name) LIKE @keyword AND id != @excludeId AND ${VISIBILITY_CLAUSE} ORDER BY name`)
    .all({ keyword: `%${keywords[0].toLowerCase()}%`, excludeId, role, entityId }) as Company[];
}

// ─── Moderation gestionnaire ────────────────────────────────────────────────

/** Lecture sans filtre de visibilité : réservée aux actions gestionnaire (moderation, dépendances d'offre). */
export function findCompanyByIdAny(db: Database, id: number): Company | null {
  return (db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as Company | undefined) ?? null;
}

export function findContactByIdAny(db: Database, id: number): CompanyContact | null {
  const row = db.prepare('SELECT * FROM company_contacts WHERE id = ?').get(id) as
    | (Omit<CompanyContact, 'roles'> & { roles: string })
    | undefined;
  if (!row) return null;
  return { ...row, roles: JSON.parse(row.roles) };
}

/** Lecture en masse sans filtre de visibilité : réservée aux vérifications de dépendance d'offre (statut réel, pas la visibilité appelant). */
export function findContactsByIds(db: Database, ids: number[]): CompanyContact[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM company_contacts WHERE id IN (${placeholders})`).all(...ids) as (Omit<
    CompanyContact,
    'roles'
  > & { roles: string })[];
  return rows.map((row) => ({ ...row, roles: JSON.parse(row.roles) }));
}

export function findPendingCompanies(db: Database): Company[] {
  return db.prepare(`SELECT * FROM companies WHERE validation_status = 'pending' ORDER BY created_at`).all() as Company[];
}

export function findPendingContacts(db: Database): (CompanyContact & { company_name: string })[] {
  const rows = db
    .prepare(
      `SELECT cc.*, c.name as company_name
       FROM company_contacts cc
       JOIN companies c ON c.id = cc.company_id
       WHERE cc.validation_status = 'pending'
       ORDER BY cc.created_at`,
    )
    .all() as (Omit<CompanyContact, 'roles'> & { roles: string; company_name: string })[];

  return rows.map((row) => ({ ...row, roles: JSON.parse(row.roles) }));
}

export function findStudentSummary(db: Database, studentId: number | null): StudentSummary | null {
  if (studentId == null) return null;
  return (
    (db.prepare('SELECT id, first_name, last_name, email FROM students WHERE id = ?').get(studentId) as
      | StudentSummary
      | undefined) ?? null
  );
}

export function findOfferIdsReferencingCompany(db: Database, companyId: number): number[] {
  return (db.prepare('SELECT id FROM offers WHERE company_id = ?').all(companyId) as { id: number }[]).map((r) => r.id);
}

export function findOfferIdsReferencingContact(db: Database, contactId: number): number[] {
  const rows = db
    .prepare(
      `SELECT id FROM offers WHERE priority_contact_id = @contactId
       UNION
       SELECT offer_id as id FROM offer_contacts WHERE contact_id = @contactId`,
    )
    .all({ contactId }) as { id: number }[];
  return [...new Set(rows.map((r) => r.id))];
}

/** Valide l'entreprise et, dans la même transaction, tous ses contacts de soumission initiale (created_with_company). */
export function validateCompanyAndInitialContacts(db: Database, id: number): CompanyWithContacts {
  return db.transaction(() => {
    db.prepare(`UPDATE companies SET validation_status = 'validated', validated_at = datetime('now') WHERE id = ?`).run(id);
    db.prepare(
      `UPDATE company_contacts SET validation_status = 'validated', validated_at = datetime('now')
       WHERE company_id = ? AND created_with_company = 1 AND validation_status = 'pending'`,
    ).run(id);
    const company = findCompanyByIdAny(db, id)!;
    const contacts = findContactsByCompanyId(db, id, GESTIONNAIRE_AUTH);
    return { ...company, contacts };
  })();
}

export function validateContact(db: Database, contactId: number): CompanyContact {
  const row = db
    .prepare(
      `UPDATE company_contacts SET validation_status = 'validated', validated_at = datetime('now')
       WHERE id = ? RETURNING *`,
    )
    .get(contactId) as Omit<CompanyContact, 'roles'> & { roles: string };
  return { ...row, roles: JSON.parse(row.roles) };
}

export function updateContact(db: Database, id: number, fields: ContactPatchInput): CompanyContact {
  const row = db
    .prepare(
      `UPDATE company_contacts SET
         first_name = COALESCE(@first_name, first_name),
         last_name  = COALESCE(@last_name, last_name),
         email      = COALESCE(@email, email),
         phone      = COALESCE(@phone, phone),
         roles      = COALESCE(@roles, roles)
       WHERE id = @id
       RETURNING *`,
    )
    .get({
      id,
      first_name: fields.first_name ?? null,
      last_name: fields.last_name ?? null,
      email: fields.email ?? null,
      phone: fields.phone ?? null,
      roles: fields.roles ? JSON.stringify(fields.roles) : null,
    }) as Omit<CompanyContact, 'roles'> & { roles: string };
  return { ...row, roles: JSON.parse(row.roles) };
}

/** Supprime l'entreprise (les contacts suivent via ON DELETE CASCADE) : l'appelant doit avoir vérifié l'absence de référence. */
export function deleteCompany(db: Database, id: number): void {
  db.prepare('DELETE FROM companies WHERE id = ?').run(id);
}

/** L'appelant doit avoir vérifié l'absence de référence (offer_contacts, priority_contact_id) : voir points d'attention du plan. */
export function deleteContact(db: Database, id: number): void {
  db.prepare('DELETE FROM company_contacts WHERE id = ?').run(id);
}
