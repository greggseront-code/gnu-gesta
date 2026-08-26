import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './home.page';
import { AuthProvider } from '../context/auth-context';
import * as offersApi from '../features/offers/offers.api';
import * as companiesApi from '../features/companies/companies.api';
import * as authApi from '../features/auth/auth.api';
import type { Offer } from '../features/offers/offers.types';

vi.mock('../features/offers/offers.api');
vi.mock('../features/companies/companies.api');
vi.mock('../features/auth/auth.api');

function offer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: 1,
    company_id: 1,
    priority_contact_id: 1,
    description: 'Stage test',
    location: null,
    technologies: null,
    objectives: null,
    remote_allowed: 0,
    remote_percentage: null,
    remarks: null,
    attachment_path: null,
    status: 'soumise',
    submitted_by_student_id: null,
    created_by_company_id: null,
    source_type: 'company',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    company_name: 'Acme',
    submitted_by_student_name: null,
    ...overrides,
  };
}

async function loginAsGestionnaire() {
  vi.mocked(authApi.getCurrentUser).mockResolvedValue({
    name: 'Gregory Seront',
    email: 'gregory.seront@vinci.be',
    baseRole: 'gestionnaire',
    role: 'gestionnaire',
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
        <HomePage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

test('le gestionnaire voit les trois compteurs de files en attente avec leurs liens', async () => {
  await loginAsGestionnaire();
  vi.mocked(offersApi.listPedagogicalOffers).mockResolvedValue([
    offer({ id: 1, status: 'soumise' }),
    offer({ id: 2, status: 'soumise' }),
    offer({ id: 3, status: 'validee_et_visible' }),
  ]);
  vi.mocked(companiesApi.listCompaniesWithDuplicateRisk).mockResolvedValue([]);
  vi.mocked(companiesApi.listCompanies).mockResolvedValue([]);
  vi.mocked(companiesApi.listPendingQueue).mockResolvedValue({
    companies: [
      {
        id: 1, name: 'Pending Co', general_email: 'a@a.com', address: null,
        validation_status: 'pending', submitted_by_student_id: 1, validated_at: null, created_at: '2026-01-01',
        submitted_by_student: null, probable_duplicates: [], blocking_offer_ids: [],
      },
    ],
    contacts: [
      {
        id: 1, company_id: 1, first_name: 'M', last_name: 'P', email: 'm@p.com', phone: null,
        roles: ['maitre_de_stage'], validation_status: 'pending', submitted_by_student_id: 1,
        created_with_company: 0, validated_at: null, created_at: '2026-01-01',
        submitted_by_student: null, company_name: 'Pending Co', blocking_offer_ids: [],
      },
      {
        id: 2, company_id: 1, first_name: 'M2', last_name: 'P2', email: 'm2@p.com', phone: null,
        roles: ['maitre_de_stage'], validation_status: 'pending', submitted_by_student_id: 1,
        created_with_company: 0, validated_at: null, created_at: '2026-01-01',
        submitted_by_student: null, company_name: 'Pending Co', blocking_offer_ids: [],
      },
    ],
  });

  renderPage();

  expect(await screen.findByText('Tableau de bord — Gestionnaire')).toBeInTheDocument();

  const offresLink = await screen.findByRole('link', { name: /Offres en attente/ });
  expect(offresLink).toHaveAttribute('href', '/admin/offers');
  expect(offresLink).toHaveTextContent('2');

  const companiesLink = screen.getByRole('link', { name: /Entreprises en attente/ });
  expect(companiesLink).toHaveAttribute('href', '/admin/companies#pending-companies');
  expect(companiesLink).toHaveTextContent('1');

  const contactsLink = screen.getByRole('link', { name: /Contacts en attente/ });
  expect(contactsLink).toHaveAttribute('href', '/admin/companies#pending-contacts');
  expect(contactsLink).toHaveTextContent('2');
});

test('un rôle non gestionnaire ne voit pas les compteurs de modération', async () => {
  vi.mocked(authApi.getCurrentUser).mockResolvedValue({
    name: 'Alice Étudiante',
    email: 'alice@student.vinci.be',
    baseRole: 'etudiant',
    role: 'etudiant',
    entityId: 1,
    status: 'ok',
    impersonation: null,
    csrfToken: 'csrf-token',
  });

  renderPage();

  expect(await screen.findByText('Tableau de bord')).toBeInTheDocument();
  expect(screen.queryByText(/Entreprises en attente/)).not.toBeInTheDocument();
});
