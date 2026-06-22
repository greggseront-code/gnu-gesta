import { Router } from 'express';
import { requireRole } from '../../middlewares/authorization.middleware';
import { SelectCandidateSchema } from './applications.schemas';
import {
  createApplication,
  getApplicationsByOffer,
  DuplicateApplicationError,
  ApplicationOfferMismatchError,
  OfferAlreadyTakenError,
  selectCandidate,
} from './applications.service';
import { getOfferById } from '../offers/offers.service';

// Mounted at /api/offers/:offerId/applications — mergeParams so :offerId is visible
export const applicationsRouter = Router({ mergeParams: true });

applicationsRouter.post('/', requireRole('etudiant'), (req, res) => {
  const offerId = Number(req.params.offerId);
  // The student id is intentionally taken from auth context, not from request
  // body, to prevent applying on behalf of another student.
  const studentId = req.auth.entityId;

  if (!studentId) {
    res.status(400).json({ error: 'entity-id manquant' });
    return;
  }

  // Applications are only valid while an offer is published to students; this is
  // stricter than read visibility for previous applicants.
  const offer = getOfferById(offerId);
  if (!offer) {
    res.status(404).json({ error: 'Offre non trouvée' });
    return;
  }
  if (offer.status !== 'validee_et_visible') {
    res.status(422).json({ error: 'Les candidatures ne sont acceptées que pour les offres validées et visibles' });
    return;
  }

  try {
    const application = createApplication(offerId, studentId);
    res.status(201).json(application);
  } catch (err) {
    if (err instanceof DuplicateApplicationError) {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
});

// GET / — gestionnaire, lecteur, entreprise (entreprise: only own offer)
applicationsRouter.get('/', requireRole('gestionnaire', 'lecteur', 'entreprise'), (req, res) => {
  const offerId = Number(req.params.offerId);

  if (req.auth.role === 'entreprise') {
    const offer = getOfferById(offerId);
    if (!offer) {
      res.status(404).json({ error: 'Offre non trouvée' });
      return;
    }
    if (offer.company_id !== req.auth.entityId) {
      res.status(403).json({ error: 'Accès refusé' });
      return;
    }
  }

  res.json(getApplicationsByOffer(offerId));
});

// Mounted at /api/offers/:offerId/select-candidate — mergeParams so :offerId is visible
export const selectCandidateRouter = Router({ mergeParams: true });

// POST / — entreprise only; verify offer belongs to them
selectCandidateRouter.post('/', requireRole('entreprise'), (req, res) => {
  const offerId = Number(req.params.offerId);

  const offer = getOfferById(offerId);
  if (!offer) {
    res.status(404).json({ error: 'Offre non trouvée' });
    return;
  }
  if (offer.company_id !== req.auth.entityId) {
    res.status(403).json({ error: 'Accès refusé' });
    return;
  }

  const result = SelectCandidateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const updatedOffer = selectCandidate(result.data.application_id, offerId);
    res.json(updatedOffer);
  } catch (err) {
    if (err instanceof ApplicationOfferMismatchError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof OfferAlreadyTakenError) {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
});
