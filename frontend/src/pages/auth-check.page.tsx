import { useMemo, type ReactNode } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
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

/**
 * Destination transitoire du callback Microsoft : redirige vers l'accueil,
 * vers /account-not-linked, ou affiche l'erreur/le formulaire de reconnexion.
 * Ne reste jamais affichée pour un compte valide (voir plan jalon 6).
 */
export function AuthCheckPage() {
  const location = useLocation();
  const { user, loading, error } = useAuth();

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

  if (user.status === 'student_not_imported') {
    return <Navigate to="/account-not-linked" replace />;
  }

  return <Navigate to="/" replace />;
}
