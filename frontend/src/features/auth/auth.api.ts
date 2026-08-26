import type { CurrentAuthUser, DevAuthFixture } from './auth.types';
import { apiFetch } from '../../lib/api-client';

const API_BASE = '/api';

export function loginUrl(): string {
  return `${API_BASE}/auth/login`;
}

export async function getDevAuthFixtures(): Promise<DevAuthFixture[]> {
  const response = await apiFetch<{ fixtures: DevAuthFixture[] }>('/auth/dev-fixtures');
  return response.fixtures;
}

export async function loginWithDevFixture(fixture: DevAuthFixture['name']): Promise<void> {
  await apiFetch('/auth/dev-login', { method: 'POST', body: JSON.stringify({ fixture }) });
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
