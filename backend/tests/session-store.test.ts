import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import type { SessionData } from 'express-session';
import { createTestDb, setDb } from '../src/db/db.connection';
import { SqliteSessionStore } from '../src/features/auth/session.store';

function fakeSession(expiresInMs: number): SessionData {
  return {
    cookie: {
      originalMaxAge: expiresInMs,
      expires: new Date(Date.now() + expiresInMs),
    },
    userValue: 'hello',
  } as unknown as SessionData;
}

function getAsync(store: SqliteSessionStore, sid: string): Promise<SessionData | null | undefined> {
  return new Promise((resolve, reject) => {
    store.get(sid, (err, session) => (err ? reject(err) : resolve(session)));
  });
}

function setAsync(store: SqliteSessionStore, sid: string, session: SessionData): Promise<void> {
  return new Promise((resolve, reject) => {
    store.set(sid, session, (err) => (err ? reject(err) : resolve()));
  });
}

function destroyAsync(store: SqliteSessionStore, sid: string): Promise<void> {
  return new Promise((resolve, reject) => {
    store.destroy(sid, (err) => (err ? reject(err) : resolve()));
  });
}

describe('SqliteSessionStore', () => {
  let db: Database;
  let store: SqliteSessionStore;

  beforeEach(() => {
    db = createTestDb();
    setDb(db);
    store = new SqliteSessionStore();
  });

  afterEach(() => db.close());

  it('stores and retrieves a session', async () => {
    await setAsync(store, 'sid-1', fakeSession(60_000));
    const session = await getAsync(store, 'sid-1');
    expect(session).toMatchObject({ userValue: 'hello' });
  });

  it('returns null for an unknown session id', async () => {
    const session = await getAsync(store, 'does-not-exist');
    expect(session).toBeNull();
  });

  it('returns null and drops an expired session', async () => {
    await setAsync(store, 'sid-expired', fakeSession(-1000));
    const session = await getAsync(store, 'sid-expired');
    expect(session).toBeNull();
  });

  it('destroy() removes the session', async () => {
    await setAsync(store, 'sid-2', fakeSession(60_000));
    await destroyAsync(store, 'sid-2');
    const session = await getAsync(store, 'sid-2');
    expect(session).toBeNull();
  });

  it('persists across a new store instance sharing the same database (simulates a backend restart)', async () => {
    await setAsync(store, 'sid-3', fakeSession(60_000));
    const otherStoreInstance = new SqliteSessionStore();
    const session = await getAsync(otherStoreInstance, 'sid-3');
    expect(session).toMatchObject({ userValue: 'hello' });
  });

  it('set() opportunistically cleans up expired sessions', async () => {
    await setAsync(store, 'sid-old', fakeSession(-1000));
    await setAsync(store, 'sid-new', fakeSession(60_000));

    const row = db.prepare('SELECT COUNT(*) as n FROM sessions').get() as { n: number };
    expect(row.n).toBe(1);
  });
});
