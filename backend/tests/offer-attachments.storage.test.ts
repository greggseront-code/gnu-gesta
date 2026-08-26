import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  attachmentExists,
  attachmentSize,
  ensureUploadsRoot,
  generateStorageName,
  removeAttachment,
  resolveStoredAttachment,
  validateStoredAttachmentMetadata,
} from '../src/features/offers/offer-attachments.storage';

describe('offer attachment storage', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  it('génère un nom technique normalisé sans réutiliser le nom original', () => {
    const pdf = generateStorageName('../dossier/Contrat.PDF', 'application/pdf');
    const docx = generateStorageName('contrat final.DOCX', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(pdf).toMatch(/^[0-9a-f-]+\.pdf$/);
    expect(docx).toMatch(/^[0-9a-f-]+\.docx$/);
    expect(pdf).not.toContain('Contrat');
    expect(validateStoredAttachmentMetadata(pdf, 'application/pdf')).toBe('application/pdf');
  });

  it('refuse les couples extension/MIME incohérents et les traversées', () => {
    expect(() => generateStorageName('document.pdf', 'application/octet-stream')).toThrow();
    expect(() => generateStorageName('document.exe', 'application/pdf')).toThrow();
    expect(() => resolveStoredAttachment('../secret.txt')).toThrow();
    expect(() => resolveStoredAttachment('..\\secret.pdf')).toThrow();
    expect(() => resolveStoredAttachment(join('nested', 'file.pdf'))).toThrow();
  });

  it('fournit existence, taille et suppression sur une racine temporaire', () => {
    const root = mkdtempSync(join(tmpdir(), 'gnu-gesta-attachments-'));
    roots.push(root);
    ensureUploadsRoot(root);
    const name = 'safe.pdf';
    writeFileSync(join(root, name), '%PDF-1.4');
    expect(attachmentExists(name, root)).toBe(true);
    expect(attachmentSize(name, root)).toBe(8);
    expect(removeAttachment(name, root)).toBe(true);
    expect(attachmentExists(name, root)).toBe(false);
    expect(removeAttachment(name, root)).toBe(false);
  });
});
