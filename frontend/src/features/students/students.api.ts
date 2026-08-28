import { apiFetch } from '../../lib/api-client';
import type { Student, StudentInput } from './students.types';

export function listStudents(): Promise<Student[]> {
  return apiFetch<Student[]>('/students');
}

export function importStudents(rows: StudentInput[], academicYear: string): Promise<{ imported: number; academic_year: string }> {
  return apiFetch<{ imported: number; academic_year: string }>('/students/import', {
    method: 'POST',
    body: JSON.stringify({ academic_year: academicYear, students: rows }),
  });
}
