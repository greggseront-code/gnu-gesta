import { apiFetch } from '../../lib/api-client';
import type { Student, StudentsImportInput, StudentsImportResult } from './students.types';

export function listStudents(): Promise<Student[]> {
  return apiFetch<Student[]>('/students');
}

export function importStudents(input: StudentsImportInput): Promise<StudentsImportResult> {
  return apiFetch<StudentsImportResult>('/students/import', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
