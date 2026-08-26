import multer from 'multer';
import { createAttachmentStorage, extensionForAttachment, DEFAULT_UPLOADS_ROOT, MAX_ATTACHMENT_SIZE_BYTES } from '../features/offers/offer-attachments.storage';

export function createUploadMiddleware(root = DEFAULT_UPLOADS_ROOT) {
  return multer({
    storage: createAttachmentStorage(root),
    limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
      try {
        extensionForAttachment(file.originalname, file.mimetype);
        cb(null, true);
      } catch (err) {
        cb(err instanceof Error ? err : new Error('Type de fichier non autorisé. PDF ou DOCX uniquement.'));
      }
    },
  });
}

export const upload = createUploadMiddleware();
