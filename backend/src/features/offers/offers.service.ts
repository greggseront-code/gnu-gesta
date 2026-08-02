import type { Database } from 'better-sqlite3';
import { getDb } from '../../db/db.connection';
import type { Role } from '../../middlewares/auth-context.middleware';
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/http-errors';
import { findCompanyById, findCompanyByIdAny, findContactsByIds } from '../companies/companies.queries';
import type { Offer, OfferInput, OfferStatus } from './offers.types';
import {
  insertOffer,
  linkOfferContacts,
  findLinkedContactIds,
  listOffers as listOffersQuery,
  findOfferById as findOfferByIdQuery,
  updateOfferStatus,
  updateOffer as updateOfferQuery,
  updateOfferAttachment,
  replaceOfferAssignment,
} from './offers.queries';

interface AuthContext {
  role: Role | null;
  entityId: number | null;
}

export interface OfferDependencyStatus {
  company_pending: boolean;
  pending_contact_ids: number[];
}

/**
 * Statut reel des dependances d'une offre (entreprise, contact prioritaire,
 * contacts associes), sans filtre de visibilite : reserve aux verifications
 * gestionnaire (blocage de /validate, affichage admin des dependances).
 */
function getDependencyBlockers(
  db: Database,
  companyId: number,
  priorityContactId: number | null,
  contactIds: number[],
): OfferDependencyStatus {
  const company = findCompanyByIdAny(db, companyId);
  const allContactIds = [...new Set([priorityContactId, ...contactIds].filter((id): id is number => id != null))];
  const contacts = findContactsByIds(db, allContactIds);
  return {
    company_pending: company ? company.validation_status === 'pending' : false,
    pending_contact_ids: contacts.filter((c) => c.validation_status === 'pending').map((c) => c.id),
  };
}

export function createOffer(input: OfferInput, auth: AuthContext): Offer {
  const db = getDb();

  // L'entreprise doit etre visible pour l'auteur (validee, ou sa propre
  // soumission en attente pour un etudiant) ; les contacts doivent lui
  // appartenir et etre visibles selon la meme regle (voir companies.queries).
  const company = findCompanyById(db, input.company_id, auth);
  if (!company) {
    throw new NotFoundError('Entreprise non trouvée ou non autorisée.');
  }
  const visibleContactIds = new Set(company.contacts.map((c) => c.id));
  const invalidContactIds = input.contact_ids.filter((id) => !visibleContactIds.has(id));
  if (invalidContactIds.length > 0) {
    throw new BadRequestError(
      "Un ou plusieurs contacts ne correspondent pas à l'entreprise sélectionnée ou ne sont pas accessibles.",
      { contact_ids: invalidContactIds },
    );
  }

  let status: OfferStatus = 'soumise';
  if (auth.role === 'gestionnaire') {
    const blockers = getDependencyBlockers(db, input.company_id, input.priority_contact_id, input.contact_ids);
    if (blockers.company_pending || blockers.pending_contact_ids.length > 0) {
      throw new ConflictError(
        "L'entreprise ou un contact sélectionné est encore en attente de validation : validez-les avant de créer une offre déjà publiée.",
        blockers,
      );
    }
    status = 'validee_et_visible';
  }

  return db.transaction(() => {
    const created = insertOffer(db, {
      ...input,
      // These attribution fields drive visibility: student proposals remain
      // visible to their author, and company-created offers stay visible to the
      // owning company even when a gestionnaire submits them on its behalf.
      submitted_by_student_id: auth.role === 'etudiant' ? auth.entityId : null,
      created_by_company_id:
        auth.role === 'entreprise' ? auth.entityId : auth.role === 'gestionnaire' ? input.company_id : null,
      source_type: auth.role === 'etudiant' ? 'student' : 'company',
      status,
    });
    linkOfferContacts(db, created.id, input.contact_ids);
    return created;
  })();
}

export function getOffers(auth: AuthContext, search?: string): Offer[] {
  return listOffersQuery(getDb(), auth, search);
}

export function getOfferById(id: number): Offer | null {
  return findOfferByIdQuery(getDb(), id);
}

export function getOfferDependencyStatus(id: number): OfferDependencyStatus | null {
  const db = getDb();
  const offer = findOfferByIdQuery(db, id);
  if (!offer) return null;
  return getDependencyBlockers(db, offer.company_id, offer.priority_contact_id, findLinkedContactIds(db, id));
}

export function validateOffer(id: number): Offer {
  const db = getDb();
  const offer = findOfferByIdQuery(db, id);
  if (!offer) {
    throw new NotFoundError('Offre non trouvée');
  }
  const blockers = getDependencyBlockers(db, offer.company_id, offer.priority_contact_id, findLinkedContactIds(db, id));
  if (blockers.company_pending || blockers.pending_contact_ids.length > 0) {
    throw new ConflictError(
      "Cette offre dépend d'une entreprise ou d'un contact encore en attente de validation.",
      blockers,
    );
  }
  return updateOfferStatus(db, id, 'validee_et_visible');
}

export function rejectOffer(id: number): Offer {
  return updateOfferStatus(getDb(), id, 'refusee');
}

export function closeOffer(id: number): Offer {
  return updateOfferStatus(getDb(), id, 'non_disponible');
}

export function editOffer(id: number, fields: Parameters<typeof updateOfferQuery>[2]): Offer {
  return updateOfferQuery(getDb(), id, fields);
}

export interface OfferAssignmentInput {
  company_id: number;
  priority_contact_id: number;
  contact_ids: number[];
}

/**
 * Réaffecte atomiquement l'entreprise, le contact prioritaire et les
 * contacts associés d'une offre. Réservé au gestionnaire : n'accepte qu'une
 * entreprise et des contacts déjà validés, pour que la réaffectation puisse
 * ensuite débloquer la validation de l'offre plutôt que de reproduire une
 * dépendance en attente.
 */
export function reassignOffer(id: number, input: OfferAssignmentInput): Offer {
  const db = getDb();
  const offer = findOfferByIdQuery(db, id);
  if (!offer) {
    throw new NotFoundError('Offre non trouvée');
  }

  const company = findCompanyByIdAny(db, input.company_id);
  if (!company) {
    throw new BadRequestError('Entreprise introuvable.');
  }

  const requestedContactIds = [...new Set([input.priority_contact_id, ...input.contact_ids])];
  const contacts = findContactsByIds(db, requestedContactIds);
  if (contacts.length !== requestedContactIds.length) {
    throw new BadRequestError('Un ou plusieurs contacts sont introuvables.');
  }
  const mismatched = contacts.filter((c) => c.company_id !== input.company_id);
  if (mismatched.length > 0) {
    throw new BadRequestError(
      "Un ou plusieurs contacts n'appartiennent pas à l'entreprise sélectionnée.",
      { contact_ids: mismatched.map((c) => c.id) },
    );
  }

  if (company.validation_status !== 'validated' || contacts.some((c) => c.validation_status !== 'validated')) {
    throw new ConflictError("L'entreprise et tous les contacts sélectionnés doivent être validés avant la réaffectation.");
  }

  return replaceOfferAssignment(db, id, input);
}

export function attachFile(id: number, filePath: string): Offer {
  return updateOfferAttachment(getDb(), id, filePath);
}
