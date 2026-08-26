import { Router, type Response } from 'express';
import { requireRole } from '../../middlewares/authorization.middleware';
import multer from 'multer';
import { upload } from '../../middlewares/upload.middleware';
import { OfferInputSchema, PatchOfferSchema, OfferAssignmentSchema } from './offers.schemas';
import {
  createOffer,
  getOffers,
  getOfferById,
  getOfferDependencyStatus,
  validateOffer,
  rejectOffer,
  closeOffer,
  editOffer,
  reassignOffer,
  canReadOffer,
  canWriteOffer,
  getOfferAttachments,
  addOfferAttachment,
  getOfferAttachmentDownload,
  deleteOfferAttachmentById,
} from './offers.service';
import { HttpError } from '../../lib/http-errors';
import type { Offer } from './offers.types';

export const offersRouter = Router();

function handleServiceError(err: unknown, res: Response): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, ...(err.details ? (err.details as object) : {}) });
    return;
  }
  throw err;
}

// GET / — scoped by role, optional ?search=
offersRouter.get('/', requireRole('gestionnaire', 'lecteur', 'etudiant', 'entreprise'), (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  res.json(getOffers(req.auth, search));
});

// POST / — gestionnaire, etudiant, entreprise
offersRouter.post('/', requireRole('gestionnaire', 'etudiant', 'entreprise'), (req, res) => {
  const result = OfferInputSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }
  try {
    res.status(201).json(createOffer(result.data, req.auth));
  } catch (err) {
    handleServiceError(err, res);
  }
});

// GET /:id — scoped visibility
offersRouter.get('/:id', requireRole('gestionnaire', 'lecteur', 'etudiant', 'entreprise'), (req, res) => {
  const offer = getOfferById(Number(req.params.id));
  if (!offer) { res.status(404).json({ error: 'Offre non trouvée' }); return; }
  if (!canReadOffer(offer, req.auth)) { res.status(403).json({ error: 'Accès refusé' }); return; }
  res.json(offer);
});

offersRouter.get('/:id/attachments', requireRole('gestionnaire', 'lecteur', 'etudiant', 'entreprise'), (req, res) => {
  const offer = getOfferById(Number(req.params.id));
  if (!offer) { res.status(404).json({ error: 'Offre non trouvée' }); return; }
  if (!canReadOffer(offer, req.auth)) { res.status(403).json({ error: 'Accès refusé' }); return; }
  res.json(getOfferAttachments(offer.id));
});

// GET /:id/dependencies — gestionnaire only : entreprise/contacts encore en attente pour cette offre.
offersRouter.get('/:id/dependencies', requireRole('gestionnaire'), (req, res) => {
  const status = getOfferDependencyStatus(Number(req.params.id));
  if (!status) { res.status(404).json({ error: 'Offre non trouvée' }); return; }
  res.json(status);
});

// POST /:id/validate — gestionnaire only
offersRouter.post('/:id/validate', requireRole('gestionnaire'), (req, res) => {
  try {
    res.json(validateOffer(Number(req.params.id)));
  } catch (err) {
    handleServiceError(err, res);
  }
});

// POST /:id/reject — gestionnaire only
offersRouter.post('/:id/reject', requireRole('gestionnaire'), (req, res) => {
  const offer = getOfferById(Number(req.params.id));
  if (!offer) { res.status(404).json({ error: 'Offre non trouvée' }); return; }
  res.json(rejectOffer(Number(req.params.id)));
});

// POST /:id/mark-unavailable — gestionnaire only
offersRouter.post('/:id/mark-unavailable', requireRole('gestionnaire'), (req, res) => {
  const offer = getOfferById(Number(req.params.id));
  if (!offer) { res.status(404).json({ error: 'Offre non trouvée' }); return; }
  res.json(closeOffer(Number(req.params.id)));
});

// PATCH /:id — gestionnaire/entreprise(own)/etudiant(own)
offersRouter.patch('/:id', requireRole('gestionnaire', 'entreprise', 'etudiant'), (req, res) => {
  const offer = getOfferById(Number(req.params.id));
  if (!offer) { res.status(404).json({ error: 'Offre non trouvée' }); return; }
  if (!canWriteOffer(offer, req.auth)) { res.status(403).json({ error: 'Accès refusé' }); return; }
  const result = PatchOfferSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }
  res.json(editOffer(Number(req.params.id), result.data));
});

// PATCH /:id/assignment — gestionnaire only. Remplace atomiquement
// l'entreprise, le contact prioritaire et les contacts associés ; n'accepte
// qu'une entreprise et des contacts déjà validés.
offersRouter.patch('/:id/assignment', requireRole('gestionnaire'), (req, res) => {
  const result = OfferAssignmentSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }
  try {
    res.json(reassignOffer(Number(req.params.id), result.data));
  } catch (err) {
    handleServiceError(err, res);
  }
});

// POST /:id/attachments — un fichier par appel, répété séquentiellement par le frontend.
offersRouter.post(
  '/:id/attachments',
  requireRole('gestionnaire', 'entreprise', 'etudiant'),
  (req, res) => {
    const offer = getOfferById(Number(req.params.id));
    if (!offer) { res.status(404).json({ error: 'Offre non trouvée' }); return; }
    if (!canWriteOffer(offer, req.auth)) { res.status(403).json({ error: 'Accès refusé' }); return; }

    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'Le fichier dépasse la limite de 5 Mo.' }); return;
      }
      if (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'Fichier refusé.' }); return; }
      if (!req.file) { res.status(400).json({ error: 'Fichier manquant' }); return; }
      try {
        res.status(201).json(addOfferAttachment(Number(req.params.id), req.file));
      } catch (serviceError) {
        handleServiceError(serviceError, res);
      }
    });
  },
);

offersRouter.get('/:id/attachments/:attachmentId', requireRole('gestionnaire', 'lecteur', 'etudiant', 'entreprise'), (req, res) => {
  const offer = getOfferById(Number(req.params.id));
  if (!offer) { res.status(404).json({ error: 'Offre non trouvée' }); return; }
  if (!canReadOffer(offer, req.auth)) { res.status(403).json({ error: 'Accès refusé' }); return; }
  try {
    const { attachment, path: filePath } = getOfferAttachmentDownload(offer.id, Number(req.params.attachmentId));
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.download(filePath, attachment.storage_name, (err) => {
      if (err && !res.headersSent) res.status(404).json({ error: 'Pièce jointe non disponible' });
    });
  } catch (err) {
    handleServiceError(err, res);
  }
});

offersRouter.delete('/:id/attachments/:attachmentId', requireRole('gestionnaire', 'entreprise', 'etudiant'), (req, res) => {
  const offer = getOfferById(Number(req.params.id));
  if (!offer) { res.status(404).json({ error: 'Offre non trouvée' }); return; }
  if (!canWriteOffer(offer, req.auth)) { res.status(403).json({ error: 'Accès refusé' }); return; }
  try {
    deleteOfferAttachmentById(offer.id, Number(req.params.attachmentId));
    res.status(204).send();
  } catch (err) {
    handleServiceError(err, res);
  }
});
