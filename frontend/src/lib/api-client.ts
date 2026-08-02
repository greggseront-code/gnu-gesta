const API_BASE = '/api';
const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

let csrfToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

/** Renseigné par AuthProvider à chaque rafraîchissement de session (voir context/auth-context.tsx). */
export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

/** Pour les rares appels qui ne peuvent pas passer par apiFetch (ex: upload FormData, voir offers.api.ts). */
export function getCsrfToken(): string | null {
  return csrfToken;
}

/** Permet à AuthProvider de réagir globalement à un 401 (session expirée) sans que chaque page ne le gère. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const method = (options?.method ?? 'GET').toUpperCase();

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(MUTATING_METHODS.has(method) && csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (res.status === 401) {
    unauthorizedHandler?.();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `${res.status} ${res.statusText}`);
  }
  // 204 (logout, fin d'incarnation) n'a pas de corps : res.json() lèverait
  // une erreur de parsing JSON sur une chaîne vide.
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
