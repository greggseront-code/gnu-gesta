import type { Database } from 'better-sqlite3';
import type { BaseRole } from './auth.types';

/**
 * Cree ou met a jour la ligne `users` identifiee par le couple immuable
 * (tid, oid). `role`/`entity_id` sont un instantane du dernier login, pas la
 * source de verite d'autorisation (c'est la session) : utile pour l'audit et
 * un futur ecran d'administration, jamais relu pour decider un acces.
 */
export function upsertIdentity(
  db: Database,
  params: {
    tid: string;
    oid: string;
    email: string;
    displayName: string;
    role: BaseRole;
    entityId: number | null;
  },
): void {
  const existing = db
    .prepare('SELECT id FROM users WHERE entra_tenant_id = ? AND entra_object_id = ?')
    .get(params.tid, params.oid) as { id: number } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE users
       SET email = ?, display_name = ?, role = ?, entity_id = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).run(params.email, params.displayName, params.role, params.entityId, existing.id);
    return;
  }

  db.prepare(
    `INSERT INTO users (email, role, entity_id, entra_tenant_id, entra_object_id, display_name, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(email) DO UPDATE SET
       role = excluded.role,
       entity_id = excluded.entity_id,
       entra_tenant_id = excluded.entra_tenant_id,
       entra_object_id = excluded.entra_object_id,
       display_name = excluded.display_name,
       updated_at = excluded.updated_at`,
  ).run(params.email, params.role, params.entityId, params.tid, params.oid, params.displayName);
}

/** Recherche une fiche `students` par email, insensible a la casse. Unique par construction (voir idx sur students.email). */
export function findStudentIdByEmail(db: Database, email: string): number | null {
  const row = db.prepare('SELECT id FROM students WHERE email = ? COLLATE NOCASE').get(email) as
    | { id: number }
    | undefined;
  return row?.id ?? null;
}
