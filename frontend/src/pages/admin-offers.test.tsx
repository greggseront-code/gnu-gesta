import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AdminOffersPage } from './admin-offers.page';
import { AuthProvider } from '../context/auth-context';
import * as offersApi from '../features/offers/offers.api';
import * as companiesApi from '../features/companies/companies.api';
import * as authApi from '../features/auth/auth.api';
import type { Offer, OfferDependencyStatus } from '../features/offers/offers.types';
import type { Company, CompanyWithContacts } from '../features/companies/companies.types';

vi.mock('../features/offers/offers.api');
vi.mock('../features/companies/companies.api');
vi.mock('../features/auth/auth.api');

function offer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: 1,
    company_id: 1,
    priority_contact_id: 1,
    description: 'Stage chez Acme',
    location: null,
    technologies: null,
    objectives: null,
    remote_allowed: 0,
    remote_percentage: null,
    remarks: null,
    status: 'soumise',
    submitted_by_student_id: 1,
    created_by_company_id: null,
    source_type: 'student',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: 2,
    name: 'Beta Validated',
    general_email: 'beta@beta.com',
    address: null,
    validation_status: 'validated',
    submitted_by_student_id: null,
    validated_at: '2026-01-01',
    created_at: '2026-01-01',
    ...overrides,
  };
}

async function loginAs(role: 'gestionnaire' | 'lecteur') {
  vi.mocked(authApi.getCurrentUser).mockResolvedValue({
    name: 'Test User',
    email: 'test@vinci.be',
    baseRole: role,
    role,
    entityId: null,
    status: 'ok',
    impersonation: null,
    csrfToken: 'csrf-token',
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AdminOffersPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(companiesApi.listCompanies).mockResolvedValue([]);
});

test('un rôle non gestionnaire (lecteur) est redirigé hors de la page', async () => {
  await loginAs('lecteur');
  vi.mocked(offersApi.listPedagogicalOffers).mockResolvedValue([]);

  renderPage();

  await waitFor(() => {
    expect(screen.queryByText('Administration des offres')).not.toBeInTheDocument();
  });
  expect(offersApi.listPedagogicalOffers).not.toHaveBeenCalled();
});

test('affiche la dépendance en attente et désactive la validation', async () => {
  await loginAs('gestionnaire');
  vi.mocked(offersApi.listPedagogicalOffers).mockResolvedValue([offer()]);
  const deps: OfferDependencyStatus = { company_pending: true, pending_contact_ids: [] };
  vi.mocked(offersApi.getOfferDependencies).mockResolvedValue(deps);

  renderPage();

  expect(await screen.findByText(/doivent être validés avant de pouvoir publier cette offre/)).toBeInTheDocument();
  const validateButton = screen.getByRole('button', { name: 'Accepter et ouvrir le dossier' });
  expect(validateButton).toBeDisabled();
});

test('valide une offre sans dépendance en attente', async () => {
  await loginAs('gestionnaire');
  vi.mocked(offersApi.listPedagogicalOffers).mockResolvedValue([offer()]);
  vi.mocked(offersApi.getOfferDependencies).mockResolvedValue({ company_pending: false, pending_contact_ids: [] });
  vi.mocked(offersApi.validateOffer).mockResolvedValue(offer({ status: 'validee_et_visible' }));

  renderPage();

  const validateButton = await screen.findByRole('button', { name: 'Accepter et ouvrir le dossier' });
  expect(validateButton).not.toBeDisabled();

  await userEvent.click(validateButton);

  await waitFor(() => expect(offersApi.validateOffer).toHaveBeenCalledWith(1));
});

test("réaffecte l'entreprise et les contacts d'une offre", async () => {
  await loginAs('gestionnaire');
  vi.mocked(offersApi.listPedagogicalOffers).mockResolvedValue([offer()]);
  vi.mocked(offersApi.getOfferDependencies).mockResolvedValue({ company_pending: false, pending_contact_ids: [] });
  vi.mocked(companiesApi.listCompanies).mockResolvedValue([company()]);
  const fullCompany: CompanyWithContacts = {
    ...company(),
    contacts: [
      {
        id: 20, company_id: 2, first_name: 'Nadia', last_name: 'Ouali', email: 'nadia@beta.com', phone: null,
        roles: ['maitre_de_stage'], validation_status: 'validated', submitted_by_student_id: null,
        created_with_company: 0, validated_at: '2026-01-01', created_at: '2026-01-01',
      },
    ],
  };
  vi.mocked(companiesApi.getCompany).mockResolvedValue(fullCompany);
  vi.mocked(offersApi.reassignOffer).mockResolvedValue(offer({ company_id: 2, priority_contact_id: 20 }));

  renderPage();

  await userEvent.click(await screen.findByRole('button', { name: "Réaffecter l'entreprise et les contacts" }));
  await userEvent.click(screen.getByRole('button', { name: 'Rechercher' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Choisir' }));
  await screen.findByText('Nadia Ouali');

  await userEvent.click(screen.getByRole('checkbox'));
  await userEvent.click(screen.getByRole('button', { name: 'Confirmer la réaffectation' }));

  await waitFor(() =>
    expect(offersApi.reassignOffer).toHaveBeenCalledWith(1, {
      company_id: 2,
      priority_contact_id: 20,
      contact_ids: [20],
    }),
  );
});
