import { useMemo, type ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

const ERROR_MESSAGES: Record<string, string> = {
  entra_error: 'La connexion Microsoft a été refusée ou annulée.',
  invalid_state: 'La demande de connexion a expiré ou est invalide. Réessayez.',
  missing_pending_auth: 'La demande de connexion a expiré ou est invalide. Réessayez.',
  invalid_tenant: "Ce compte Microsoft n'appartient pas au tenant attendu.",
  missing_code: 'La réponse de Microsoft est incomplète. Réessayez.',
  session_error: "Impossible d'établir la session. Réessayez.",
  unknown_error: 'Une erreur inattendue est survenue pendant la connexion.',
};

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="role-select-screen">
      <div className="role-select-container">
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
            gnu-gesta
          </div>
          <h1 className="role-select-title">Connexion Microsoft</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AuthCheckPage() {
  const location = useLocation();
  const { user, loading, error, logout } = useAuth();

  const callbackError = useMemo(
    () => new URLSearchParams(location.search).get('error'),
    [location.search],
  );

  if (loading) {
    return (
      <PageShell>
        <p className="text-muted">Vérification de la connexion…</p>
      </PageShell>
    );
  }

  if (callbackError) {
    return (
      <PageShell>
        <p role="alert">{ERROR_MESSAGES[callbackError] ?? ERROR_MESSAGES.unknown_error}</p>
        <Link className="btn btn-primary" to="/login">Retour à la connexion</Link>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <p role="alert">Impossible de vérifier votre session.</p>
        <Link className="btn btn-primary" to="/login">Retour à la connexion</Link>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <p className="text-muted">Vous n'êtes pas connecté.</p>
        <Link className="btn btn-primary" to="/login">Se connecter</Link>
      </PageShell>
    );
  }

  if ('role' in user) {
    return (
      <PageShell>
        <p>{user.name} — {user.email}</p>
        <p>Rôle : Gestionnaire</p>
        <button className="btn btn-secondary" onClick={() => logout()}>Se déconnecter</button>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <p>{user.name} — {user.email}</p>
      <p role="alert">Pilote réservé au gestionnaire. Ce compte n'a pas ce rôle.</p>
      <button className="btn btn-secondary" onClick={() => logout()}>Se déconnecter</button>
    </PageShell>
  );
}
