import request from 'supertest';
import type { Database } from 'better-sqlite3';
import { createTestDb, setDb } from '../src/db/db.connection';
import { testServer } from './helpers/test-server';

// Sans setDb(), /api/health resout getDb() et cree/seede la vraie base
// backend/data/gesta.db : le test dependrait de l'etat du disque et le
// polluerait a chaque execution.
let db: Database;

beforeEach(() => {
  db = createTestDb();
  setDb(db);
});

afterEach(() => db.close());

test('GET /api/health returns 200 with ok: true', async () => {
  const res = await request(testServer).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
  expect(res.body.tables).toBeGreaterThan(0);
});
