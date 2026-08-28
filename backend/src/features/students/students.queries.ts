import type { Database } from 'better-sqlite3';
import type { Student, StudentInput } from './students.types';

// ON CONFLICT(email) cible la contrainte UNIQUE sensible à la casse d'origine
// sur students.email ; l'index insensible à la casse ajouté au jalon 3
// (idx_students_email_nocase, voir db.migrate.ts) attrape en plus les
// doublons de casse mais n'est pas couvert par cet upsert : un import réel
// réutilise systématiquement la même casse que l'annuaire source, donc ce
// cas limite est accepté sans upsert chaîné supplémentaire.
export function upsertStudents(db: Database, rows: StudentInput[]): number {
  const stmt = db.prepare(`
    INSERT INTO students (matricule, first_name, last_name, email, date_naissance)
    VALUES (@matricule, @first_name, @last_name, @email, @date_naissance)
    ON CONFLICT(email) DO UPDATE SET
      matricule      = excluded.matricule,
      first_name     = excluded.first_name,
      last_name      = excluded.last_name,
      date_naissance = excluded.date_naissance
  `);

  const run = db.transaction((students: StudentInput[]) => {
    for (const s of students) {
      stmt.run({
        matricule: s.matricule ?? null,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email,
        date_naissance: s.date_naissance ?? null,
      });
    }
    return students.length;
  });

  return run(rows) as number;
}

export function upsertStudentsForAcademicYear(
  db: Database,
  rows: StudentInput[],
  academicYear: string,
): number {
  const upsert = db.prepare(`
    INSERT INTO students (matricule, first_name, last_name, email, date_naissance)
    VALUES (@matricule, @first_name, @last_name, @email, @date_naissance)
    ON CONFLICT(email) DO UPDATE SET
      matricule      = excluded.matricule,
      first_name     = excluded.first_name,
      last_name      = excluded.last_name,
      date_naissance = excluded.date_naissance
  `);
  const findId = db.prepare('SELECT id FROM students WHERE email = ? COLLATE NOCASE');
  const linkEligibility = db.prepare(`
    INSERT INTO student_academic_year_eligibility (student_id, academic_year)
    VALUES (?, ?)
    ON CONFLICT(student_id, academic_year) DO NOTHING
  `);

  return db.transaction(() => {
    for (const student of rows) {
      upsert.run({
        matricule: student.matricule ?? null,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        date_naissance: student.date_naissance ?? null,
      });
      const found = findId.get(student.email) as { id: number };
      linkEligibility.run(found.id, academicYear);
    }
    return rows.length;
  })();
}

export function listStudents(db: Database): Student[] {
  return db
    .prepare('SELECT * FROM students ORDER BY last_name, first_name')
    .all() as Student[];
}

export function findStudentById(db: Database, id: number): Student | null {
  return (db.prepare('SELECT * FROM students WHERE id = ?').get(id) as Student | undefined) ?? null;
}
