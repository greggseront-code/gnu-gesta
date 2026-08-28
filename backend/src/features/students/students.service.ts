import { getDb } from '../../db/db.connection';
import { upsertStudents, listStudents as listStudentsQuery } from './students.queries';
import type { StudentInput, Student } from './students.types';

export function importStudents(rows: StudentInput[]): number {
  return upsertStudents(getDb(), rows);
}

export function listStudents(): Student[] {
  return listStudentsQuery(getDb());
}
