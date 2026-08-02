import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './auth-context';
import * as authApi from '../features/auth/auth.api';
import * as apiClient from '../lib/api-client';
import type { CurrentAuthUser } from '../features/auth/auth.types';

vi.mock('../features/auth/auth.api');

const manager: CurrentAuthUser = {
  name: 'Gregory Seront',
  email: 'gregory.seront@vinci.be',
  baseRole: 'gestionnaire',
  role: 'gestionnaire',
  entityId: null,
  status: 'ok',
  impersonation: null,
  csrfToken: 'csrf-token-abc',
};

function Consumer() {
  const { user, role, loading, logout } = useAuth();
  if (loading) return <p>chargement</p>;
  return (
    <div>
      <p>{user ? `${user.name}:${role}` : 'anonyme'}</p>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

test('charge la session au montage et expose le rôle effectif', async () => {
  vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce(manager);

  render(<AuthProvider><Consumer /></AuthProvider>);

  expect(screen.getByText('chargement')).toBeInTheDocument();
  expect(await screen.findByText('Gregory Seront:gestionnaire')).toBeInTheDocument();
});

test('sans session active, user est null', async () => {
  vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce(null);

  render(<AuthProvider><Consumer /></AuthProvider>);

  expect(await screen.findByText('anonyme')).toBeInTheDocument();
});

test('propage le csrfToken de la session à api-client', async () => {
  const setCsrfTokenSpy = vi.spyOn(apiClient, 'setCsrfToken');
  vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce(manager);

  render(<AuthProvider><Consumer /></AuthProvider>);

  await screen.findByText('Gregory Seront:gestionnaire');
  expect(setCsrfTokenSpy).toHaveBeenCalledWith('csrf-token-abc');
});

test('logout appelle /auth/logout et efface la session locale', async () => {
  vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce(manager);
  vi.mocked(authApi.logout).mockResolvedValueOnce(undefined);

  render(<AuthProvider><Consumer /></AuthProvider>);
  await screen.findByText('Gregory Seront:gestionnaire');

  await userEvent.click(screen.getByText('logout'));

  expect(authApi.logout).toHaveBeenCalledOnce();
  expect(await screen.findByText('anonyme')).toBeInTheDocument();
});

test('un 401 global (session expirée) efface la session locale', async () => {
  const setUnauthorizedHandlerSpy = vi.spyOn(apiClient, 'setUnauthorizedHandler');
  vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce(manager);

  render(<AuthProvider><Consumer /></AuthProvider>);
  await screen.findByText('Gregory Seront:gestionnaire');

  const registeredHandler = setUnauthorizedHandlerSpy.mock.calls[0][0];
  registeredHandler?.();

  expect(await screen.findByText('anonyme')).toBeInTheDocument();
});
