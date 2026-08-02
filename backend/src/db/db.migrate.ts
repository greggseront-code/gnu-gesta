import { readFileSync } from 'fs';
import { join } from 'path';
import type { Database } from 'better-sqlite3';

export function runMigrations(db: Database): void {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
  applyColumnMigrations(db);
  normalizeStudentEmails(db);
  backfillValidationTimestamps(db);
  enforceCompanyAndContactUniqueness(db);
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

  addColumnIfMissing(
    db,
    'companies',
    'validation_status',
    "TEXT NOT NULL DEFAULT 'validated' CHECK(validation_status IN ('pending', 'validated'))",
  );
  addColumnIfMissing(db, 'companies', 'submitted_by_student_id', 'INTEGER REFERENCES students(id)');
  addColumnIfMissing(db, 'companies', 'validated_at', 'TEXT');

  addColumnIfMissing(
    db,
    'company_contacts',
    'validation_status',
    "TEXT NOT NULL DEFAULT 'validated' CHECK(validation_status IN ('pending', 'validated'))",
  );
  addColumnIfMissing(db, 'company_contacts', 'submitted_by_student_id', 'INTEGER REFERENCES students(id)');
  addColumnIfMissing(
    db,
    'company_contacts',
    'created_with_company',
    'INTEGER NOT NULL DEFAULT 0 CHECK(created_with_company IN (0, 1))',
  );
  addColumnIfMissing(db, 'company_contacts', 'validated_at', 'TEXT');

  // Crees ici (pas dans schema.sql) car ils portent sur des colonnes qui
  // viennent d'etre ajoutees ci-dessus sur une base existante.
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_entra_identity
      ON users(entra_tenant_id, entra_object_id)
      WHERE entra_tenant_id IS NOT NULL AND entra_object_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_nocase ON users(email COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_companies_validation_status ON companies(validation_status);
    CREATE INDEX IF NOT EXISTS idx_companies_submitted_by_student ON companies(submitted_by_student_id);
    CREATE INDEX IF NOT EXISTS idx_company_contacts_validation_status ON company_contacts(validation_status);
    CREATE INDEX IF NOT EXISTS idx_company_contacts_submitted_by_student ON company_contacts(submitted_by_student_id);
  `);
}

/**
 * Une ligne historique marquee 'validated' sans validated_at (colonne ajoutee
 * par ALTER TABLE, donc NULL par defaut) recoit sa date de creation : ALTER
 * TABLE ADD COLUMN ne supporte pas de defaut non constant comme
 * datetime('now'), voir addColumnIfMissing('users', 'updated_at', ...)
 * ci-dessus pour le meme constat sur users.
 */
function backfillValidationTimestamps(db: Database): void {
  db.prepare(
    `UPDATE companies SET validated_at = created_at WHERE validation_status = 'validated' AND validated_at IS NULL`,
  ).run();
  db.prepare(
    `UPDATE company_contacts SET validated_at = created_at WHERE validation_status = 'validated' AND validated_at IS NULL`,
  ).run();
}

interface UniquenessConflict {
  key: string;
  ids: number[];
}

/**
 * groupExprs peut contenir plusieurs expressions (ex: nom + adresse) : le
 * GROUP BY porte sur les colonnes reelles, pas sur une concatenation, pour ne
 * jamais rapporter un faux conflit entre deux combinaisons distinctes (ex:
 * nom="ab"+adresse="" et nom="a"+adresse="b").
 */
function findNormalizedConflicts(
  db: Database,
  table: 'companies' | 'company_contacts',
  groupExprs: string[],
): UniquenessConflict[] {
  const selectCols = groupExprs.map((expr, i) => `${expr} as k${i}`).join(', ');
  const groupBy = groupExprs.join(', ');
  const rows = db
    .prepare(`SELECT ${selectCols}, GROUP_CONCAT(id) as ids FROM ${table} GROUP BY ${groupBy} HAVING COUNT(*) > 1`)
    .all() as Record<string, string>[];
  return rows.map((r) => ({
    key: groupExprs.map((_, i) => r[`k${i}`]).join(' / '),
    ids: r.ids.split(',').map(Number),
  }));
}

/**
 * L'email d'un contact et le couple nom/adresse d'une entreprise sont des
 * cles metier uniques (voir spec). Une base historique en conflit ne doit
 * jamais etre corrigee automatiquement (pas de suppression ni de fusion) :
 * la migration echoue avec les identifiants a corriger, et les index uniques
 * ne sont pas crees tant que le conflit n'est pas resolu manuellement.
 */
function enforceCompanyAndContactUniqueness(db: Database): void {
  const emailConflicts = findNormalizedConflicts(db, 'company_contacts', ['LOWER(TRIM(email))']);
  const companyConflicts = findNormalizedConflicts(db, 'companies', [
    'LOWER(TRIM(name))',
    "LOWER(TRIM(COALESCE(address, '')))",
  ]);

  if (emailConflicts.length > 0 || companyConflicts.length > 0) {
    const lines = [
      ...emailConflicts.map((c) => `  company_contacts.email="${c.key}" ids=[${c.ids.join(', ')}]`),
      ...companyConflicts.map((c) => `  companies (nom / adresse)="${c.key}" ids=[${c.ids.join(', ')}]`),
    ];
    throw new Error(
      [
        "[db] Conflits d'unicite detectes avant migration : les index uniques n'ont pas ete crees.",
        'Corrigez manuellement ces enregistrements (aucune suppression ni fusion automatique) puis relancez :',
        ...lines,
      ].join('\n'),
    );
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_company_contacts_email_norm ON company_contacts(LOWER(TRIM(email)));
    CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_name_address_norm
      ON companies(LOWER(TRIM(name)), LOWER(TRIM(COALESCE(address, ''))));
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
