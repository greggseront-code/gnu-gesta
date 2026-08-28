import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';
import multer from 'multer';
import { BadRequestError, NotFoundError } from '../../lib/http-errors';

export const MAX_INTERNSHIP_DOCUMENT_SIZE = 5 * 1024 * 1024;
export const DEFAULT_INTERNSHIP_DOCUMENTS_ROOT = path.resolve(__dirname, '../../../internship-documents');

const MIME_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function ensureRoot(root = DEFAULT_INTERNSHIP_DOCUMENTS_ROOT): string {
  mkdirSync(root, { recursive: true });
  return root;
}

export function validateInternshipDocument(originalName: string, mimeType: string): string {
  const extension = path.extname(originalName).toLowerCase();
  if (!extension || MIME_BY_EXTENSION[extension] !== mimeType) {
    throw new BadRequestError('Type de fichier non autorisé. PDF ou DOCX uniquement.');
  }
  return extension;
}

export function createInternshipDocumentUpload(root = DEFAULT_INTERNSHIP_DOCUMENTS_ROOT) {
  const destination = ensureRoot(root);
  return multer({
    storage: multer.diskStorage({
      destination,
      filename: (_req, file, callback) => {
        try {
          callback(null, `${randomUUID()}${validateInternshipDocument(file.originalname, file.mimetype)}`);
        } catch (error) {
          callback(error instanceof Error ? error : new Error('Fichier refusé.'), '');
        }
      },
    }),
    limits: { fileSize: MAX_INTERNSHIP_DOCUMENT_SIZE },
    fileFilter: (_req, file, callback) => {
      try {
        validateInternshipDocument(file.originalname, file.mimetype);
        callback(null, true);
      } catch (error) {
        callback(error instanceof Error ? error : new Error('Fichier refusé.'));
      }
    },
  });
}

export const internshipDocumentUpload = createInternshipDocumentUpload();

export function storeGeneratedConvention(bytes: Buffer, root = DEFAULT_INTERNSHIP_DOCUMENTS_ROOT): {
  storageName: string;
  size: number;
} {
  if (bytes.length > MAX_INTERNSHIP_DOCUMENT_SIZE) {
    throw new BadRequestError('La convention générée dépasse la limite de 5 Mio.');
  }
  ensureRoot(root);
  const storageName = `${randomUUID()}.docx`;
  writeFileSync(path.join(root, storageName), bytes);
  return { storageName, size: bytes.length };
}

export function resolveInternshipDocument(storageName: string, root = DEFAULT_INTERNSHIP_DOCUMENTS_ROOT): string {
  if (!storageName || path.basename(storageName) !== storageName || /[\\/]/.test(storageName)) {
    throw new BadRequestError('Nom de document invalide.');
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, storageName);
  if (!resolved.startsWith(`${resolvedRoot}${path.sep}`)) throw new BadRequestError('Nom de document invalide.');
  if (!existsSync(resolved)) throw new NotFoundError('Document non disponible.');
  return resolved;
}

export function internshipDocumentSize(storageName: string, root = DEFAULT_INTERNSHIP_DOCUMENTS_ROOT): number {
  return statSync(resolveInternshipDocument(storageName, root)).size;
}

export function removeInternshipDocument(storageName: string, root = DEFAULT_INTERNSHIP_DOCUMENTS_ROOT): boolean {
  const target = path.resolve(root, storageName);
  if (!target.startsWith(`${path.resolve(root)}${path.sep}`)) throw new BadRequestError('Nom de document invalide.');
  try {
    unlinkSync(target);
    return true;
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  }
}
