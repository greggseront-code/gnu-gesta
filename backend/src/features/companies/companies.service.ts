import { getDb } from '../../db/db.connection';
import { ConflictError, translateUniqueConstraint } from '../../lib/http-errors';
import type {
  AuthContext,
  Company,
  CompanyContact,
  CompanyInput,
  CompanyWithContacts,
  ContactInput,
  ContactPatchInput,
  PendingQueue,
  SubmissionFields,
} from './companies.types';
import {
  insertCompany,
  insertContact,
  listCompanies,
  findProbableDuplicates,
  findCompanyById,
  updateCompany,
  findCompaniesWithDuplicateRisk,
  GESTIONNAIRE_AUTH,
  findCompanyByIdAny,
  findContactByIdAny,
  findPendingCompanies,
  findPendingContacts,
  findStudentSummary,
  findOfferIdsReferencingCompany,
  findOfferIdsReferencingContact,
  validateCompanyAndInitialContacts,
  validateContact as validateContactQuery,
  updateContact,
  deleteCompany,
  deleteContact,
} from './companies.queries';

const UNIQUENESS_MESSAGES: Record<string, string> = {
  idx_company_contacts_email_norm:
    "Un contact avec cet email existe déjà. Recherchez-le et sélectionnez-le plutôt que d'en créer un nouveau.",
  idx_companies_name_address_norm:
    "Une entreprise avec ce nom et cette adresse existe déjà. Recherchez-la et sélectionnez-la plutôt que d'en créer une nouvelle.",
};

/** Un etudiant propose (statut en attente) ; tout autre role autorise a creer cree directement un element valide. */
function submissionFieldsFor(auth: AuthContext): SubmissionFields {
  if (auth.role === 'etudiant') {
    return { validation_status: 'pending', submitted_by_student_id: auth.entityId };
  }
  return { validation_status: 'validated' };
}

export function createCompany(input: CompanyInput, auth: AuthContext): CompanyWithContacts {
  const db = getDb();
  const fields = submissionFieldsFor(auth);

  let company: CompanyWithContacts;
  try {
    company = db.transaction(() => {
      const created = insertCompany(db, input, fields);
      const contacts = input.contacts.map((c) => insertContact(db, created.id, c, { ...fields, created_with_company: true }));
      return { ...created, contacts };
    })();
  } catch (err) {
    translateUniqueConstraint(err, UNIQUENESS_MESSAGES);
  }

  const duplicates = findProbableDuplicates(db, input.name, company.id, auth);

  return {
    ...company,
    ...(duplicates.length > 0 ? { probable_duplicates: duplicates } : {}),
  };
}

export function getCompanies(auth: AuthContext, search?: string): Company[] {
  return listCompanies(getDb(), auth, search);
}

export function getCompanyWithContacts(id: number, auth: AuthContext): CompanyWithContacts | null {
  return findCompanyById(getDb(), id, auth);
}

/** Retourne null si l'entreprise cible n'existe pas ou n'est pas visible pour l'auteur (route -> 404). */
export function addContactToCompany(companyId: number, contact: ContactInput, auth: AuthContext): CompanyContact | null {
  const db = getDb();
  const company = findCompanyById(db, companyId, auth);
  if (!company) return null;

  const fields = submissionFieldsFor(auth);
  try {
    return insertContact(db, companyId, contact, { ...fields, created_with_company: false });
  } catch (err) {
    translateUniqueConstraint(err, UNIQUENESS_MESSAGES);
  }
}

export function patchCompany(
  id: number,
  fields: { name?: string; general_email?: string; address?: string },
): Company {
  try {
    return updateCompany(getDb(), id, fields);
  } catch (err) {
    translateUniqueConstraint(err, UNIQUENESS_MESSAGES);
  }
}

export function getCompaniesWithDuplicateRisk(auth: AuthContext): Company[] {
  return findCompaniesWithDuplicateRisk(getDb(), auth);
}

// ─── Moderation gestionnaire ────────────────────────────────────────────────

export function getPendingQueue(): PendingQueue {
  const db = getDb();

  const companies = findPendingCompanies(db).map((company) => ({
    ...company,
    submitted_by_student: findStudentSummary(db, company.submitted_by_student_id),
    probable_duplicates: findProbableDuplicates(db, company.name, company.id, GESTIONNAIRE_AUTH),
    blocking_offer_ids: findOfferIdsReferencingCompany(db, company.id),
  }));

  const contacts = findPendingContacts(db).map((contact) => ({
    ...contact,
    submitted_by_student: findStudentSummary(db, contact.submitted_by_student_id),
    blocking_offer_ids: findOfferIdsReferencingContact(db, contact.id),
  }));

  return { companies, contacts };
}

/** null : entreprise absente (404). Lève ConflictError si déjà validée. */
export function acceptCompany(id: number): CompanyWithContacts | null {
  const db = getDb();
  const company = findCompanyByIdAny(db, id);
  if (!company) return null;
  if (company.validation_status === 'validated') {
    throw new ConflictError('Cette entreprise est déjà validée.');
  }
  return validateCompanyAndInitialContacts(db, id);
}

/** null : contact absent (404). Lève ConflictError si déjà validé. */
export function acceptContact(contactId: number): CompanyContact | null {
  const db = getDb();
  const contact = findContactByIdAny(db, contactId);
  if (!contact) return null;
  if (contact.validation_status === 'validated') {
    throw new ConflictError('Ce contact est déjà validé.');
  }
  return validateContactQuery(db, contactId);
}

export function editContact(contactId: number, fields: ContactPatchInput): CompanyContact | null {
  const db = getDb();
  const contact = findContactByIdAny(db, contactId);
  if (!contact) return null;
  try {
    return updateContact(db, contactId, fields);
  } catch (err) {
    translateUniqueConstraint(err, UNIQUENESS_MESSAGES);
  }
}

/**
 * null : entreprise absente (404). Lève ConflictError si déjà validée (seules
 * les soumissions en attente se refusent) ou si une offre la référence
 * encore (aucune suppression en cascade d'offre, voir plan).
 */
export function rejectCompany(id: number): 'deleted' | null {
  const db = getDb();
  const company = findCompanyByIdAny(db, id);
  if (!company) return null;
  if (company.validation_status !== 'pending') {
    throw new ConflictError('Seule une soumission en attente peut être refusée.');
  }
  const blockingOfferIds = findOfferIdsReferencingCompany(db, id);
  if (blockingOfferIds.length > 0) {
    throw new ConflictError(
      "Cette entreprise est référencée par au moins une offre : réaffectez ces offres avant de refuser cette soumission.",
      { offer_ids: blockingOfferIds },
    );
  }
  deleteCompany(db, id);
  return 'deleted';
}

export function rejectContact(contactId: number): 'deleted' | null {
  const db = getDb();
  const contact = findContactByIdAny(db, contactId);
  if (!contact) return null;
  if (contact.validation_status !== 'pending') {
    throw new ConflictError('Seule une soumission en attente peut être refusée.');
  }
  const blockingOfferIds = findOfferIdsReferencingContact(db, contactId);
  if (blockingOfferIds.length > 0) {
    throw new ConflictError(
      "Ce contact est référencé par au moins une offre : réaffectez ces offres avant de refuser cette soumission.",
      { offer_ids: blockingOfferIds },
    );
  }
  deleteContact(db, contactId);
  return 'deleted';
}
