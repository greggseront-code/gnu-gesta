export interface StudentInput {
  matricule?: string;
  first_name: string;
  last_name: string;
  email: string;
  date_naissance?: string;
}

export interface StudentsImportInput {
  academic_year: string;
  students: StudentInput[];
}

export interface Student {
  id: number;
  matricule: string | null;
  first_name: string;
  last_name: string;
  email: string;
  date_naissance: string | null;
  created_at: string;
}
