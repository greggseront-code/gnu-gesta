import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { getDevAuthFixtures, loginWithDevFixture } from '../features/auth/auth.api';
import type { DevAuthFixture } from '../features/auth/auth.types';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Le mode d’authentification locale est indisponible.';
}

export function DevLoginPage() {
  const navigate = useNavigate();
  const { loading: authLoading, refresh } = useAuth();
  const [fixtures, setFixtures] = useState<DevAuthFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState<DevAuthFixture['name'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getDevAuthFixtures()
      .then((available) => {
        if (active) setFixtures(available);
      })
      .catch((requestError: unknown) => {
        if (active) setError(errorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function login(fixture: DevAuthFixture['name']) {
    setLoggingIn(fixture);
    setError(null);
    try {
      await loginWithDevFixture(fixture);
      await refresh();
      navigate('/', { replace: true });
    } catch (loginError: unknown) {
      setError(errorMessage(loginError));
    } finally {
      setLoggingIn(null);
    }
  }

  return (
    <div className="role-select-screen">
      <div className="role-select-container">
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
            gnu-gesta
          </div>
          <h1 className="role-select-title">Authentification locale</h1>
          <p className="role-select-subtitle">
            Sélecteur de test disponible uniquement sur la machine locale.
          </p>
        </div>

        <div className="alert alert-warning" role="note" style={{ marginBottom: '1rem' }}>
          AUTH DEV — local uniquement. Ces identités ne doivent jamais être activées sur le VPS.
        </div>

        {error && <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>{error}</div>}
        {loading || authLoading ? (
          <p className="text-muted">Chargement des fixtures…</p>
        ) : fixtures.length === 0 ? (
          <p className="text-muted">Aucune fixture locale n’est disponible dans la base courante.</p>
        ) : (
          <div className="role-grid">
            {fixtures.map((fixture) => (
              <button
                key={fixture.name}
                className="role-btn"
                onClick={() => login(fixture.name)}
                disabled={loggingIn !== null}
              >
                <span className="role-btn-title">{fixture.label}</span>
                <span className="role-btn-desc">{fixture.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
