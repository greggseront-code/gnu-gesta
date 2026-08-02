import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ImpersonationSelectPage } from './impersonation-select.page';
import { AuthProvider } from '../context/auth-context';
import * as authApi from '../features/auth/auth.api';
import * as companiesApi from '../features/companies/companies.api';
import * as apiClient from '../lib/api-client';
import type { CurrentAuthUser } from '../features/auth/auth.types';

vi.mock('../features/auth/auth.api');
vi.mock('../features/companies/companies.api');
vi.mock('../lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api-client')>();
  return { ...actual, apiFetch: vi.fn() };
});

const manager: CurrentAuthUser = {
  name: 'Gregory Seront',
  email: 'gregory.seront@vinci.be',
  baseRole: 'gestionnaire',
  role: 'gestionnaire',
  entityId: null,
  status: 'ok',
  impersonation: null,
  csrfToken: 'csrf-token',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/impersonate']}>
      <AuthProvider>
        <Routes>
          <Route path="/impersonate" element={<ImpersonationSelectPage />} />
          <Route path="/" element={<p>Accueil</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(authApi.getCurrentUser).mockResolvedValue(manager);
});

test('affiche les deux modes disponibles', async () => {
  renderPage();
  expect(await screen.findByText('Voir comme un étudiant')).toBeInTheDocument();
  expect(screen.getByText('Voir comme une entreprise')).toBeInTheDocument();
});

test('sélectionner un étudiant active le mode et revient à l\'accueil', async () => {
  vi.mocked(apiClient.apiFetch).mockResolvedValueOnce([
    { id: 7, first_name: 'Alice', last_name: 'Martin', email: 'alice@student.vinci.be' },
  ]);
  vi.mocked(authApi.activateImpersonation).mockResolvedValueOnce(undefined);

  renderPage();
  await userEvent.click(await screen.findByText('Voir comme un étudiant'));

  expect(await screen.findByText('Alice Martin')).toBeInTheDocument();
  await userEvent.click(screen.getByText('Alice Martin'));

  expect(authApi.activateImpersonation).toHaveBeenCalledWith('student', 7);
  expect(await screen.findByText('Accueil')).toBeInTheDocument();
});

test('sélectionner une entreprise active le mode entreprise', async () => {
  vi.mocked(companiesApi.listCompanies).mockResolvedValueOnce([
    { id: 3, name: 'Acme Corp', general_email: 'acme@acme.com', address: null, created_at: '' },
  ]);
  vi.mocked(authApi.activateImpersonation).mockResolvedValueOnce(undefined);

  renderPage();
  await userEvent.click(await screen.findByText('Voir comme une entreprise'));

  expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
  await userEvent.click(screen.getByText('Acme Corp'));

  expect(authApi.activateImpersonation).toHaveBeenCalledWith('company', 3);
  expect(await screen.findByText('Accueil')).toBeInTheDocument();
});

test('liste vide affiche un message', async () => {
  vi.mocked(apiClient.apiFetch).mockResolvedValueOnce([]);

  renderPage();
  await userEvent.click(await screen.findByText('Voir comme un étudiant'));

  expect(await screen.findByText('Aucun étudiant importé.')).toBeInTheDocument();
});
