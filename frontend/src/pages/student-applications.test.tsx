import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StudentApplicationsPage } from './student-applications.page';
import { AuthProvider } from '../context/auth-context';
import * as applicationsApi from '../features/applications/applications.api';
import * as offersApi from '../features/offers/offers.api';
import * as authApi from '../features/auth/auth.api';
import type { Offer } from '../features/offers/offers.types';

vi.mock('../features/applications/applications.api');
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
    status: 'validee_et_visible',
    submitted_by_student_id: null,
    created_by_company_id: null,
    source_type: 'company',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    company_name: 'Acme Corp',
    submitted_by_student_name: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(authApi.getCurrentUser).mockResolvedValue({
    name: 'Alice Étudiante',
    email: 'alice@student.vinci.be',
    baseRole: 'etudiant',
    role: 'etudiant',
    entityId: 42,
    status: 'ok',
    impersonation: null,
    csrfToken: 'csrf-token',
  });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <StudentApplicationsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("la liste des candidatures affiche le nom de l'entreprise plutôt qu'un numéro d'offre", async () => {
  vi.mocked(applicationsApi.listStudentApplications).mockResolvedValue([
    { id: 1, offer_id: 1, student_id: 42, selected: 0, created_at: '2026-01-01' },
  ]);
  vi.mocked(offersApi.listMyStudentOffers).mockResolvedValue([offer()]);

  renderPage();

  const link = await screen.findByRole('link', { name: 'Acme Corp' });
  expect(link).toHaveAttribute('href', '/offers/1');
  expect(screen.queryByText('Offre #1')).not.toBeInTheDocument();
});

test("retombe sur le numéro d'offre si l'offre n'est plus dans la liste visible", async () => {
  vi.mocked(applicationsApi.listStudentApplications).mockResolvedValue([
    { id: 1, offer_id: 9, student_id: 42, selected: 0, created_at: '2026-01-01' },
  ]);
  vi.mocked(offersApi.listMyStudentOffers).mockResolvedValue([]);

  renderPage();

  expect(await screen.findByRole('link', { name: 'Offre #9' })).toBeInTheDocument();
});

test("un bouton Voir permet d'ouvrir le détail de l'offre depuis mes candidatures", async () => {
  vi.mocked(applicationsApi.listStudentApplications).mockResolvedValue([
    { id: 1, offer_id: 1, student_id: 42, selected: 0, created_at: '2026-01-01' },
  ]);
  vi.mocked(offersApi.listMyStudentOffers).mockResolvedValue([offer()]);

  renderPage();

  const voirLink = await screen.findByRole('link', { name: 'Voir' });
  expect(voirLink).toHaveAttribute('href', '/offers/1');
});
