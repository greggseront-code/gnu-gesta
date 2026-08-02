import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listPedagogicalOffers, validateOffer, rejectOffer, markUnavailable, changeOfferCompany } from '../features/offers/offers.api';
import type { Offer } from '../features/offers/offers.types';
import { StatusBadge } from '../components/status-badge';
import { listCompanies } from '../features/companies/companies.api';
import type { Company } from '../features/companies/companies.types';
import { useAuth } from '../context/auth-context';

export function AdminOffersPage() {
  const { role } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [companies, setCompanies] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Company correction state per offer
  const [correctingOfferId, setCorrectingOfferId] = useState<number | null>(null);
  const [companySearch, setCompanySearch] = useState('');
  const [companyResults, setCompanyResults] = useState<Company[]>([]);
  const [companySearchDone, setCompanySearchDone] = useState(false);

  async function load() {
    try {
      const [fetchedOffers, fetchedCompanies] = await Promise.all([
        listPedagogicalOffers(),
        listCompanies(),
      ]);
      setOffers(fetchedOffers);
      const map = new Map<number, string>();
      fetchedCompanies.forEach((c) => map.set(c.id, c.name));
      setCompanies(map);
    } catch (err) {
      setActionError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleValidate(offerId: number) {
    setActionError(null);
    try {
      const updated = await validateOffer(offerId);
      setOffers((prev) => prev.map((o) => o.id === offerId ? updated : o));
    } catch (err) {
      setActionError(String(err));
    }
  }

  async function handleReject(offerId: number) {
    setActionError(null);
    try {
      const updated = await rejectOffer(offerId);
      setOffers((prev) => prev.map((o) => o.id === offerId ? updated : o));
    } catch (err) {
      setActionError(String(err));
    }
  }

  async function handleMarkUnavailable(offerId: number) {
    setActionError(null);
    try {
      const updated = await markUnavailable(offerId);
      setOffers((prev) => prev.map((o) => o.id === offerId ? updated : o));
    } catch (err) {
      setActionError(String(err));
    }
  }

  function startCorrectCompany(offerId: number) {
    setCorrectingOfferId(offerId);
    setCompanySearch('');
    setCompanyResults([]);
    setCompanySearchDone(false);
  }

  function cancelCorrectCompany() {
    setCorrectingOfferId(null);
    setCompanySearch('');
    setCompanyResults([]);
    setCompanySearchDone(false);
  }

  async function handleCompanySearch(e: React.FormEvent) {
    e.preventDefault();
    try {
      const results = await listCompanies(companySearch || undefined);
      setCompanyResults(results);
      setCompanySearchDone(true);
    } catch (err) {
      setActionError(String(err));
    }
  }

  async function handleSelectNewCompany(offerId: number, companyId: number) {
    setActionError(null);
    try {
      const updated = await changeOfferCompany(offerId, companyId);
      setOffers((prev) => prev.map((o) => o.id === offerId ? updated : o));
      cancelCorrectCompany();
    } catch (err) {
      setActionError(String(err));
    }
  }

  if (role !== 'gestionnaire' && role !== 'lecteur') {
    return (
      <div className="alert alert-error">Accès réservé aux gestionnaires et lecteurs.</div>
    );
  }

  const isReadOnly = role === 'lecteur';

  if (loading) return <p className="text-muted">Chargement…</p>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Administration des offres</h1>
      </div>

      {actionError && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{actionError}</div>
      )}

      {offers.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted table-empty">Aucune offre.</p>
          </div>
        </div>
      ) : (
        <div className="stack">
          {offers.map((offer) => {
            const companyName = companies.get(offer.company_id) ?? `Entreprise #${offer.company_id}`;
            const isCorrecting = correctingOfferId === offer.id;

            return (
              <div key={offer.id} className="card">
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="text-muted" style={{ fontSize: '0.8125rem' }}>{companyName}</span>
                        {offer.source_type === 'student' && (
                          <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>Étudiant</span>
                        )}
                        {offer.source_type === 'company' && (
                          <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>Entreprise</span>
                        )}
                        <Link to={`/offers/${offer.id}`} style={{ fontSize: '0.8125rem' }}>Voir le détail</Link>
                      </div>
                      <p style={{ marginBottom: '0.5rem' }}>
                        {offer.description.length > 200
                          ? offer.description.slice(0, 200) + '…'
                          : offer.description}
                      </p>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <StatusBadge status={offer.status} />
                    </div>
                  </div>

                  {!isReadOnly && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                      {offer.status === 'soumise' && (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleValidate(offer.id)}
                          >
                            Valider
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleReject(offer.id)}
                          >
                            Refuser
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleMarkUnavailable(offer.id)}
                          >
                            Indisponible
                          </button>
                        </>
                      )}
                      {offer.source_type === 'student' && (
                        !isCorrecting ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => startCorrectCompany(offer.id)}
                          >
                            Corriger l'entreprise
                          </button>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={cancelCorrectCompany}
                          >
                            Annuler
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {isCorrecting && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--color-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
                      <p style={{ marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                        Changer l'entreprise
                      </p>
                      <form onSubmit={handleCompanySearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input
                          className="search-input"
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          placeholder="Rechercher une entreprise…"
                          style={{ flex: 1 }}
                        />
                        <button type="submit" className="btn btn-primary btn-sm">Rechercher</button>
                      </form>

                      {companySearchDone && companyResults.length === 0 && (
                        <p className="text-muted" style={{ fontSize: '0.875rem' }}>Aucune entreprise trouvée.</p>
                      )}

                      {companyResults.length > 0 && (
                        <div className="table-wrapper">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Nom</th>
                                <th>Email</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {companyResults.map((c) => (
                                <tr key={c.id}>
                                  <td>{c.name}</td>
                                  <td className="text-muted">{c.general_email}</td>
                                  <td>
                                    <button
                                      className="btn btn-primary btn-sm"
                                      onClick={() => handleSelectNewCompany(offer.id, c.id)}
                                    >
                                      Choisir
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
