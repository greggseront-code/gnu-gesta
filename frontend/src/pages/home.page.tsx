import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { listPedagogicalOffers } from '../features/offers/offers.api';
import { listCompanies, listCompaniesWithDuplicateRisk, listPendingQueue } from '../features/companies/companies.api';
import type { Offer } from '../features/offers/offers.types';
import type { Company } from '../features/companies/companies.types';

// ─── Gestionnaire ─────────────────────────────────────────────────────────────

function GestionnaireHome() {
  const [pendingOffers, setPendingOffers] = useState<Offer[]>([]);
  const [closableOffers, setClosableOffers] = useState<Offer[]>([]);
  const [recentCompanies, setRecentCompanies] = useState<Company[]>([]);
  const [duplicateCompanies, setDuplicateCompanies] = useState<Company[]>([]);
  const [pendingCompaniesCount, setPendingCompaniesCount] = useState(0);
  const [pendingContactsCount, setPendingContactsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Global search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCompanies, setSearchCompanies] = useState<Company[]>([]);
  const [searchOffers, setSearchOffers] = useState<Offer[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);


  useEffect(() => {
    Promise.all([
      listPedagogicalOffers(),
      listCompaniesWithDuplicateRisk(),
      listCompanies(),
      listPendingQueue(),
    ])
      .then(([offers, dupes, companies, pendingQueue]) => {
        setPendingOffers(offers.filter((o) => o.status === 'soumise'));
        setClosableOffers(offers.filter((o) => o.status === 'validee_et_visible'));
        setDuplicateCompanies(dupes);
        const sorted = [...companies].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setRecentCompanies(sorted.slice(0, 5));
        setPendingCompaniesCount(pendingQueue.companies.length);
        setPendingContactsCount(pendingQueue.contacts.length);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Erreur de chargement'),
      )
      .finally(() => setLoading(false));
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setHasSearched(true);
    Promise.all([
      listCompanies(searchQuery.trim()),
      listPedagogicalOffers(searchQuery.trim()),
    ])
      .then(([companies, offers]) => {
        setSearchCompanies(companies);
        setSearchOffers(offers);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Erreur de recherche'),
      )
      .finally(() => setSearching(false));
  }

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord — Gestionnaire</h1>
          <p className="page-subtitle">Vue d'ensemble et accès rapide.</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="dashboard-grid">
        <Link to="/admin/students/import" className="dashboard-card">
          <div className="dashboard-card-icon">📥</div>
          <div className="dashboard-card-title">Importer des étudiants</div>
          <div className="dashboard-card-desc">Charger une liste CSV d'étudiants.</div>
        </Link>
        <Link to="/admin/offers" className="dashboard-card">
          <div className="dashboard-card-icon">📋</div>
          <div className="dashboard-card-title">Admin offres</div>
          <div className="dashboard-card-desc">Valider, refuser ou clôturer les offres.</div>
        </Link>
        <Link to="/admin/applications" className="dashboard-card">
          <div className="dashboard-card-icon">🎓</div>
          <div className="dashboard-card-title">Candidatures</div>
          <div className="dashboard-card-desc">Consulter toutes les candidatures par offre.</div>
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : (
        <div className="stack-lg">
          {/* Compteurs des files de modération */}
          <div className="dashboard-grid">
            <Link to="/admin/offers" className="dashboard-card">
              <div className="dashboard-card-icon">📋</div>
              <div className="dashboard-card-title">
                Offres en attente <span className="badge badge-warning">{pendingOffers.length}</span>
              </div>
              <div className="dashboard-card-desc">Offres soumises à valider ou refuser.</div>
            </Link>
            <Link to="/admin/companies#pending-companies" className="dashboard-card">
              <div className="dashboard-card-icon">🏢</div>
              <div className="dashboard-card-title">
                Entreprises en attente <span className="badge badge-warning">{pendingCompaniesCount}</span>
              </div>
              <div className="dashboard-card-desc">Entreprises proposées par des étudiants.</div>
            </Link>
            <Link to="/admin/companies#pending-contacts" className="dashboard-card">
              <div className="dashboard-card-icon">👤</div>
              <div className="dashboard-card-title">
                Contacts en attente <span className="badge badge-warning">{pendingContactsCount}</span>
              </div>
              <div className="dashboard-card-desc">Contacts proposés par des étudiants.</div>
            </Link>
          </div>

          {/* Section 1 — Offres en attente */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                Offres en attente{' '}
                <span className="badge badge-warning">{pendingOffers.length}</span>
              </h2>
              <Link to="/admin/offers" className="btn btn-sm btn-secondary">
                Voir toutes les offres
              </Link>
            </div>
            <div className="card-body">
              {pendingOffers.length === 0 ? (
                <p className="text-muted">Aucune offre en attente.</p>
              ) : (
                <ul className="stack">
                  {pendingOffers.map((offer) => (
                    <li key={offer.id}>
                      <Link to={`/offers/${offer.id}`}>
                        {offer.description.slice(0, 120)}
                        {offer.description.length > 120 ? '…' : ''}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Section 2 — Entreprises récentes */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Entreprises récentes</h2>
              <Link to="/companies" className="btn btn-sm btn-secondary">
                Voir toutes
              </Link>
            </div>
            <div className="card-body">
              {recentCompanies.length === 0 ? (
                <p className="text-muted">Aucune entreprise.</p>
              ) : (
                <ul className="stack">
                  {recentCompanies.map((c) => (
                    <li key={c.id}>
                      <Link to={`/admin/companies/${c.id}`}>{c.name}</Link>
                      <span className="text-muted" style={{ marginLeft: '0.5rem', fontSize: '0.85em' }}>
                        {new Date(c.created_at).toLocaleDateString('fr-BE')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Section 3 — Doublons probables */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                Doublons probables{' '}
                {duplicateCompanies.length > 0 && (
                  <span className="badge badge-warning">{duplicateCompanies.length}</span>
                )}
              </h2>
            </div>
            <div className="card-body">
              {duplicateCompanies.length === 0 ? (
                <p className="text-muted">Aucun doublon détecté.</p>
              ) : (
                <ul className="stack">
                  {duplicateCompanies.map((c) => (
                    <li key={c.id}>
                      <Link to={`/admin/companies/${c.id}`}>{c.name}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Section 4 — Offres à clôturer */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                Offres à clôturer{' '}
                {closableOffers.length > 0 && (
                  <span className="badge badge-primary">{closableOffers.length}</span>
                )}
              </h2>
              <Link to="/admin/offers" className="btn btn-sm btn-secondary">
                Gérer les offres
              </Link>
            </div>
            <div className="card-body">
              {closableOffers.length === 0 ? (
                <p className="text-muted">Aucune offre publiée en attente de clôture.</p>
              ) : (
                <ul className="stack">
                  {closableOffers.slice(0, 5).map((offer) => (
                    <li key={offer.id}>
                      <Link to={`/offers/${offer.id}`}>
                        {offer.description.slice(0, 120)}
                        {offer.description.length > 120 ? '…' : ''}
                      </Link>
                    </li>
                  ))}
                  {closableOffers.length > 5 && (
                    <li className="text-muted" style={{ fontSize: '0.875rem' }}>
                      +{closableOffers.length - 5} autres — <Link to="/admin/offers">voir toutes</Link>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Section 5 — Recherche globale */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Recherche globale</h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Rechercher entreprises et offres…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" disabled={searching}>
                  {searching ? 'Recherche…' : 'Rechercher'}
                </button>
              </form>

              {hasSearched && !searching && (
                <div className="stack">
                  <div>
                    <strong>
                      Entreprises ({searchCompanies.length})
                    </strong>
                    {searchCompanies.length === 0 ? (
                      <p className="text-muted">Aucune entreprise trouvée.</p>
                    ) : (
                      <ul className="stack">
                        {searchCompanies.map((c) => (
                          <li key={c.id}>
                            <Link to={`/admin/companies/${c.id}`}>{c.name}</Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <strong>
                      Offres ({searchOffers.length})
                    </strong>
                    {searchOffers.length === 0 ? (
                      <p className="text-muted">Aucune offre trouvée.</p>
                    ) : (
                      <ul className="stack">
                        {searchOffers.map((o) => (
                          <li key={o.id}>
                            <Link to={`/offers/${o.id}`}>
                              {o.description.slice(0, 120)}
                              {o.description.length > 120 ? '…' : ''}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lecteur ──────────────────────────────────────────────────────────────────

function LecteurHome() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord — Lecteur</h1>
          <p className="page-subtitle">Accès rapide en consultation.</p>
        </div>
      </div>
      <div className="dashboard-grid">
        <Link to="/companies" className="dashboard-card">
          <div className="dashboard-card-icon">🏢</div>
          <div className="dashboard-card-title">Entreprises</div>
          <div className="dashboard-card-desc">Consulter l'annuaire des entreprises partenaires.</div>
        </Link>
        <Link to="/offers" className="dashboard-card">
          <div className="dashboard-card-icon">📋</div>
          <div className="dashboard-card-title">Offres de stage</div>
          <div className="dashboard-card-desc">Parcourir les offres de stage.</div>
        </Link>
        <Link to="/admin/students" className="dashboard-card">
          <div className="dashboard-card-icon">🎓</div>
          <div className="dashboard-card-title">Étudiants</div>
          <div className="dashboard-card-desc">Consulter la liste des étudiants.</div>
        </Link>
        <Link to="/admin/applications" className="dashboard-card">
          <div className="dashboard-card-icon">📝</div>
          <div className="dashboard-card-title">Candidatures</div>
          <div className="dashboard-card-desc">Consulter toutes les candidatures par offre.</div>
        </Link>
      </div>
    </div>
  );
}

// ─── Default (etudiant / entreprise / other) ──────────────────────────────────

function DefaultHome() {
  // Réservé à etudiant/entreprise (gestionnaire et lecteur ont leur propre
  // tableau de bord) : la création d'entreprise ne figure plus ici — un
  // étudiant passe par la recherche du parcours de proposition, une
  // entreprise ne peut pas créer sa propre fiche (voir spec).
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Bienvenue dans la gestion des stages.</p>
        </div>
      </div>
      <div className="dashboard-grid">
        <Link to="/companies" className="dashboard-card">
          <div className="dashboard-card-icon">🏢</div>
          <div className="dashboard-card-title">Entreprises</div>
          <div className="dashboard-card-desc">Consulter et gérer l'annuaire des entreprises partenaires.</div>
        </Link>
        <Link to="/offers" className="dashboard-card">
          <div className="dashboard-card-icon">📋</div>
          <div className="dashboard-card-title">Offres de stage</div>
          <div className="dashboard-card-desc">Parcourir les offres de stage disponibles.</div>
        </Link>
      </div>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function HomePage() {
  const { role } = useAuth();
  if (role === 'gestionnaire') return <GestionnaireHome />;
  if (role === 'lecteur') return <LecteurHome />;
  return <DefaultHome />;
}
