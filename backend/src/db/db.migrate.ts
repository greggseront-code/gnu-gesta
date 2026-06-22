import { readFileSync } from 'fs';
import { join } from 'path';
import type { Database } from 'better-sqlite3';

export function runMigrations(db: Database, options?: { seedDemo?: boolean }): void {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
  applyColumnMigrations(db);
  if (options?.seedDemo !== false) {
    runDemoSeed(db);
  }
}

function runDemoSeed(db: Database): void {
  const count = (db.prepare('SELECT COUNT(*) as n FROM students').get() as { n: number }).n;
  if (count > 0) return;
  const sql = readFileSync(join(__dirname, 'seeds/demo.sql'), 'utf-8');
  db.transaction(() => db.exec(sql))();
  console.log('[gesta] Données de démonstration chargées au premier lancement.');
}

function addColumnIfMissing(db: Database, table: string, column: string, definition: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

function applyColumnMigrations(db: Database): void {
  // Migration strategy is deliberately minimal for SQLite V1: schema.sql creates
  // fresh databases, and only additive column migrations are applied in place.
  addColumnIfMissing(db, 'offers', 'created_by_company_id', 'INTEGER REFERENCES companies(id)');
  addColumnIfMissing(db, 'offers', 'source_type', "TEXT CHECK(source_type IN ('company', 'student'))");
}
