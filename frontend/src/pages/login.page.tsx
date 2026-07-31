import { loginUrl } from '../features/auth/auth.api';

export function LoginPage() {
  return (
    <div className="role-select-screen">
      <div className="role-select-container">
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
            gnu-gesta
          </div>
          <h1 className="role-select-title">Connexion</h1>
          <p className="role-select-subtitle">
            Pilote réservé au gestionnaire : authentification Microsoft Entra.
          </p>
        </div>

        <a className="btn btn-primary" href={loginUrl()}>
          Se connecter avec Microsoft
        </a>
      </div>
    </div>
  );
}
