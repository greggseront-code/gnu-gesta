import type { Database } from 'better-sqlite3';
import type { Offer, OfferInput, OfferStatus, OfferSourceType, OfferWithNames } from './offers.types';
import type { Role } from '../../middlewares/auth-context.middleware';

/**
 * Jointure commune pour enrichir une offre du nom de son entreprise et,
 * quand elle existe, du nom de l'etudiant qui l'a soumise. `o.*` en premier
 * garantit que les colonnes de offers priment en cas d'homonymie (ex. `id`).
 */
const OFFER_SELECT_WITH_NAMES = `
  SELECT o.*,
         c.name AS company_name,
         CASE WHEN o.submitted_by_student_id IS NOT NULL
              THEN st.first_name || ' ' || st.last_name
              ELSE NULL END AS submitted_by_student_name
  FROM offers o
  JOIN companies c ON c.id = o.company_id
  LEFT JOIN students st ON st.id = o.submitted_by_student_id
`;

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

export function listOffers(db: Database, auth: AuthContext, search?: string): OfferWithNames[] {
  const { role, entityId } = auth;

  const searchClause = search
    ? `AND (LOWER(o.description) LIKE @search OR LOWER(o.technologies) LIKE @search OR LOWER(o.location) LIKE @search)`
    : '';
  const sp = search ? `%${search.toLowerCase()}%` : undefined;

  if (role === 'gestionnaire') {
    return db
      .prepare(`${OFFER_SELECT_WITH_NAMES} WHERE 1=1 ${searchClause} ORDER BY o.created_at DESC`)
      .all(sp ? { search: sp } : {}) as OfferWithNames[];
  }

  // Le lecteur n'accede pas aux offres 'soumise' (en attente de validation),
  // seulement aux statuts deja traites par le gestionnaire.
  if (role === 'lecteur') {
    return db
      .prepare(`${OFFER_SELECT_WITH_NAMES} WHERE o.status != 'soumise' ${searchClause} ORDER BY o.created_at DESC`)
      .all(sp ? { search: sp } : {}) as OfferWithNames[];
  }

  if (role === 'etudiant' && entityId != null) {
    // Student visibility is broader than public visibility: they keep access to
    // their own proposals and to offers they applied to, except when an offer is
    // explicitly marked non_disponible.
    return db
      .prepare(
        `SELECT DISTINCT o.*,
                c.name AS company_name,
                CASE WHEN o.submitted_by_student_id IS NOT NULL
                     THEN st.first_name || ' ' || st.last_name
                     ELSE NULL END AS submitted_by_student_name
         FROM offers o
         JOIN companies c ON c.id = o.company_id
         LEFT JOIN students st ON st.id = o.submitted_by_student_id
         LEFT JOIN applications a ON a.offer_id = o.id AND a.student_id = @entityId
         WHERE (
           o.status = 'validee_et_visible'
           OR o.submitted_by_student_id = @entityId
           OR (a.id IS NOT NULL AND o.status != 'non_disponible')
         )
         ${searchClause}
         ORDER BY o.created_at DESC`,
      )
      .all({ entityId, ...(sp ? { search: sp } : {}) }) as OfferWithNames[];
  }

  if (role === 'entreprise' && entityId != null) {
    return db
      .prepare(
        `${OFFER_SELECT_WITH_NAMES} WHERE o.company_id = @entityId ${searchClause} ORDER BY o.created_at DESC`,
      )
      .all({ entityId, ...(sp ? { search: sp } : {}) }) as OfferWithNames[];
  }

  // Public
  return db
    .prepare(`${OFFER_SELECT_WITH_NAMES} WHERE o.status = 'validee_et_visible' ${searchClause} ORDER BY o.created_at DESC`)
    .all(sp ? { search: sp } : {}) as OfferWithNames[];
}

export function findOfferById(db: Database, id: number): Offer | null {
  return (db.prepare('SELECT * FROM offers WHERE id = ?').get(id) as Offer | undefined) ?? null;
}

/** Forme enrichie utilisee par toutes les reponses HTTP (voir offers.service). */
export function findOfferWithNamesById(db: Database, id: number): OfferWithNames | null {
  return (
    (db.prepare(`${OFFER_SELECT_WITH_NAMES} WHERE o.id = ?`).get(id) as OfferWithNames | undefined) ?? null
  );
}

/** Une offre 'soumise' d'un etudiant bloque toute nouvelle proposition de sa part (voir offers.service.createOffer). */
export function findPendingSubmittedOfferByStudent(db: Database, studentId: number): Offer | null {
  return (
    (db
      .prepare(`SELECT * FROM offers WHERE submitted_by_student_id = ? AND status = 'soumise'`)
      .get(studentId) as Offer | undefined) ?? null
  );
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

export function updateOfferAttachment(db: Database, id: number, attachmentPath: string): Offer {
  return db
    .prepare(`UPDATE offers SET attachment_path = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`)
    .get(attachmentPath, id) as Offer;
}
