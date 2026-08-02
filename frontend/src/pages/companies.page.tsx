import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listCompanies } from '../features/companies/companies.api';
import type { Company } from '../features/companies/companies.types';
import { useAuth } from '../context/auth-context';

export function CompaniesPage() {
  const { role } = useAuth();
  const canCreate = role === 'gestionnaire' || role === 'etudiant' || role === 'entreprise';
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    listCompanies(search || undefined).then(setCompanies).catch(console.error);
  }, [search]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Entreprises</h1>
        {canCreate && <Link to="/admin/companies/new" className="btn btn-primary">+ Nouvelle entreprise</Link>}
      </div>
      <div className="card">
        <div className="card-header">
          <input
            className="search-input"
            placeholder="Rechercher une entreprise…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="text-muted" style={{ fontSize: '0.8125rem' }}>
            {companies.length} résultat{companies.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Adresse</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={3} className="table-empty">Aucune entreprise trouvée.</td>
                </tr>
              ) : (
                companies.map((c) => (
                  <tr key={c.id}>
                    <td><Link to={`/admin/companies/${c.id}`}>{c.name}</Link></td>
                    <td className="text-muted">{c.general_email}</td>
                    <td className="text-muted">{c.address || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
