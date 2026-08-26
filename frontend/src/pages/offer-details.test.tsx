import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OfferDetailsPage } from './offer-details.page';
import { AuthProvider } from '../context/auth-context';
import * as offersApi from '../features/offers/offers.api';
import * as authApi from '../features/auth/auth.api';
import type { Offer } from '../features/offers/offers.types';

vi.mock('../features/offers/offers.api');
vi.mock('../features/auth/auth.api');
vi.mock('../features/applications/applications.api');

function offer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: 1,
    company_id: 5,
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
    submitted_by_student_id: 42,
    created_by_company_id: null,
    source_type: 'student',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    company_name: 'Acme',
    submitted_by_student_name: 'Alice Martin',
    ...overrides,
  };
}

async function loginAs(role: 'gestionnaire' | 'etudiant') {
  vi.mocked(authApi.getCurrentUser).mockResolvedValue({
    name: 'Test User',
    email: 'test@vinci.be',
    baseRole: role,
    role,
    entityId: role === 'etudiant' ? 42 : null,
    status: 'ok',
    impersonation: null,
    csrfToken: 'csrf-token',
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/offers/1']}>
      <AuthProvider>
        <Routes>
          <Route path="/offers/:id" element={<OfferDetailsPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("le gestionnaire voit le nom de l'entreprise (lien) et de l'étudiant créateur", async () => {
  await loginAs('gestionnaire');
  vi.mocked(offersApi.getOffer).mockResolvedValue(offer());

  renderPage();

  const link = await screen.findByRole('link', { name: 'Acme' });
  expect(link).toHaveAttribute('href', '/admin/companies/5');
  expect(screen.getByText('Alice Martin')).toBeInTheDocument();
});

test("un étudiant ne voit pas le nom de l'étudiant créateur", async () => {
  await loginAs('etudiant');
  vi.mocked(offersApi.getOffer).mockResolvedValue(offer());

  renderPage();

  await screen.findByRole('link', { name: 'Acme' });
  expect(screen.queryByText('Alice Martin')).not.toBeInTheDocument();
});
