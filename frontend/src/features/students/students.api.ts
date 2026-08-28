import { apiFetch } from '../../lib/api-client';
import type { Student, StudentInput } from './students.types';

export function listStudents(): Promise<Student[]> {
  return apiFetch<Student[]>('/students');
}

export function importStudents(rows: StudentInput[]): Promise<{ imported: number }> {
  return apiFetch<{ imported: number }>('/students/import', {
    method: 'POST',
    body: JSON.stringify(rows),
  });
}
