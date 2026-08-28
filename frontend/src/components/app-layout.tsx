import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { deactivateImpersonation } from '../features/auth/auth.api';

function link({ isActive }: { isActive: boolean }) {
  return isActive ? 'nav-link active' : 'nav-link';
}

const ROLE_LABELS: Record<string, string> = {
  gestionnaire: 'Gestionnaire',
  lecteur: 'Lecteur',
  etudiant: 'Étudiant',
  entreprise: 'Entreprise',
};

export function AppLayout() {
  const { user, role, baseRole, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const isImpersonating = baseRole === 'gestionnaire' && role !== 'gestionnaire';

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  async function handleExitImpersonation() {
    await deactivateImpersonation();
    await refresh();
    navigate('/');
  }

  return (
    <div className="layout">
      <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-brand-name">GNG</div>
            <div className="sidebar-brand-sub">GNG is not Gesta</div>
          </div>

          <nav className="sidebar-nav">
            <div className="sidebar-section">
              <NavLink to="/" end className={link}>Accueil</NavLink>
            </div>

            {(role === 'gestionnaire' || role === 'lecteur' || role === 'etudiant') && (
              <div className="sidebar-section">
                <div className="sidebar-section-title">Répertoire</div>
                <NavLink to="/companies" className={link}>Entreprises</NavLink>
                {role === 'gestionnaire' && (
                  <>
                    <NavLink to="/admin/companies/new" className={link}>+ Nouvelle entreprise</NavLink>
                    <NavLink to="/admin/companies" end className={link}>Admin entreprises</NavLink>
                  </>
                )}
              </div>
            )}

            {(role === 'gestionnaire' || role === 'lecteur') && (
              <div className="sidebar-section">
                <div className="sidebar-section-title">Étudiants</div>
                <NavLink to="/admin/students" className={link}>Liste</NavLink>
                {role === 'gestionnaire' && (
                  <NavLink to="/admin/students/import" className={link}>Importer</NavLink>
                )}
              </div>
            )}

            {role === 'entreprise' && (
              <div className="sidebar-section">
                <div className="sidebar-section-title">Mon entreprise</div>
                <NavLink to="/company/dashboard" className={link}>Espace entreprise</NavLink>
              </div>
            )}

            {role === 'etudiant' && (
              <div className="sidebar-section">
                <div className="sidebar-section-title">Mon espace</div>
                <NavLink to="/student/applications" className={link}>Mes candidatures</NavLink>
              </div>
            )}

            <div className="sidebar-section">
              <div className="sidebar-section-title">Stages</div>
              <NavLink to="/offers" end className={link}>Offres</NavLink>
              {role === 'gestionnaire' && (
                <NavLink to="/admin/offers" className={link}>Admin offres</NavLink>
              )}
              {(role === 'gestionnaire' || role === 'lecteur') && (
                <NavLink to="/admin/applications" className={link}>Candidatures</NavLink>
              )}
              {role === 'entreprise' && (
                <NavLink to="/offers/new" className={link}>+ Déposer une offre</NavLink>
              )}
              {role === 'etudiant' && (
                <NavLink to="/offers/proposal" className={link}>+ Proposer un stage</NavLink>
              )}
            </div>

            {baseRole === 'gestionnaire' && !isImpersonating && (
              <div className="sidebar-section">
                <div className="sidebar-section-title">Gestionnaire</div>
                <NavLink to="/impersonate" className={link}>Changer de rôle</NavLink>
              </div>
            )}
          </nav>

          <div className="sidebar-footer">
            {user && (
              <div className="sidebar-role-badge">
                <div>{user.name}</div>
                <div className="text-muted">{user.email}</div>
                {role && <strong>{ROLE_LABELS[role]}</strong>}
              </div>
            )}
            <button className="nav-btn" onClick={handleLogout}>
              Se déconnecter
            </button>
          </div>
        </aside>

        <main className="main">
          {user?.authMode === 'dev' && (
            <div className="dev-auth-banner" role="status">
              AUTH DEV — local uniquement
            </div>
          )}
          {isImpersonating && (
            <div className="impersonation-banner" role="status">
              Mode temporaire : vous voyez l'application comme {role === 'etudiant' ? 'un étudiant' : 'une entreprise'}.{' '}
              <button className="btn btn-secondary btn-sm" onClick={handleExitImpersonation}>
                Quitter le mode temporaire
              </button>
            </div>
          )}
          <div className="page">
            <Outlet />
          </div>
        </main>
    </div>
  );
}
