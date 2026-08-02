import { Router, type Response } from 'express';
import { z } from 'zod';
import { CompanyInputSchema, ContactInputSchema, ContactPatchSchema } from './companies.schemas';
import {
  createCompany,
  getCompanies,
  getCompanyWithContacts,
  addContactToCompany,
  patchCompany,
  getCompaniesWithDuplicateRisk,
  getPendingQueue,
  acceptCompany,
  acceptContact,
  editContact,
  rejectCompany,
  rejectContact,
} from './companies.service';
import { requireRole, requireEntityOwnership } from '../../middlewares/authorization.middleware';
import { HttpError } from '../../lib/http-errors';

export const companiesRouter = Router();

function handleServiceError(err: unknown, res: Response): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, ...(err.details ? (err.details as object) : {}) });
    return;
  }
  throw err;
}

// GET / — tout rôle authentifié (jalon 4 : ferme l'accès anonyme). Utilisé
// comme référentiel de recherche par gestionnaire/lecteur (admin-offers,
// admin-applications, accueil) et étudiant (proposition de stage) ; voir la
// review du jalon 4 pour le détail de cet écart par rapport à la décision
// initiale (gestionnaire+étudiant uniquement). Le filtrage de visibilité
// (élément en attente visible au gestionnaire et à son créateur uniquement)
// est appliqué côté requêtes (voir companies.queries.listCompanies).
companiesRouter.get('/', requireRole('gestionnaire', 'lecteur', 'etudiant', 'entreprise'), (req, res) => {
  if (req.query.duplicate_risk === 'true') {
    res.json(getCompaniesWithDuplicateRisk(req.auth));
    return;
  }
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  res.json(getCompanies(req.auth, search));
});

// GET /pending — file de modération gestionnaire (entreprises + contacts en
// attente). Route statique déclarée avant /:id pour ne pas être capturée par
// ce paramètre générique.
companiesRouter.get('/pending', requireRole('gestionnaire'), (_req, res) => {
  res.json(getPendingQueue());
});

// POST /contacts/:contactId/validate — accepte un contact ajouté ultérieurement (gestionnaire).
companiesRouter.post('/contacts/:contactId/validate', requireRole('gestionnaire'), (req, res) => {
  try {
    const contact = acceptContact(Number(req.params.contactId));
    if (!contact) {
      res.status(404).json({ error: 'Contact non trouvé' });
      return;
    }
    res.json(contact);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// PATCH /contacts/:contactId — modifie un contact (gestionnaire), en attente ou déjà validé.
companiesRouter.patch('/contacts/:contactId', requireRole('gestionnaire'), (req, res) => {
  const result = ContactPatchSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }
  try {
    const contact = editContact(Number(req.params.contactId), result.data);
    if (!contact) {
      res.status(404).json({ error: 'Contact non trouvé' });
      return;
    }
    res.json(contact);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// DELETE /contacts/:contactId — refuse (supprime) une soumission de contact en attente (gestionnaire).
companiesRouter.delete('/contacts/:contactId', requireRole('gestionnaire'), (req, res) => {
  try {
    const result = rejectContact(Number(req.params.contactId));
    if (!result) {
      res.status(404).json({ error: 'Contact non trouvé' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    handleServiceError(err, res);
  }
});

// GET /:id — all authenticated roles; entreprise restricted to own company;
// une entreprise ou un contact en attente masque a l'appelant se comporte
// comme absent (404), pas comme un refus d'acces (403), pour ne pas reveler
// son existence a un role non autorise.
companiesRouter.get(
  '/:id',
  requireRole('gestionnaire', 'lecteur', 'etudiant', 'entreprise'),
  requireEntityOwnership('id'),
  (req, res) => {
    const company = getCompanyWithContacts(Number(req.params.id), req.auth);
    if (!company) {
      res.status(404).json({ error: 'Entreprise non trouvée' });
      return;
    }
    res.json(company);
  },
);

// POST / — gestionnaire, etudiant (pas entreprise : voir spec, une
// entreprise ne peut pas creer sa propre fiche).
companiesRouter.post(
  '/',
  requireRole('gestionnaire', 'etudiant'),
  (req, res) => {
    const result = CompanyInputSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    try {
      res.status(201).json(createCompany(result.data, req.auth));
    } catch (err) {
      handleServiceError(err, res);
    }
  },
);

// POST /:id/validate — accepte l'entreprise et ses contacts de soumission initiale (gestionnaire).
companiesRouter.post('/:id/validate', requireRole('gestionnaire'), (req, res) => {
  try {
    const company = acceptCompany(Number(req.params.id));
    if (!company) {
      res.status(404).json({ error: 'Entreprise non trouvée' });
      return;
    }
    res.json(company);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// DELETE /:id — refuse (supprime) une soumission d'entreprise en attente (gestionnaire).
companiesRouter.delete('/:id', requireRole('gestionnaire'), (req, res) => {
  try {
    const result = rejectCompany(Number(req.params.id));
    if (!result) {
      res.status(404).json({ error: 'Entreprise non trouvée' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    handleServiceError(err, res);
  }
});

// PATCH /:id — gestionnaire (all), entreprise (own company only)
companiesRouter.patch(
  '/:id',
  requireRole('gestionnaire', 'entreprise'),
  requireEntityOwnership('id'),
  (req, res) => {
    const schema = z.object({
      name: z.string().min(1).optional(),
      general_email: z.string().email().optional(),
      address: z.string().optional(),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    try {
      res.json(patchCompany(Number(req.params.id), result.data));
    } catch (err) {
      handleServiceError(err, res);
    }
  },
);

// POST /:id/contacts — gestionnaire (all), entreprise (own company only),
// etudiant (entreprise cible visible : validee ou sa propre soumission en
// attente ; voir addContactToCompany).
companiesRouter.post(
  '/:id/contacts',
  requireRole('gestionnaire', 'entreprise', 'etudiant'),
  requireEntityOwnership('id'),
  (req, res) => {
    const result = ContactInputSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    try {
      const contact = addContactToCompany(Number(req.params.id), result.data, req.auth);
      if (!contact) {
        res.status(404).json({ error: 'Entreprise non trouvée' });
        return;
      }
      res.status(201).json(contact);
    } catch (err) {
      handleServiceError(err, res);
    }
  },
);
