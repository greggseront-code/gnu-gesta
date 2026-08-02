import type { CurrentAuthUser } from './auth.types';
import { apiFetch } from '../../lib/api-client';

const API_BASE = '/api';

export function loginUrl(): string {
  return `${API_BASE}/auth/login`;
}

/** Returns null when there is no active session (401), throws on other failures. */
export async function getCurrentUser(): Promise<CurrentAuthUser | null> {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<CurrentAuthUser>;
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
}

export async function activateImpersonation(kind: 'student' | 'company', entityId: number): Promise<void> {
  await apiFetch('/auth/impersonation', { method: 'POST', body: JSON.stringify({ kind, entityId }) });
}

export async function deactivateImpersonation(): Promise<void> {
  await apiFetch('/auth/impersonation', { method: 'DELETE' });
}
