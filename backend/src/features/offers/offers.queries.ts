import type { Database } from 'better-sqlite3';
import type { Offer, OfferInput, OfferStatus, OfferSourceType } from './offers.types';
import type { Role } from '../../middlewares/auth-context.middleware';

interface AuthContext {
  role: Role | null;
  entityId: number | null;
}

interface InsertOfferFields extends OfferInput {
  submitted_by_student_id?: number | null;
  created_by_company_id?: number | null;
  source_type?: OfferSourceType | null;
}

export function insertOffer(db: Database, fields: InsertOfferFields): Offer {
  return db
    .prepare(
      `INSERT INTO offers
         (company_id, priority_contact_id, description, location, technologies, objectives,
          remote_allowed, remote_percentage, remarks, submitted_by_student_id, created_by_company_id, source_type)
       VALUES
         (@company_id, @priority_contact_id, @description, @location, @technologies, @objectives,
          @remote_allowed, @remote_percentage, @remarks, @submitted_by_student_id, @created_by_company_id, @source_type)
       RETURNING *`,
    )
    .get({
      company_id: fields.company_id,
      priority_contact_id: fields.priority_contact_id,
      description: fields.description,
      location: fields.location ?? null,
      technologies: fields.technologies ?? null,
      objectives: fields.objectives ?? null,
      remote_allowed: fields.remote_allowed ? 1 : 0,
      remote_percentage: fields.remote_percentage ?? null,
      remarks: fields.remarks ?? null,
      submitted_by_student_id: fields.submitted_by_student_id ?? null,
      created_by_company_id: fields.created_by_company_id ?? null,
      source_type: fields.source_type ?? null,
    }) as Offer;
}

export function linkOfferContacts(db: Database, offerId: number, contactIds: number[]): void {
  const stmt = db.prepare('INSERT OR IGNORE INTO offer_contacts (offer_id, contact_id) VALUES (?, ?)');
  const run = db.transaction((ids: number[]) => { for (const id of ids) stmt.run(offerId, id); });
  run(contactIds);
}

export function listOffers(db: Database, auth: AuthContext, search?: string): Offer[] {
  const { role, entityId } = auth;

  const searchClause = search
    ? `AND (LOWER(description) LIKE @search OR LOWER(technologies) LIKE @search OR LOWER(location) LIKE @search)`
    : '';
  const sp = search ? `%${search.toLowerCase()}%` : undefined;

  if (role === 'gestionnaire' || role === 'lecteur') {
    return db
      .prepare(`SELECT * FROM offers WHERE 1=1 ${searchClause} ORDER BY created_at DESC`)
      .all(sp ? { search: sp } : {}) as Offer[];
  }

  if (role === 'etudiant' && entityId != null) {
    const joinSearchClause = search
      ? `AND (LOWER(o.description) LIKE @search OR LOWER(o.technologies) LIKE @search OR LOWER(o.location) LIKE @search)`
      : '';
    // Student visibility is broader than public visibility: they keep access to
    // their own proposals and to offers they applied to, except when an offer is
    // explicitly marked non_disponible.
    return db
      .prepare(
        `SELECT DISTINCT o.* FROM offers o
         LEFT JOIN applications a ON a.offer_id = o.id AND a.student_id = @entityId
         WHERE (
           o.status = 'validee_et_visible'
           OR o.submitted_by_student_id = @entityId
           OR (a.id IS NOT NULL AND o.status != 'non_disponible')
         )
         ${joinSearchClause}
         ORDER BY o.created_at DESC`,
      )
      .all({ entityId, ...(sp ? { search: sp } : {}) }) as Offer[];
  }

  if (role === 'entreprise' && entityId != null) {
    return db
      .prepare(
        `SELECT * FROM offers WHERE company_id = @entityId ${searchClause} ORDER BY created_at DESC`,
      )
      .all({ entityId, ...(sp ? { search: sp } : {}) }) as Offer[];
  }

  // Public
  return db
    .prepare(`SELECT * FROM offers WHERE status = 'validee_et_visible' ${searchClause} ORDER BY created_at DESC`)
    .all(sp ? { search: sp } : {}) as Offer[];
}

export function findOfferById(db: Database, id: number): Offer | null {
  return (db.prepare('SELECT * FROM offers WHERE id = ?').get(id) as Offer | undefined) ?? null;
}

export function updateOfferStatus(db: Database, id: number, status: OfferStatus): Offer {
  const current = findOfferById(db, id);
  // Status transitions are part of the pedagogical audit trail. Keep the history
  // insert paired with every direct status update.
  db.prepare(
    `INSERT INTO offer_status_history (offer_id, from_status, to_status) VALUES (?, ?, ?)`,
  ).run(id, current?.status ?? null, status);

  return db
    .prepare(
      `UPDATE offers SET status = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`,
    )
    .get(status, id) as Offer;
}

export function updateOffer(
  db: Database,
  id: number,
  fields: {
    description?: string;
    location?: string;
    technologies?: string;
    objectives?: string;
    remote_allowed?: boolean;
    remote_percentage?: number;
    remarks?: string;
  },
): Offer {
  return db
    .prepare(
      `UPDATE offers SET
         description      = COALESCE(@description, description),
         location         = COALESCE(@location, location),
         technologies     = COALESCE(@technologies, technologies),
         objectives       = COALESCE(@objectives, objectives),
         remote_allowed   = COALESCE(@remote_allowed, remote_allowed),
         remote_percentage= COALESCE(@remote_percentage, remote_percentage),
         remarks          = COALESCE(@remarks, remarks),
         updated_at       = datetime('now')
       WHERE id = @id RETURNING *`,
    )
    .get({
      id,
      description: fields.description ?? null,
      location: fields.location ?? null,
      technologies: fields.technologies ?? null,
      objectives: fields.objectives ?? null,
      remote_allowed: fields.remote_allowed != null ? (fields.remote_allowed ? 1 : 0) : null,
      remote_percentage: fields.remote_percentage ?? null,
      remarks: fields.remarks ?? null,
    }) as Offer;
}

export function updateOfferCompany(db: Database, id: number, companyId: number): Offer {
  return db
    .prepare(`UPDATE offers SET company_id = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`)
    .get(companyId, id) as Offer;
}

export function updateOfferAttachment(db: Database, id: number, attachmentPath: string): Offer {
  return db
    .prepare(`UPDATE offers SET attachment_path = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`)
    .get(attachmentPath, id) as Offer;
}
