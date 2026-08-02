import { readFileSync } from 'fs';
import { join } from 'path';
import type { Database } from 'better-sqlite3';

export function runMigrations(db: Database): void {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
  applyColumnMigrations(db);
  normalizeStudentEmails(db);
}

export function runSeed(db: Database): void {
  // Dans getDb(), après runMigrations. Teste `students` et non `users` :
  // `users` se peuple desormais via la connexion Microsoft Entra (voir
  // backend/src/features/auth/README.md), pas via ce seed.
  const isEmpty = (db.prepare('SELECT COUNT(*) as n FROM students').get() as {n:number}).n === 0;
  if (isEmpty){
    const seed = readFileSync(join(__dirname, 'seeds/seed.sql'), 'utf-8');
    db.exec(seed);
  }
}

function addColumnIfMissing(db: Database, table: string, column: string, definition: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

function applyColumnMigrations(db: Database): void {
  addColumnIfMissing(db, 'offers', 'created_by_company_id', 'INTEGER REFERENCES companies(id)');
  addColumnIfMissing(db, 'offers', 'source_type', "TEXT CHECK(source_type IN ('company', 'student'))");
  addColumnIfMissing(db, 'users', 'entra_tenant_id', 'TEXT');
  addColumnIfMissing(db, 'users', 'entra_object_id', 'TEXT');
  addColumnIfMissing(db, 'users', 'display_name', 'TEXT');
  // Pas de NOT NULL ici : SQLite refuse ALTER TABLE ADD COLUMN ... NOT NULL
  // DEFAULT (datetime('now')) (defaut non constant). Les lignes historiques
  // restent a NULL jusqu'au prochain upsertIdentity(), qui renseigne toujours
  // updated_at.
  addColumnIfMissing(db, 'users', 'updated_at', 'TEXT');

  // Crees ici (pas dans schema.sql) car ils portent sur des colonnes qui
  // viennent d'etre ajoutees ci-dessus sur une base existante.
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_entra_identity
      ON users(entra_tenant_id, entra_object_id)
      WHERE entra_tenant_id IS NOT NULL AND entra_object_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_nocase ON users(email COLLATE NOCASE);
  `);
}

/**
 * Jalon 3 : la liaison etudiante compare les emails sans tenir compte de la
 * casse (voir auth.queries.findStudentIdByEmail). Avant de rendre ça
 * garanti par un index unique, on resout les doublons de casse deja
 * presents (donnees V1 de demonstration) en ne gardant que la fiche la plus
 * ancienne par groupe. Une fiche encore referencee par une candidature ou
 * une offre n'est jamais supprimee automatiquement : elle reste en doublon
 * et un avertissement est logue plutot que de faire echouer le demarrage.
 */
function normalizeStudentEmails(db: Database): void {
  const duplicateGroups = db
    .prepare('SELECT LOWER(email) as email_lower FROM students GROUP BY LOWER(email) HAVING COUNT(*) > 1')
    .all() as { email_lower: string }[];

  for (const group of duplicateGroups) {
    const rows = db
      .prepare('SELECT id FROM students WHERE email = ? COLLATE NOCASE ORDER BY id')
      .all(group.email_lower) as { id: number }[];
    const [, ...extras] = rows;

    for (const extra of extras) {
      try {
        db.prepare('DELETE FROM students WHERE id = ?').run(extra.id);
      } catch {
        console.warn(
          `[db] doublon d'email etudiant conserve (students.id=${extra.id}) : ` +
            'referencee par une candidature ou une offre, suppression automatique refusee.',
        );
      }
    }
  }

  try {
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_students_email_nocase ON students(email COLLATE NOCASE)');
  } catch {
    console.warn("[db] impossible de creer l'index unique students.email (COLLATE NOCASE) : doublons restants non resolus.");
  }
}
