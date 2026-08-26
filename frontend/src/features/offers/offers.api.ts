import { apiFetch, getCsrfToken } from '../../lib/api-client';
import type { Offer, OfferAssignmentInput, OfferAttachment, OfferDependencyStatus, OfferInput } from './offers.types';

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

export function getOfferDependencies(id: number): Promise<OfferDependencyStatus> {
  return apiFetch<OfferDependencyStatus>(`/offers/${id}/dependencies`);
}

export function reassignOffer(id: number, input: OfferAssignmentInput): Promise<Offer> {
  return apiFetch<Offer>(`/offers/${id}/assignment`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function listOfferAttachments(offerId: number): Promise<OfferAttachment[]> {
  return apiFetch<OfferAttachment[]>(`/offers/${offerId}/attachments`);
}

export function getOfferAttachmentUrl(offerId: number, attachmentId: number): string {
  return `/api/offers/${offerId}/attachments/${attachmentId}`;
}

export async function uploadOfferAttachment(offerId: number, file: File): Promise<OfferAttachment> {
  const formData = new FormData();
  formData.append('file', file);

  // Do not use apiFetch here: FormData must let the browser set the
  // multipart boundary, so Content-Type cannot be forced to application/json.
  const csrfToken = getCsrfToken();
  const res = await fetch(`/api/offers/${offerId}/attachments`, {
    method: 'POST',
    credentials: 'include',
    headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<OfferAttachment>;
}

export function deleteOfferAttachment(offerId: number, attachmentId: number): Promise<void> {
  return apiFetch<void>(`/offers/${offerId}/attachments/${attachmentId}`, { method: 'DELETE' });
}
