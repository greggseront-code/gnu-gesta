import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

/**
 * Compte Microsoft authentifié mais sans fiche `students` correspondante
 * (voir spec : aucune fiche n'est créée automatiquement). Propose de
 * revérifier après un import gestionnaire, ou de se déconnecter.
 */
export function AccountNotLinkedPage() {
  const { user, loading, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  if (loading) {
    return (
      <div className="role-select-screen">
        <div className="role-select-container">
          <p className="text-muted">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status !== 'student_not_imported') {
    return <Navigate to="/" replace />;
  }

  async function handleCheckAgain() {
    setChecking(true);
    await refresh();
    setChecking(false);
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="role-select-screen">
      <div className="role-select-container">
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
            gnu-gesta
          </div>
          <h1 className="role-select-title">Compte non référencé</h1>
        </div>

        <p>{user.name} — {user.email}</p>
        <p role="alert">
          Votre compte étudiant n'est pas encore référencé dans GNG. Contactez un gestionnaire.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button className="btn btn-primary" onClick={handleCheckAgain} disabled={checking}>
            {checking ? 'Vérification…' : 'Vérifier à nouveau'}
          </button>
          <button className="btn btn-secondary" onClick={handleLogout}>
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
