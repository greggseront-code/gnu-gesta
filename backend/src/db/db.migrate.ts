import { readFileSync } from 'fs';
import { join } from 'path';
import type { Database } from 'better-sqlite3';

export function runMigrations(db: Database): void {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
  applyColumnMigrations(db);
}

export function runSeed(db: Database): void {
  // Dans getDb(), après runMigrations
  const isEmpty = (db.prepare('SELECT COUNT(*) as n FROM users').get() as {n:number}).n === 0;
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
}
