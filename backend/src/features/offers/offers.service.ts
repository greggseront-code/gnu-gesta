import { getDb } from '../../db/db.connection';
import type { Role } from '../../middlewares/auth-context.middleware';
import type { Offer, OfferInput } from './offers.types';
import {
  insertOffer,
  linkOfferContacts,
  listOffers as listOffersQuery,
  findOfferById as findOfferByIdQuery,
  updateOfferStatus,
  updateOffer as updateOfferQuery,
  updateOfferCompany as updateOfferCompanyQuery,
  updateOfferAttachment,
} from './offers.queries';

interface AuthContext {
  role: Role | null;
  entityId: number | null;
}

export function createOffer(input: OfferInput, auth: AuthContext): Offer {
  const db = getDb();
  const offer = insertOffer(db, {
    ...input,
    // These attribution fields drive visibility: student proposals remain
    // visible to their author, and company-created offers stay visible to the
    // owning company even when a gestionnaire submits them on its behalf.
    submitted_by_student_id: auth.role === 'etudiant' ? auth.entityId : null,
    created_by_company_id:
      auth.role === 'entreprise' ? auth.entityId : auth.role === 'gestionnaire' ? input.company_id : null,
    source_type: auth.role === 'etudiant' ? 'student' : 'company',
  });
  linkOfferContacts(db, offer.id, input.contact_ids);
  return offer;
}

export function getOffers(auth: AuthContext, search?: string): Offer[] {
  return listOffersQuery(getDb(), auth, search);
}

export function getOfferById(id: number): Offer | null {
  return findOfferByIdQuery(getDb(), id);
}

export function validateOffer(id: number): Offer {
  return updateOfferStatus(getDb(), id, 'validee_et_visible');
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

export function changeOfferCompany(id: number, companyId: number): Offer {
  return updateOfferCompanyQuery(getDb(), id, companyId);
}

export function attachFile(id: number, filePath: string): Offer {
  return updateOfferAttachment(getDb(), id, filePath);
}
