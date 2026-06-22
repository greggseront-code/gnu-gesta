import { ROLE_STORAGE_KEY, type RoleState } from '../../context/role-context';
import { apiFetch } from '../../lib/api-client';
import type { Offer, OfferInput } from './offers.types';

export function listVisibleOffers(search?: string): Promise<Offer[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch<Offer[]>(`/offers${qs}`);
}

export function listPedagogicalOffers(search?: string): Promise<Offer[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch<Offer[]>(`/offers${qs}`);
}

export function listMyStudentOffers(): Promise<Offer[]> {
  return apiFetch<Offer[]>('/offers');
}

export function listMyCompanyOffers(): Promise<Offer[]> {
  return apiFetch<Offer[]>('/offers');
}

export function getOffer(id: number): Promise<Offer> {
  return apiFetch<Offer>(`/offers/${id}`);
}

export function validateOffer(id: number): Promise<Offer> {
  return apiFetch<Offer>(`/offers/${id}/validate`, { method: 'POST' });
}

export function rejectOffer(id: number): Promise<Offer> {
  return apiFetch<Offer>(`/offers/${id}/reject`, { method: 'POST' });
}

export function markUnavailable(id: number): Promise<Offer> {
  return apiFetch<Offer>(`/offers/${id}/mark-unavailable`, { method: 'POST' });
}

export function createOffer(input: OfferInput): Promise<Offer> {
  return apiFetch<Offer>('/offers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateOffer(id: number, input: Partial<OfferInput>): Promise<Offer> {
  return apiFetch<Offer>(`/offers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function changeOfferCompany(id: number, companyId: number): Promise<Offer> {
  return apiFetch<Offer>(`/offers/${id}/company`, {
    method: 'PATCH',
    body: JSON.stringify({ company_id: companyId }),
  });
}

export async function uploadOfferAttachment(offerId: number, file: File): Promise<Offer> {
  const raw = localStorage.getItem(ROLE_STORAGE_KEY);
  const authHeaders: Record<string, string> = {};
  if (raw) {
    try {
      const { role, entityId } = JSON.parse(raw) as RoleState;
      if (role) authHeaders['x-role'] = role;
      if (entityId != null) authHeaders['x-entity-id'] = String(entityId);
    } catch {
      // ignore
    }
  }

  const formData = new FormData();
  formData.append('file', file);

  // Do not use apiFetch here: FormData must let the browser set the multipart
  // boundary, while the V1 auth headers still need to be forwarded manually.
  const res = await fetch(`/api/offers/${offerId}/attachment`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<Offer>;
}
