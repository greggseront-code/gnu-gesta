import { useState, useEffect } from 'react';
import { useAuth } from '../context/auth-context';
import { listPedagogicalOffers } from '../features/offers/offers.api';
import { listApplications } from '../features/applications/applications.api';
import type { Application } from '../features/applications/applications.api';
import { listStudents } from '../features/students/students.api';
import { listCompanies } from '../features/companies/companies.api';
import type { Offer } from '../features/offers/offers.types';

interface OfferWithApplications {
  offer: Offer;
  applications: Application[];
}

export function AdminApplicationsPage() {
  const { role } = useAuth();
  const [groups, setGroups] = useState<OfferWithApplications[]>([]);
  const [studentMap, setStudentMap] = useState<Map<number, string>>(new Map());
  const [companyMap, setCompanyMap] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [offers, students, companies] = await Promise.all([
        listPedagogicalOffers(),
        listStudents(),
        listCompanies(),
      ]);

      // Build lookup maps
      const sMap = new Map<number, string>(
        students.map((s) => [s.id, `${s.first_name} ${s.last_name}`]),
      );
      const cMap = new Map<number, string>(companies.map((c) => [c.id, c.name]));

      // Fetch applications for all offers in parallel
      const appResults = await Promise.all(
        offers.map((offer) =>
          listApplications(offer.id)
            .then((apps) => ({ offer, applications: apps }))
            .catch(() => ({ offer, applications: [] as Application[] })),
        ),
      );

      // Keep only offers that have at least one application
      const withApps = appResults.filter((g) => g.applications.length > 0);

      setStudentMap(sMap);
      setCompanyMap(cMap);
      setGroups(withApps);
    }

    load()
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Erreur de chargement'),
      )
      .finally(() => setLoading(false));
  }, []);

  if (role !== 'gestionnaire' && role !== 'lecteur') {
    return <div className="alert alert-error">Accès réservé aux gestionnaires et lecteurs.</div>;
  }

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidatures</h1>
          <p className="page-subtitle">Vue de toutes les candidatures, regroupées par offre.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : groups.length === 0 ? (
        <p className="text-muted">Aucune candidature enregistrée.</p>
      ) : (
        <div className="stack-lg">
          {groups.map(({ offer, applications }) => {
            const companyName = companyMap.get(offer.company_id) ?? `Entreprise #${offer.company_id}`;
            const snippet =
              offer.description.slice(0, 120) + (offer.description.length > 120 ? '…' : '');
            return (
              <div key={offer.id} className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">{snippet}</h2>
                    <p className="text-muted" style={{ marginTop: '0.25rem' }}>
                      {companyName}
                    </p>
                  </div>
                  <span className="badge badge-primary">
                    {applications.length} candidature{applications.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="card-body">
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Étudiant</th>
                          <th>Sélectionné</th>
                          <th>Date de candidature</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map((app) => (
                          <tr key={app.id}>
                            <td>
                              {studentMap.get(app.student_id) ?? `Étudiant #${app.student_id}`}
                            </td>
                            <td>
                              {app.selected === 1 ? (
                                <span className="badge badge-success">Retenu</span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td>
                              {new Date(app.created_at).toLocaleDateString('fr-BE')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
