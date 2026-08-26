export type OfferStatus = 'soumise' | 'validee_et_visible' | 'prise' | 'non_disponible' | 'refusee';
export type OfferSourceType = 'company' | 'student';

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  soumise: 'Soumise',
  validee_et_visible: 'Validée',
  prise: 'Prise',
  non_disponible: 'Non disponible',
  refusee: 'Refusée',
};

export interface Offer {
  id: number;
  company_id: number;
  priority_contact_id: number | null;
  description: string;
  location: string | null;
  technologies: string | null;
  objectives: string | null;
  remote_allowed: number;
  remote_percentage: number | null;
  remarks: string | null;
  attachment_path: string | null;
  status: OfferStatus;
  submitted_by_student_id: number | null;
  created_by_company_id: number | null;
  source_type: OfferSourceType | null;
  created_at: string;
  updated_at: string;
  company_name: string;
  submitted_by_student_name: string | null;
}

export interface OfferInput {
  company_id: number;
  priority_contact_id: number;
  contact_ids: number[];
  description: string;
  location?: string;
  technologies?: string;
  objectives?: string;
  remote_allowed: boolean;
  remote_percentage?: number;
  remarks?: string;
}

export interface OfferAssignmentInput {
  company_id: number;
  priority_contact_id: number;
  contact_ids: number[];
}

export interface OfferDependencyStatus {
  company_pending: boolean;
  pending_contact_ids: number[];
}
