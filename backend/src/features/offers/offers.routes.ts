import { Router, type Response } from 'express';
import { requireRole } from '../../middlewares/authorization.middleware';
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
  attachFile,
} from './offers.service';
import { getApplicationByStudentAndOffer } from '../applications/applications.service';
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

function isVisible(offer: Offer, auth: { role: string | null; entityId: number | null }): boolean {
  const { role, entityId } = auth;
  if (role === 'gestionnaire') return true;
  // Le lecteur n'a pas accès aux offres encore soumises (en attente de validation).
  if (role === 'lecteur') return offer.status !== 'soumise';
  if (role === 'etudiant') return offer.status === 'validee_et_visible' || offer.submitted_by_student_id === entityId;
  if (role === 'entreprise') return offer.company_id === entityId;
  // Inatteignable derriere requireRole() sur les deux routes GET (jalon 4) :
  // aucun visiteur anonyme ou role null n'atteint plus ce point.
  return false;
}

function canWrite(offer: Offer, auth: { role: string | null; entityId: number | null }): boolean {
  const { role, entityId } = auth;
  if (role === 'gestionnaire') return true;
  if (role === 'entreprise') return offer.company_id === entityId;
  if (role === 'etudiant') return offer.submitted_by_student_id === entityId;
  return false;
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
  if (!isVisible(offer, req.auth)) {
    // Keep this exception aligned with listOffers(): an etudiant who already
    // applied can reopen the offer detail unless it became non_disponible.
    const { role, entityId } = req.auth;
    if (role === 'etudiant' && entityId != null && offer.status !== 'non_disponible') {
      const app = getApplicationByStudentAndOffer(offer.id, entityId);
      if (!app) { res.status(403).json({ error: 'Accès refusé' }); return; }
    } else {
      res.status(403).json({ error: 'Accès refusé' }); return;
    }
  }
  res.json(offer);
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
  if (!canWrite(offer, req.auth)) { res.status(403).json({ error: 'Accès refusé' }); return; }
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

// POST /:id/attachment — gestionnaire/entreprise(own)/etudiant(own)
offersRouter.post(
  '/:id/attachment',
  requireRole('gestionnaire', 'entreprise', 'etudiant'),
  (req, res) => {
    const offer = getOfferById(Number(req.params.id));
    if (!offer) { res.status(404).json({ error: 'Offre non trouvée' }); return; }
    if (!canWrite(offer, req.auth)) { res.status(403).json({ error: 'Accès refusé' }); return; }

    upload.single('file')(req, res, (err) => {
      if (err) { res.status(400).json({ error: err.message }); return; }
      if (!req.file) { res.status(400).json({ error: 'Fichier manquant' }); return; }
      res.json(attachFile(Number(req.params.id), req.file.path));
    });
  },
);
