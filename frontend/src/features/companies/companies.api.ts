import { apiFetch } from '../../lib/api-client';
import type {
  Company,
  CompanyContact,
  CompanyInput,
  CompanyWithContacts,
  ContactInput,
  ContactPatchInput,
  PendingQueue,
} from './companies.types';

export function listCompanies(search?: string): Promise<Company[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch<Company[]>(`/companies${qs}`);
}

export function listCompaniesWithDuplicateRisk(): Promise<Company[]> {
  return apiFetch<Company[]>('/companies?duplicate_risk=true');
}

export function getCompany(id: number): Promise<CompanyWithContacts> {
  return apiFetch<CompanyWithContacts>(`/companies/${id}`);
}

export function createCompany(input: CompanyInput): Promise<CompanyWithContacts> {
  return apiFetch<CompanyWithContacts>('/companies', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateCompany(
  id: number,
  fields: { name?: string; general_email?: string; address?: string },
): Promise<Company> {
  return apiFetch<Company>(`/companies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export function addContact(companyId: number, contact: ContactInput): Promise<CompanyContact> {
  return apiFetch<CompanyContact>(`/companies/${companyId}/contacts`, {
    method: 'POST',
    body: JSON.stringify(contact),
  });
}

// ─── Modération gestionnaire ────────────────────────────────────────────────

export function listPendingQueue(): Promise<PendingQueue> {
  return apiFetch<PendingQueue>('/companies/pending');
}

export function validateCompany(id: number): Promise<CompanyWithContacts> {
  return apiFetch<CompanyWithContacts>(`/companies/${id}/validate`, { method: 'POST' });
}

export function rejectCompany(id: number): Promise<void> {
  return apiFetch<void>(`/companies/${id}`, { method: 'DELETE' });
}

export function validateContact(contactId: number): Promise<CompanyContact> {
  return apiFetch<CompanyContact>(`/companies/contacts/${contactId}/validate`, { method: 'POST' });
}

export function updateContact(contactId: number, fields: ContactPatchInput): Promise<CompanyContact> {
  return apiFetch<CompanyContact>(`/companies/contacts/${contactId}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export function rejectContact(contactId: number): Promise<void> {
  return apiFetch<void>(`/companies/contacts/${contactId}`, { method: 'DELETE' });
}
