import { Store } from 'express-session';
import type { SessionData } from 'express-session';
import { getDb } from '../../db/db.connection';

/**
 * Store express-session sur SQLite (better-sqlite3), remplace le MemoryStore
 * du pilote jalon 1. Resout la connexion via getDb() a chaque appel plutot
 * que de la garder en cache, pour rester compatible avec setDb() dans les
 * tests (voir db.connection.ts).
 */
export class SqliteSessionStore extends Store {
  get(sid: string, callback: (err: unknown, session?: SessionData | null) => void): void {
    try {
      const row = getDb()
        .prepare('SELECT session, expires_at FROM sessions WHERE sid = ?')
        .get(sid) as { session: string; expires_at: number } | undefined;

      if (!row || row.expires_at < Date.now()) {
        callback(null, null);
        return;
      }
      callback(null, JSON.parse(row.session) as SessionData);
    } catch (err) {
      callback(err);
    }
  }

  set(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    try {
      const expiresAt = session.cookie.expires
        ? new Date(session.cookie.expires).getTime()
        : Date.now() + 1000 * 60 * 60 * 8;

      const db = getDb();
      db.prepare(
        `INSERT INTO sessions (sid, session, expires_at) VALUES (?, ?, ?)
         ON CONFLICT(sid) DO UPDATE SET session = excluded.session, expires_at = excluded.expires_at`,
      ).run(sid, JSON.stringify(session), expiresAt);

      // Nettoyage opportuniste des sessions expirees plutot qu'un timer
      // dedie : peu de trafic attendu, index sur expires_at.
      db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());

      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    try {
      getDb().prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  touch(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    try {
      const expiresAt = session.cookie.expires
        ? new Date(session.cookie.expires).getTime()
        : Date.now() + 1000 * 60 * 60 * 8;
      getDb().prepare('UPDATE sessions SET expires_at = ? WHERE sid = ?').run(expiresAt, sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }
}
