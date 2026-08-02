import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthCheckPage } from './auth-check.page';
import { AuthProvider } from '../context/auth-context';
import * as authApi from '../features/auth/auth.api';
import type { CurrentAuthUser } from '../features/auth/auth.types';

vi.mock('../features/auth/auth.api');

function renderPage(initialPath = '/auth-check') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/auth-check" element={<AuthCheckPage />} />
          <Route path="/login" element={<p>Page de connexion</p>} />
          <Route path="/account-not-linked" element={<p>Compte non lié</p>} />
          <Route path="/" element={<p>Accueil</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

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

test('affiche un état de chargement pendant la vérification', async () => {
  vi.mocked(authApi.getCurrentUser).mockImplementation(() => new Promise(() => {}));

  renderPage();

  expect(screen.getByText('Vérification de la connexion…')).toBeInTheDocument();
});

test('redirige vers l\'accueil après une connexion réussie', async () => {
  vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce(manager);

  renderPage();

  expect(await screen.findByText('Accueil')).toBeInTheDocument();
});

test('redirige vers /account-not-linked pour un étudiant non référencé', async () => {
  vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce({
    ...manager,
    baseRole: 'etudiant',
    role: null,
    entityId: null,
    status: 'student_not_imported',
  });

  renderPage();

  expect(await screen.findByText('Compte non lié')).toBeInTheDocument();
});

test('affiche le message d\'erreur transmis par le callback backend', async () => {
  vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce(null);

  renderPage('/auth-check?error=invalid_tenant');

  expect(await screen.findByText("Ce compte Microsoft n'appartient pas au tenant attendu.")).toBeInTheDocument();
});

test('propose de se reconnecter quand aucune session n\'est active', async () => {
  vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce(null);

  renderPage();

  expect(await screen.findByText("Vous n'êtes pas connecté.")).toBeInTheDocument();
});
