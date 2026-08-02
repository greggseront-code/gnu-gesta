import type { Role } from '../../middlewares/auth-context.middleware';

export type ContactRole = 'maitre_de_stage' | 'responsable_administratif' | 'encadrant_technique';
export type ValidationStatus = 'pending' | 'validated';

export interface AuthContext {
  role: Role | null;
  entityId: number | null;
}

export interface Company {
  id: number;
  name: string;
  address: string | null;
  general_email: string;
  validation_status: ValidationStatus;
  submitted_by_student_id: number | null;
  validated_at: string | null;
  created_at: string;
}

export interface CompanyContact {
  id: number;
  company_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  roles: ContactRole[];
  validation_status: ValidationStatus;
  submitted_by_student_id: number | null;
  created_with_company: number;
  validated_at: string | null;
  created_at: string;
}

/** Statut de soumission calcule par le service selon le role effectif courant (jamais fourni par le client). */
export interface SubmissionFields {
  validation_status: ValidationStatus;
  submitted_by_student_id?: number | null;
}

export interface CompanyWithContacts extends Company {
  contacts: CompanyContact[];
  probable_duplicates?: Company[];
}

export interface ContactInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  roles: ContactRole[];
}

export interface CompanyInput {
  name: string;
  general_email: string;
  address?: string;
  contacts: ContactInput[];
}

export interface ContactPatchInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  roles?: ContactRole[];
}

export interface StudentSummary {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

/** File de moderation gestionnaire : voir GET /api/companies/pending. */
export interface PendingCompany extends Company {
  submitted_by_student: StudentSummary | null;
  probable_duplicates: Company[];
  blocking_offer_ids: number[];
}

export interface PendingContact extends CompanyContact {
  submitted_by_student: StudentSummary | null;
  company_name: string;
  blocking_offer_ids: number[];
}

export interface PendingQueue {
  companies: PendingCompany[];
  contacts: PendingContact[];
}
