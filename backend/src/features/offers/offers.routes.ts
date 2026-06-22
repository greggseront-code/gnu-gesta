import { Router } from 'express';
import { requireRole } from '../../middlewares/authorization.middleware';
import { upload } from '../../middlewares/upload.middleware';
import { OfferInputSchema, PatchOfferSchema, PatchOfferCompanySchema } from './offers.schemas';
import {
  createOffer,
  getOffers,
  getOfferById,
  validateOffer,
  rejectOffer,
  closeOffer,
  editOffer,
  changeOfferCompany,
  attachFile,
} from './offers.service';
import { getApplicationByStudentAndOffer } from '../applications/applications.service';
import type { Offer } from './offers.types';

export const offersRouter = Router();

function isVisible(offer: Offer, auth: { role: string | null; entityId: number | null }): boolean {
  const { role, entityId } = auth;
  if (role === 'gestionnaire' || role === 'lecteur') return true;
  if (role === 'etudiant') return offer.status === 'validee_et_visible' || offer.submitted_by_student_id === entityId;
  if (role === 'entreprise') return offer.company_id === entityId;
  return offer.status === 'validee_et_visible';
}

function canWrite(offer: Offer, auth: { role: string | null; entityId: number | null }): boolean {
  const { role, entityId } = auth;
  if (role === 'gestionnaire') return true;
  if (role === 'entreprise') return offer.company_id === entityId;
  if (role === 'etudiant') return offer.submitted_by_student_id === entityId;
  return false;
}

// GET / — scoped by role, optional ?search=
offersRouter.get('/', (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  res.json(getOffers(req.auth, search));
});

// POST / — gestionnaire, etudiant, entreprise
offersRouter.post('/', requireRole('gestionnaire', 'etudiant', 'entreprise'), (req, res) => {
  const result = OfferInputSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }
  res.status(201).json(createOffer(result.data, req.auth));
});

// GET /:id — scoped visibility
offersRouter.get('/:id', (req, res) => {
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

// POST /:id/validate — gestionnaire only
offersRouter.post('/:id/validate', requireRole('gestionnaire'), (req, res) => {
  const offer = getOfferById(Number(req.params.id));
  if (!offer) { res.status(404).json({ error: 'Offre non trouvée' }); return; }
  res.json(validateOffer(Number(req.params.id)));
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

// PATCH /:id/company — gestionnaire only
offersRouter.patch('/:id/company', requireRole('gestionnaire'), (req, res) => {
  const offer = getOfferById(Number(req.params.id));
  if (!offer) { res.status(404).json({ error: 'Offre non trouvée' }); return; }
  const result = PatchOfferCompanySchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }
  res.json(changeOfferCompany(Number(req.params.id), result.data.company_id));
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
