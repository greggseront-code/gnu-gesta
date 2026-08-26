import type { Database } from 'better-sqlite3';
import type { Offer, OfferAttachment, OfferInput, OfferStatus, OfferSourceType } from './offers.types';
import type { Role } from '../../middlewares/auth-context.middleware';

interface AuthContext {
  role: Role | null;
  entityId: number | null;
}

interface InsertOfferFields extends OfferInput {
  submitted_by_student_id?: number | null;
  created_by_company_id?: number | null;
  source_type?: OfferSourceType | null;
  status: OfferStatus;
}

/** Insere l'offre et, si elle demarre hors 'soumise' (creation gestionnaire directement publiee), historise la transition initiale. */
export function insertOffer(db: Database, fields: InsertOfferFields): Offer {
  const offer = db
    .prepare(
      `INSERT INTO offers
         (company_id, priority_contact_id, description, location, technologies, objectives,
          remote_allowed, remote_percentage, remarks, submitted_by_student_id, created_by_company_id, source_type, status)
       VALUES
         (@company_id, @priority_contact_id, @description, @location, @technologies, @objectives,
          @remote_allowed, @remote_percentage, @remarks, @submitted_by_student_id, @created_by_company_id, @source_type, @status)
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
      status: fields.status,
    }) as Offer;

  if (fields.status !== 'soumise') {
    db.prepare(`INSERT INTO offer_status_history (offer_id, from_status, to_status) VALUES (?, NULL, ?)`).run(offer.id, fields.status);
  }

  return offer;
}

export function findLinkedContactIds(db: Database, offerId: number): number[] {
  return (db.prepare('SELECT contact_id FROM offer_contacts WHERE offer_id = ?').all(offerId) as { contact_id: number }[]).map(
    (r) => r.contact_id,
  );
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

  if (role === 'gestionnaire') {
    return db
      .prepare(`SELECT * FROM offers WHERE 1=1 ${searchClause} ORDER BY created_at DESC`)
      .all(sp ? { search: sp } : {}) as Offer[];
  }

  // Le lecteur n'accede pas aux offres 'soumise' (en attente de validation),
  // seulement aux statuts deja traites par le gestionnaire.
  if (role === 'lecteur') {
    return db
      .prepare(`SELECT * FROM offers WHERE status != 'soumise' ${searchClause} ORDER BY created_at DESC`)
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

export function listOfferAttachments(db: Database, offerId: number): OfferAttachment[] {
  return db
    .prepare('SELECT * FROM offer_attachments WHERE offer_id = ? ORDER BY created_at ASC, id ASC')
    .all(offerId) as OfferAttachment[];
}

export function countOfferAttachments(db: Database, offerId: number): number {
  return (db.prepare('SELECT COUNT(*) as count FROM offer_attachments WHERE offer_id = ?').get(offerId) as { count: number }).count;
}

export function insertOfferAttachment(
  db: Database,
  fields: { offer_id: number; storage_name: string; mime_type: string; size_bytes: number },
): OfferAttachment {
  return db
    .prepare(
      `INSERT INTO offer_attachments (offer_id, storage_name, mime_type, size_bytes)
       VALUES (@offer_id, @storage_name, @mime_type, @size_bytes)
       RETURNING *`,
    )
    .get(fields) as OfferAttachment;
}

export function findOfferAttachment(db: Database, offerId: number, attachmentId: number): OfferAttachment | null {
  return (
    db
      .prepare('SELECT * FROM offer_attachments WHERE offer_id = ? AND id = ?')
      .get(offerId, attachmentId) as OfferAttachment | undefined
  ) ?? null;
}

export function deleteOfferAttachment(db: Database, offerId: number, attachmentId: number): void {
  db.prepare('DELETE FROM offer_attachments WHERE offer_id = ? AND id = ?').run(offerId, attachmentId);
}

export function hasStudentAppliedToOffer(db: Database, offerId: number, studentId: number): boolean {
  return Boolean(db.prepare('SELECT 1 FROM applications WHERE offer_id = ? AND student_id = ?').get(offerId, studentId));
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

/**
 * Remplace atomiquement l'entreprise, le contact prioritaire et l'ensemble
 * des contacts associes. Remplace entierement offer_contacts (pas de merge)
 * pour ne jamais laisser un contact de l'ancienne entreprise rattache.
 */
export function replaceOfferAssignment(
  db: Database,
  id: number,
  fields: { company_id: number; priority_contact_id: number; contact_ids: number[] },
): Offer {
  return db.transaction(() => {
    db.prepare(
      `UPDATE offers SET company_id = @company_id, priority_contact_id = @priority_contact_id, updated_at = datetime('now')
       WHERE id = @id`,
    ).run({ id, company_id: fields.company_id, priority_contact_id: fields.priority_contact_id });

    db.prepare('DELETE FROM offer_contacts WHERE offer_id = ?').run(id);
    const insertLink = db.prepare('INSERT INTO offer_contacts (offer_id, contact_id) VALUES (?, ?)');
    for (const contactId of fields.contact_ids) insertLink.run(id, contactId);

    return findOfferById(db, id)!;
  })();
}
