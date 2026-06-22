import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { runMigrations, runSeed } from './db.migrate';

export type { Database } from 'better-sqlite3';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const dbPath = join(__dirname, '../../data/gesta.db');
    mkdirSync(join(__dirname, '../../data'), { recursive: true });
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    runMigrations(_db);
    runSeed(_db);
  }
  return _db;
}

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

export function setDb(db: Database.Database): void {
  _db = db;
}
