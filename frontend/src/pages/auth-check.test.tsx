import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthCheckPage } from './auth-check.page';
import { AuthProvider } from '../context/auth-context';
import * as authApi from '../features/auth/auth.api';

vi.mock('../features/auth/auth.api');

function renderPage(initialPath = '/auth-check') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/auth-check" element={<AuthCheckPage />} />
          <Route path="/login" element={<p>Page de connexion</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test('affiche un état de chargement pendant la vérification', async () => {
  vi.mocked(authApi.getCurrentUser).mockImplementation(() => new Promise(() => {}));

  renderPage();

  expect(screen.getByText('Vérification de la connexion…')).toBeInTheDocument();
});

test('affiche le rôle gestionnaire après une connexion réussie', async () => {
  vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce({
    name: 'Gregory Seront',
    email: 'gregory.seront@vinci.be',
    role: 'gestionnaire',
  });

  renderPage();

  expect(await screen.findByText('Rôle : Gestionnaire')).toBeInTheDocument();
  expect(screen.getByText('Gregory Seront — gregory.seront@vinci.be')).toBeInTheDocument();
});

test('affiche le message pilote réservé au gestionnaire pour un autre compte', async () => {
  vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce({
    name: 'Jane Doe',
    email: 'jane.doe@vinci.be',
    status: 'pilot_not_manager',
  });

  renderPage();

  expect(await screen.findByText(/Pilote réservé au gestionnaire/)).toBeInTheDocument();
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

test('la déconnexion réinitialise la session affichée', async () => {
  vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce({
    name: 'Gregory Seront',
    email: 'gregory.seront@vinci.be',
    role: 'gestionnaire',
  });
  vi.mocked(authApi.logout).mockResolvedValueOnce(undefined);

  renderPage();

  await screen.findByText('Rôle : Gestionnaire');
  await userEvent.click(screen.getByText('Se déconnecter'));

  await waitFor(() => {
    expect(authApi.logout).toHaveBeenCalled();
  });
  expect(await screen.findByText("Vous n'êtes pas connecté.")).toBeInTheDocument();
});
