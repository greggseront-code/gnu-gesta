import type { Database } from 'better-sqlite3';
import type { Application } from './applications.types';
import type { Offer } from '../offers/offers.types';

export class DuplicateApplicationError extends Error {
  status = 409;
  constructor() {
    super('L\'étudiant a déjà postulé à cette offre');
  }
}

export class ApplicationOfferMismatchError extends Error {
  status = 400;
  constructor() {
    super('La candidature n\'appartient pas à cette offre');
  }
}

export class OfferAlreadyTakenError extends Error {
  status = 409;
  constructor() {
    super('Un candidat a déjà été sélectionné pour cette offre');
  }
}

export function insertApplication(db: Database, offerId: number, studentId: number): Application {
  try {
    return db
      .prepare(
        `INSERT INTO applications (offer_id, student_id)
         VALUES (?, ?)
         RETURNING *`,
      )
      .get(offerId, studentId) as Application;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint')) {
      throw new DuplicateApplicationError();
    }
    throw err;
  }
}

export function listApplicationsByOffer(db: Database, offerId: number): Application[] {
  return db
    .prepare('SELECT * FROM applications WHERE offer_id = ? ORDER BY created_at ASC')
    .all(offerId) as Application[];
}

export function listApplicationsByStudent(db: Database, studentId: number): Application[] {
  return db
    .prepare('SELECT * FROM applications WHERE student_id = ? ORDER BY created_at DESC')
    .all(studentId) as Application[];
}

export function findApplicationById(db: Database, id: number): Application | null {
  return (
    (db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as Application | undefined) ?? null
  );
}

export function findApplicationByStudentAndOffer(
  db: Database,
  offerId: number,
  studentId: number,
): Application | null {
  return (
    (db
      .prepare('SELECT * FROM applications WHERE offer_id = ? AND student_id = ?')
      .get(offerId, studentId) as Application | undefined) ?? null
  );
}

export function selectCandidateAndCloseOffer(
  db: Database,
  applicationId: number,
  offerId: number,
): Offer {
  const run = db.transaction(() => {
    // Security invariant: never trust the application id alone, because it is
    // submitted inside an offer-scoped route and must belong to that offer.
    const application = db
      .prepare('SELECT offer_id FROM applications WHERE id = ?')
      .get(applicationId) as { offer_id: number } | undefined;

    if (!application || application.offer_id !== offerId) {
      throw new ApplicationOfferMismatchError();
    }

    // Selecting a candidate closes the offer exactly once; a second selection
    // would corrupt the selected flag/history pair.
    const current = db.prepare('SELECT * FROM offers WHERE id = ?').get(offerId) as Offer | undefined;

    if (current?.status === 'prise') {
      throw new OfferAlreadyTakenError();
    }

    db.prepare('UPDATE applications SET selected = 1 WHERE id = ?').run(applicationId);

    db.prepare(
      `INSERT INTO offer_status_history (offer_id, from_status, to_status) VALUES (?, ?, ?)`,
    ).run(offerId, current?.status ?? null, 'prise');

    return db
      .prepare(
        `UPDATE offers SET status = 'prise', updated_at = datetime('now') WHERE id = ? RETURNING *`,
      )
      .get(offerId) as Offer;
  });

  return run();
}
