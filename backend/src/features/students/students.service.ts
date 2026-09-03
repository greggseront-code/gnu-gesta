import { getDb } from '../../db/db.connection';
import { importStudentsForAcademicYear, listStudents as listStudentsQuery } from './students.queries';
import type { StudentsImportInput, Student } from './students.types';

export function importStudents(input: StudentsImportInput): number {
  return importStudentsForAcademicYear(getDb(), input.students, input.academic_year);
}

export function listStudents(): Student[] {
  return listStudentsQuery(getDb());
}
