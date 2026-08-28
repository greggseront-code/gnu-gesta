import { apiFetch, getCsrfToken } from '../../lib/api-client';
import type { AnnualInternshipRow, InternshipDetail, InternshipDocumentKind, InternshipStatus } from './internships.types';

export function listAcademicYears(): Promise<string[]> {
  return apiFetch<string[]>('/internships/years');
}

export function listAnnualInternships(academicYear: string): Promise<AnnualInternshipRow[]> {
  return apiFetch<AnnualInternshipRow[]>(`/internships?academic_year=${encodeURIComponent(academicYear)}`);
}

export function getInternship(id: number): Promise<InternshipDetail> {
  return apiFetch<InternshipDetail>(`/internships/${id}`);
}

export function updateInternship(
  id: number,
  input: { start_date: string; end_date: string; signing_contact_id: number },
): Promise<InternshipDetail> {
  return apiFetch<InternshipDetail>(`/internships/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function generateConvention(id: number): Promise<InternshipDetail> {
  return apiFetch<InternshipDetail>(`/internships/${id}/generate-convention`, { method: 'POST' });
}

export async function uploadSignedConvention(id: number, file: File): Promise<InternshipDetail> {
  const body = new FormData();
  body.append('file', file);
  const csrfToken = getCsrfToken();
  const response = await fetch(`/api/internships/${id}/signed-convention`, {
    method: 'POST',
    credentials: 'include',
    headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
    body,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error((result as { error?: string }).error ?? `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<InternshipDetail>;
}

export function confirmInternship(id: number): Promise<InternshipDetail> {
  return apiFetch<InternshipDetail>(`/internships/${id}/confirm`, { method: 'POST' });
}

export function setTerminalStatus(
  id: number,
  status: Extract<InternshipStatus, 'termine' | 'interrompu' | 'echoue'>,
): Promise<InternshipDetail> {
  return apiFetch<InternshipDetail>(`/internships/${id}/terminal-status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export function deleteInternship(id: number): Promise<void> {
  return apiFetch<void>(`/internships/${id}`, { method: 'DELETE' });
}

export function internshipDocumentUrl(id: number, kind: InternshipDocumentKind): string {
  return `/api/internships/${id}/documents/${kind}`;
}

export function internshipExportUrl(academicYear: string): string {
  return `/api/internships/export/${encodeURIComponent(academicYear)}`;
}
