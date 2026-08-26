import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OfferCard } from './offer-card';
import { AuthProvider } from '../../context/auth-context';
import * as authApi from '../auth/auth.api';
import type { Offer } from './offers.types';

vi.mock('../auth/auth.api');

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

async function loginAsEtudiant(entityId: number) {
  vi.mocked(authApi.getCurrentUser).mockResolvedValue({
    name: 'Alice Étudiante',
    email: 'alice@student.vinci.be',
    baseRole: 'etudiant',
    role: 'etudiant',
    entityId,
    status: 'ok',
    impersonation: null,
    csrfToken: 'csrf-token',
  });
}

function renderCard(o: Offer) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <OfferCard offer={o} />
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("le nom de l'entreprise est affiché et pointe vers son détail", async () => {
  await loginAsEtudiant(42);
  renderCard(offer());

  const link = await screen.findByRole('link', { name: 'Acme' });
  expect(link).toHaveAttribute('href', '/admin/companies/5');
});

test("un étudiant voit \"Soumise par moi\" sur sa propre proposition", async () => {
  await loginAsEtudiant(42);
  renderCard(offer({ submitted_by_student_id: 42, source_type: 'student' }));

  expect(await screen.findByText('Soumise par moi')).toBeInTheDocument();
});

test("un étudiant ne voit pas ce libellé sur l'offre d'un autre étudiant", async () => {
  await loginAsEtudiant(42);
  renderCard(offer({ submitted_by_student_id: 99, source_type: 'student' }));

  await screen.findByText('Acme');
  expect(screen.queryByText('Soumise par moi')).not.toBeInTheDocument();
});
