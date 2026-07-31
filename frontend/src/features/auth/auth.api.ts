import type { CurrentAuthUser } from './auth.types';

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
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
}
