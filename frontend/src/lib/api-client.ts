const API_BASE = '/api';
const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * Porte le corps JSON complet de la réponse d'erreur (ex: `offer_ids` d'un
 * 409 de dépendance bloquante), en plus du message lisible sur `.message`.
 * Reste un Error standard pour ne pas casser les `catch` existants.
 */
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

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
    throw new ApiError((body as { error?: string }).error ?? `${res.status} ${res.statusText}`, res.status, body);
  }
  // 204 (logout, fin d'incarnation) n'a pas de corps : res.json() lèverait
  // une erreur de parsing JSON sur une chaîne vide.
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
