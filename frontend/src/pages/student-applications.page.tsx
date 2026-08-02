import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { listStudentApplications } from '../features/applications/applications.api';
import type { Application } from '../features/applications/applications.api';
import { listMyStudentOffers } from '../features/offers/offers.api';
import type { Offer } from '../features/offers/offers.types';
import { StatusBadge } from '../components/status-badge';

export function StudentApplicationsPage() {
  const { role, entityId } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (role !== 'etudiant' || entityId == null) return;
    Promise.all([listStudentApplications(entityId), listMyStudentOffers()])
      .then(([apps, fetchedOffers]) => {
        setApplications(apps);
        setOffers(fetchedOffers);
      })
      .catch((err) => setLoadError(String(err)));
  }, [entityId, role]);

  if (role !== 'etudiant') {
    return <div className="alert alert-error">Accès réservé aux étudiants.</div>;
  }

  if (entityId == null) {
    return <div className="alert alert-error">Aucun étudiant associé à ce compte.</div>;
  }

  if (loadError) {
    return <div className="alert alert-error">{loadError}</div>;
  }

  const offerMap = new Map<number, Offer>(offers.map((o) => [o.id, o]));
  const myProposals = offers.filter((o) => o.source_type === 'student');

  return (
    <div className="stack-lg">
      <div className="page-header">
        <h1 className="page-title">Mon espace</h1>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Mes candidatures</span>
        </div>
        <div className="card-body">
          {applications.length === 0 ? (
            <p className="text-muted">Aucune candidature envoyée.</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Offre</th>
                    <th>Statut de l'offre</th>
                    <th>Candidature</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => {
                    const offer = offerMap.get(app.offer_id);
                    return (
                      <tr key={app.id}>
                        <td>
                          <Link to={`/offers/${app.offer_id}`}>Offre #{app.offer_id}</Link>
                        </td>
                        <td>
                          {offer ? <StatusBadge status={offer.status} /> : <span className="text-muted">—</span>}
                        </td>
                        <td>
                          {app.selected === 1 ? (
                            <span className="badge badge-success">Retenu(e)</span>
                          ) : (
                            <span className="badge badge-warning">En attente</span>
                          )}
                        </td>
                        <td className="text-muted">
                          {new Date(app.created_at).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Mes propositions</span>
        </div>
        <div className="card-body">
          {myProposals.length === 0 ? (
            <p className="text-muted">Aucune proposition soumise.</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {myProposals.map((o) => (
                    <tr key={o.id}>
                      <td>
                        {o.description.length > 120
                          ? o.description.slice(0, 120) + '…'
                          : o.description}
                      </td>
                      <td><StatusBadge status={o.status} /></td>
                      <td>
                        <Link to={`/offers/${o.id}`} className="btn btn-secondary btn-sm">Voir</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
