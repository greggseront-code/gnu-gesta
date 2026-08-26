import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SubmitOfferPage } from './submit-offer.page';
import { AuthProvider } from '../context/auth-context';
import * as offersApi from '../features/offers/offers.api';
import * as companiesApi from '../features/companies/companies.api';
import * as authApi from '../features/auth/auth.api';
import type { Offer } from '../features/offers/offers.types';
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

function companyWithContacts(overrides: Partial<CompanyWithContacts> = {}): CompanyWithContacts {
  return {
    ...company(),
    contacts: [],
    ...overrides,
  };
}

async function loginAs(role: 'gestionnaire' | 'entreprise', entityId: number | null = null) {
  vi.mocked(authApi.getCurrentUser).mockResolvedValue({
    name: 'Test User',
    email: 'test@vinci.be',
    baseRole: role,
    role,
    entityId,
    status: 'ok',
    impersonation: null,
    csrfToken: 'csrf-token',
  });
}

function renderEditPage(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/offers/${id}/edit`]}>
      <AuthProvider>
        <Routes>
          <Route path="/offers/:id/edit" element={<SubmitOfferPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(offersApi.getOffer).mockResolvedValue(offer());
  vi.mocked(companiesApi.getCompany).mockResolvedValue(companyWithContacts({ id: 1 }));
});

test("le gestionnaire voit la section de réaffectation entreprise/contacts en édition", async () => {
  await loginAs('gestionnaire');
  renderEditPage();

  const title = await screen.findByText('Entreprise et contacts');
  const section = title.closest('.card') as HTMLElement;
  expect(within(section).getByText('Acme')).toBeInTheDocument();
});

test("une entreprise ne voit pas la section de réaffectation", async () => {
  await loginAs('entreprise', 1);
  renderEditPage();

  await screen.findByText("Modifier l'offre");
  expect(screen.queryByText('Entreprise et contacts')).not.toBeInTheDocument();
});

test('le gestionnaire peut réaffecter entreprise et contacts depuis cette page', async () => {
  await loginAs('gestionnaire');
  vi.mocked(companiesApi.listCompanies).mockResolvedValue([company()]);
  const fullCompany = companyWithContacts({
    contacts: [
      {
        id: 20, company_id: 2, first_name: 'Nadia', last_name: 'Ouali', email: 'nadia@beta.com', phone: null,
        roles: ['maitre_de_stage'], validation_status: 'validated', submitted_by_student_id: null,
        created_with_company: 0, validated_at: '2026-01-01', created_at: '2026-01-01',
      },
    ],
  });
  vi.mocked(companiesApi.getCompany).mockImplementation((id: number) =>
    Promise.resolve(id === 2 ? fullCompany : companyWithContacts({ id: 1 })),
  );
  vi.mocked(offersApi.reassignOffer).mockResolvedValue(
    offer({ company_id: 2, priority_contact_id: 20, company_name: 'Beta Validated' }),
  );

  renderEditPage();

  const title = await screen.findByText('Entreprise et contacts');
  const section = title.closest('.card') as HTMLElement;
  await userEvent.click(within(section).getByPlaceholderText('Rechercher une entreprise validée…'));
  await userEvent.click(within(section).getByRole('button', { name: 'Rechercher' }));
  await userEvent.click(await within(section).findByRole('button', { name: 'Choisir' }));
  await within(section).findByText('Nadia Ouali');

  await userEvent.click(within(section).getByRole('checkbox'));
  await userEvent.click(within(section).getByRole('button', { name: 'Confirmer la réaffectation' }));

  await waitFor(() =>
    expect(offersApi.reassignOffer).toHaveBeenCalledWith(1, {
      company_id: 2,
      priority_contact_id: 20,
      contact_ids: [20],
    }),
  );
  expect(await screen.findByText('Réaffectation effectuée.')).toBeInTheDocument();
});
