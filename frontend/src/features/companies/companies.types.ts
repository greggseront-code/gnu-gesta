export type ContactRole = 'maitre_de_stage' | 'responsable_administratif' | 'encadrant_technique';
export type ValidationStatus = 'pending' | 'validated';

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  maitre_de_stage: 'Maître de stage',
  responsable_administratif: 'Responsable administratif',
  encadrant_technique: 'Encadrant technique',
};

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

export interface ContactPatchInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  roles?: ContactRole[];
}

export interface CompanyInput {
  name: string;
  general_email: string;
  address?: string;
  contacts: ContactInput[];
}

export interface StudentSummary {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

/** File de modération gestionnaire : voir GET /api/companies/pending. */
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
