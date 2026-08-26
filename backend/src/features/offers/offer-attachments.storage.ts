import { randomUUID } from 'crypto';
import { createReadStream, existsSync, mkdirSync, statSync, unlinkSync } from 'fs';
import path from 'path';
import multer from 'multer';
import type { ReadStream } from 'fs';
import { BadRequestError } from '../../lib/http-errors';
import type { OfferAttachmentMimeType } from './offers.types';

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
export const DEFAULT_UPLOADS_ROOT = path.resolve(__dirname, '../../../uploads');

export const ATTACHMENT_MIME_BY_EXTENSION: Record<string, OfferAttachmentMimeType> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export class AttachmentStorageError extends Error {
  readonly code: 'invalid_name' | 'missing' | 'filesystem';

  constructor(code: 'invalid_name' | 'missing' | 'filesystem', message: string) {
    super(message);
    this.name = 'AttachmentStorageError';
    this.code = code;
  }
}

export function ensureUploadsRoot(root = DEFAULT_UPLOADS_ROOT): string {
  mkdirSync(root, { recursive: true });
  return root;
}

export function extensionForAttachment(originalName: string, mimeType: string): string {
  const extension = path.extname(originalName).toLowerCase();
  if (!extension || ATTACHMENT_MIME_BY_EXTENSION[extension] !== mimeType) {
    throw new BadRequestError('Type de fichier non autorisé. PDF ou DOCX uniquement.');
  }
  return extension;
}

export function validateStoredAttachmentMetadata(storageName: string, mimeType: string): OfferAttachmentMimeType {
  const extension = path.extname(storageName).toLowerCase();
  const expected = ATTACHMENT_MIME_BY_EXTENSION[extension];
  if (!expected || expected !== mimeType || path.basename(storageName) !== storageName || /[\\/]/.test(storageName)) {
    throw new BadRequestError('Métadonnées de fichier non autorisées.');
  }
  return expected;
}

/** Multer writes only server-generated names; the original name never reaches the database. */
export function generateStorageName(originalName: string, mimeType: string): string {
  const extension = extensionForAttachment(originalName, mimeType);
  return `${randomUUID()}${extension}`;
}

export function createAttachmentStorage(root = DEFAULT_UPLOADS_ROOT): multer.StorageEngine {
  const uploadRoot = ensureUploadsRoot(root);
  return multer.diskStorage({
    destination: uploadRoot,
    filename: (_req, file, callback) => {
      try {
        callback(null, generateStorageName(file.originalname, file.mimetype));
      } catch (err) {
        callback(err instanceof Error ? err : new Error('Type de fichier non autorisé.'), '');
      }
    },
  });
}

export function resolveStoredAttachment(storageName: string, root = DEFAULT_UPLOADS_ROOT): string {
  if (!storageName || path.basename(storageName) !== storageName || /[\\/]/.test(storageName) || storageName.includes('\0')) {
    throw new AttachmentStorageError('invalid_name', 'Nom de pièce jointe invalide.');
  }
  const uploadRoot = path.resolve(root);
  const resolved = path.resolve(uploadRoot, storageName);
  if (resolved !== uploadRoot && !resolved.startsWith(`${uploadRoot}${path.sep}`)) {
    throw new AttachmentStorageError('invalid_name', 'Nom de pièce jointe invalide.');
  }
  return resolved;
}

export function attachmentExists(storageName: string, root = DEFAULT_UPLOADS_ROOT): boolean {
  return existsSync(resolveStoredAttachment(storageName, root));
}

export function attachmentSize(storageName: string, root = DEFAULT_UPLOADS_ROOT): number {
  const filePath = resolveStoredAttachment(storageName, root);
  try {
    return statSync(filePath).size;
  } catch (err) {
    if (isEnoent(err)) throw new AttachmentStorageError('missing', 'Pièce jointe absente du stockage.');
    throw new AttachmentStorageError('filesystem', 'Le stockage de la pièce jointe est indisponible.');
  }
}

export function openAttachment(storageName: string, root = DEFAULT_UPLOADS_ROOT): ReadStream {
  const filePath = resolveStoredAttachment(storageName, root);
  if (!attachmentExists(storageName, root)) {
    throw new AttachmentStorageError('missing', 'Pièce jointe absente du stockage.');
  }
  return createReadStream(filePath);
}

/** Returns false for an already absent file so the DB row can still be cleaned. */
export function removeAttachment(storageName: string, root = DEFAULT_UPLOADS_ROOT): boolean {
  const filePath = resolveStoredAttachment(storageName, root);
  try {
    unlinkSync(filePath);
    return true;
  } catch (err) {
    if (isEnoent(err)) {
      console.warn('[offers] pièce jointe absente du stockage lors du nettoyage');
      return false;
    }
    throw new AttachmentStorageError('filesystem', 'Le stockage de la pièce jointe est indisponible.');
  }
}

function isEnoent(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'ENOENT';
}
