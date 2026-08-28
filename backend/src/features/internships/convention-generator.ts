import { readFileSync } from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import type { InternshipDetail } from './internships.types';
import { ConflictError } from '../../lib/http-errors';

export const CONVENTION_TEMPLATE_PATH = path.resolve(__dirname, '../../../assets/convention-template.docx');

const PLACEHOLDERS = [
  'student_first_name',
  'student_last_name',
  'company_name',
  'company_address',
  'contact_first_name',
  'contact_last_name',
  'start_date',
  'end_date',
  'generation_date',
] as const;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function frenchDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00Z`) : value;
  return new Intl.DateTimeFormat('fr-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function conventionDownloadName(detail: InternshipDetail): string {
  const raw = `convention-${detail.student.last_name}-${detail.student.first_name}-${detail.academic_year}`;
  const slug = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${slug}.docx`;
}

export function generateConventionDocument(
  detail: InternshipDetail,
  generatedAt = new Date(),
  templatePath = CONVENTION_TEMPLATE_PATH,
): Buffer {
  if (!detail.start_date || !detail.end_date || !detail.academic_year || !detail.signing_contact) {
    throw new ConflictError('Complétez les dates et le contact signataire avant de générer la convention.');
  }
  if (!detail.company.address?.trim()) {
    throw new ConflictError("Complétez l'adresse de l'entreprise avant de générer la convention.");
  }

  const values: Record<(typeof PLACEHOLDERS)[number], string> = {
    student_first_name: detail.student.first_name,
    student_last_name: detail.student.last_name,
    company_name: detail.company.name,
    company_address: detail.company.address.trim(),
    contact_first_name: detail.signing_contact.first_name,
    contact_last_name: detail.signing_contact.last_name,
    start_date: frenchDate(detail.start_date),
    end_date: frenchDate(detail.end_date),
    generation_date: frenchDate(generatedAt),
  };

  const zip = new PizZip(readFileSync(templatePath));
  const document = zip.file('word/document.xml');
  if (!document) throw new Error('Le modèle de convention ne contient pas word/document.xml.');
  let xml = document.asText();
  for (const placeholder of PLACEHOLDERS) {
    const token = `{{${placeholder}}}`;
    if (!xml.includes(token)) throw new Error(`Le modèle de convention ne contient pas ${token}.`);
    xml = xml.split(token).join(escapeXml(values[placeholder]));
  }
  if (/\{\{[a-z_]+\}\}/.test(xml)) {
    throw new Error('Le modèle de convention contient encore une variable non remplacée.');
  }
  zip.file('word/document.xml', xml);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer;
}
