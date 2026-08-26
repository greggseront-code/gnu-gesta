import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AdminOffersPage } from './admin-offers.page';
import { AuthProvider } from '../context/auth-context';
import * as offersApi from '../features/offers/offers.api';
import * as authApi from '../features/auth/auth.api';
import type { Offer, OfferDependencyStatus } from '../features/offers/offers.types';

vi.mock('../features/offers/offers.api');
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
    attachment_path: null,
    status: 'soumise',
    submitted_by_student_id: 1,
    created_by_company_id: null,
    source_type: 'student',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    company_name: 'Acme',
    submitted_by_student_name: 'Alice Martin',
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

test('un rôle non gestionnaire (lecteur) est redirigé hors de la page', async () => {
  await loginAs('lecteur');
  vi.mocked(offersApi.listPedagogicalOffers).mockResolvedValue([]);

  renderPage();

  await waitFor(() => {
    expect(screen.queryByText('Administration des offres')).not.toBeInTheDocument();
  });
  expect(offersApi.listPedagogicalOffers).not.toHaveBeenCalled();
});

test("affiche le nom de l'entreprise (lien) et le nom de l'étudiant créateur", async () => {
  await loginAs('gestionnaire');
  vi.mocked(offersApi.listPedagogicalOffers).mockResolvedValue([offer()]);
  vi.mocked(offersApi.getOfferDependencies).mockResolvedValue({ company_pending: false, pending_contact_ids: [] });

  renderPage();

  const companyLink = await screen.findByRole('link', { name: 'Acme' });
  expect(companyLink).toHaveAttribute('href', '/admin/companies/1');
  expect(screen.getByText('Étudiant : Alice Martin')).toBeInTheDocument();
});

test('affiche la dépendance en attente et désactive la validation', async () => {
  await loginAs('gestionnaire');
  vi.mocked(offersApi.listPedagogicalOffers).mockResolvedValue([offer()]);
  const deps: OfferDependencyStatus = { company_pending: true, pending_contact_ids: [] };
  vi.mocked(offersApi.getOfferDependencies).mockResolvedValue(deps);

  renderPage();

  expect(await screen.findByText(/doivent être validés avant de pouvoir publier cette offre/)).toBeInTheDocument();
  const validateButton = screen.getByRole('button', { name: 'Valider' });
  expect(validateButton).toBeDisabled();
});

test('valide une offre sans dépendance en attente', async () => {
  await loginAs('gestionnaire');
  vi.mocked(offersApi.listPedagogicalOffers).mockResolvedValue([offer()]);
  vi.mocked(offersApi.getOfferDependencies).mockResolvedValue({ company_pending: false, pending_contact_ids: [] });
  vi.mocked(offersApi.validateOffer).mockResolvedValue(offer({ status: 'validee_et_visible' }));

  renderPage();

  const validateButton = await screen.findByRole('button', { name: 'Valider' });
  expect(validateButton).not.toBeDisabled();

  await userEvent.click(validateButton);

  await waitFor(() => expect(offersApi.validateOffer).toHaveBeenCalledWith(1));
});

test("ne propose plus de réaffectation depuis la liste", async () => {
  await loginAs('gestionnaire');
  vi.mocked(offersApi.listPedagogicalOffers).mockResolvedValue([offer()]);
  vi.mocked(offersApi.getOfferDependencies).mockResolvedValue({ company_pending: false, pending_contact_ids: [] });

  renderPage();

  await screen.findByText('Stage chez Acme');
  expect(screen.queryByRole('button', { name: /Réaffecter/ })).not.toBeInTheDocument();
});
