import { Router } from 'express';
import { z } from 'zod';
import { CompanyInputSchema, ContactInputSchema } from './companies.schemas';
import {
  createCompany,
  getCompanies,
  getCompanyWithContacts,
  addContactToCompany,
  patchCompany,
  getCompaniesWithDuplicateRisk,
} from './companies.service';
import { requireRole, requireEntityOwnership } from '../../middlewares/authorization.middleware';

export const companiesRouter = Router();

// GET / — tout rôle authentifié (jalon 4 : ferme l'accès anonyme). Utilisé
// comme référentiel de recherche par gestionnaire/lecteur (admin-offers,
// admin-applications, accueil) et étudiant (proposition de stage) ; voir la
// review du jalon 4 pour le détail de cet écart par rapport à la décision
// initiale (gestionnaire+étudiant uniquement).
companiesRouter.get('/', requireRole('gestionnaire', 'lecteur', 'etudiant', 'entreprise'), (req, res) => {
  if (req.query.duplicate_risk === 'true') {
    res.json(getCompaniesWithDuplicateRisk());
    return;
  }
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  res.json(getCompanies(search));
});

// GET /:id — all authenticated roles; entreprise restricted to own company
companiesRouter.get(
  '/:id',
  requireRole('gestionnaire', 'lecteur', 'etudiant', 'entreprise'),
  requireEntityOwnership('id'),
  (req, res) => {
    const company = getCompanyWithContacts(Number(req.params.id));
    if (!company) {
      res.status(404).json({ error: 'Entreprise non trouvée' });
      return;
    }
    res.json(company);
  },
);

// POST / — gestionnaire, etudiant, entreprise (not lecteur)
companiesRouter.post(
  '/',
  requireRole('gestionnaire', 'etudiant', 'entreprise'),
  (req, res) => {
    const result = CompanyInputSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    res.status(201).json(createCompany(result.data));
  },
);

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
    res.json(patchCompany(Number(req.params.id), result.data));
  },
);

// POST /:id/contacts — gestionnaire (all), entreprise (own company only)
companiesRouter.post(
  '/:id/contacts',
  requireRole('gestionnaire', 'entreprise'),
  requireEntityOwnership('id'),
  (req, res) => {
    const result = ContactInputSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    res.status(201).json(addContactToCompany(Number(req.params.id), result.data));
  },
);
