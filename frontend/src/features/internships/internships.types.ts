export type InternshipStatus = 'preparation' | 'confirme' | 'termine' | 'interrompu' | 'echoue';
export type InternshipOriginType = 'candidature' | 'proposition';
export type InternshipDocumentKind = 'generated' | 'signed';

export interface InternshipDocument {
  id: number;
  internship_id: number;
  kind: InternshipDocumentKind;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface InternshipDetail {
  id: number;
  student_id: number;
  company_id: number;
  origin_type: InternshipOriginType;
  origin_offer_id: number;
  origin_application_id: number | null;
  start_date: string | null;
  end_date: string | null;
  academic_year: string | null;
  signing_contact_id: number | null;
  status: InternshipStatus;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  student: {
    id: number;
    matricule: string | null;
    first_name: string;
    last_name: string;
    email: string;
  };
  company: {
    id: number;
    name: string;
    address: string | null;
    general_email: string;
  };
  signing_contact: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  origin_description: string;
  contacts: Array<{
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    validation_status: 'pending' | 'validated';
  }>;
  documents: InternshipDocument[];
}

export interface AnnualInternshipRow {
  student_id: number;
  matricule: string | null;
  last_name: string;
  first_name: string;
  email: string;
  has_internship: boolean;
  internship_id: number | null;
  status: InternshipStatus | null;
  company_name: string | null;
  start_date: string | null;
  end_date: string | null;
  signing_contact_name: string | null;
}

export const INTERNSHIP_STATUS_LABELS: Record<InternshipStatus, string> = {
  preparation: 'En préparation',
  confirme: 'Confirmé',
  termine: 'Terminé',
  interrompu: 'Interrompu',
  echoue: 'Échoué',
};
