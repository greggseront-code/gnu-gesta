export type OfferStatus = 'soumise' | 'validee_et_visible' | 'prise' | 'non_disponible' | 'refusee';
export type OfferSourceType = 'company' | 'student';

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
}

/** Forme renvoyee par toutes les routes de lecture/mutation HTTP (voir offers.service). */
export interface OfferWithNames extends Offer {
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
