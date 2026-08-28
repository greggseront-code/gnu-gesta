import { getDb } from '../../db/db.connection';
import {
  upsertStudents,
  upsertStudentsForAcademicYear,
  listStudents as listStudentsQuery,
} from './students.queries';
import type { StudentInput, Student } from './students.types';

export function importStudents(rows: StudentInput[]): number {
  return upsertStudents(getDb(), rows);
}

export function importStudentsForAcademicYear(rows: StudentInput[], academicYear: string): number {
  return upsertStudentsForAcademicYear(getDb(), rows, academicYear);
}

export function listStudents(): Student[] {
  return listStudentsQuery(getDb());
}
