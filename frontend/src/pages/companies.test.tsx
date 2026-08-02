import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CompaniesPage } from './companies.page';
import { AuthProvider } from '../context/auth-context';
import * as companiesApi from '../features/companies/companies.api';
import * as authApi from '../features/auth/auth.api';

vi.mock('../features/companies/companies.api');
vi.mock('../features/auth/auth.api');

beforeEach(() => {
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
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <CompaniesPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

test('affiche les entreprises retournées par l\'API', async () => {
  vi.mocked(companiesApi.listCompanies).mockResolvedValueOnce([
    {
      id: 1, name: 'Acme Corp', general_email: 'acme@acme.com', address: null,
      validation_status: 'validated', submitted_by_student_id: null, validated_at: '2026-01-01', created_at: '',
    },
    {
      id: 2, name: 'Beta Inc', general_email: 'beta@beta.com', address: null,
      validation_status: 'validated', submitted_by_student_id: null, validated_at: '2026-01-01', created_at: '',
    },
  ]);

  renderPage();

  expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
  expect(screen.getByText('Beta Inc')).toBeInTheDocument();
});

test('affiche un message quand la liste est vide', async () => {
  vi.mocked(companiesApi.listCompanies).mockResolvedValueOnce([]);

  renderPage();

  expect(await screen.findByText('Aucune entreprise trouvée.')).toBeInTheDocument();
});

test('appelle listCompanies avec le terme de recherche saisi', async () => {
  vi.mocked(companiesApi.listCompanies).mockResolvedValue([]);

  renderPage();
  await screen.findByText('Aucune entreprise trouvée.');

  await userEvent.type(screen.getByPlaceholderText('Rechercher une entreprise…'), 'acme');

  await waitFor(() => {
    expect(companiesApi.listCompanies).toHaveBeenCalledWith('acme');
  });
});

test('le gestionnaire voit le lien de création directe', async () => {
  vi.mocked(companiesApi.listCompanies).mockResolvedValue([]);

  renderPage();
  await screen.findByText('Aucune entreprise trouvée.');

  expect(screen.getByText('+ Nouvelle entreprise')).toBeInTheDocument();
});

test("l'étudiant ne voit pas le lien de création directe (passe par la recherche du parcours de proposition)", async () => {
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
  vi.mocked(companiesApi.listCompanies).mockResolvedValue([]);

  renderPage();
  await screen.findByText('Aucune entreprise trouvée.');

  expect(screen.queryByText('+ Nouvelle entreprise')).not.toBeInTheDocument();
});
