import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getCurrentUser, logout as logoutRequest } from '../features/auth/auth.api';
import { setCsrfToken, setUnauthorizedHandler } from '../lib/api-client';
import type { CurrentAuthUser, BaseRole, EffectiveRole, AccountStatus } from '../features/auth/auth.types';

interface AuthContextValue {
  user: CurrentAuthUser | null;
  /** Rôle effectif (tient compte d'une incarnation gestionnaire active) : remplace l'ancien useRole().role. */
  role: EffectiveRole | null;
  entityId: number | null;
  baseRole: BaseRole | null;
  status: AccountStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUser(await getCurrentUser());
    } catch {
      setError('Impossible de récupérer la session.');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCsrfToken(user?.csrfToken ?? null);
  }, [user]);

  useEffect(() => {
    // Un 401 sur n'importe quel appel API (session expirée côté serveur)
    // efface l'utilisateur courant : les gardes de route renvoient alors vers /login.
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function logout() {
    await logoutRequest();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        entityId: user?.entityId ?? null,
        baseRole: user?.baseRole ?? null,
        status: user?.status ?? null,
        loading,
        error,
        refresh,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
