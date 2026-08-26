import { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  listPedagogicalOffers,
  validateOffer,
  rejectOffer,
  markUnavailable,
  getOfferDependencies,
} from '../features/offers/offers.api';
import type { Offer, OfferDependencyStatus } from '../features/offers/offers.types';
import { StatusBadge } from '../components/status-badge';
import { useAuth } from '../context/auth-context';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function AdminOffersPage() {
  const { role } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [dependencies, setDependencies] = useState<Map<number, OfferDependencyStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const fetchedOffers = await listPedagogicalOffers();
      setOffers(fetchedOffers);

      const pending = fetchedOffers.filter((o) => o.status === 'soumise');
      const deps = await Promise.all(pending.map((o) => getOfferDependencies(o.id).then((d) => [o.id, d] as const)));
      setDependencies(new Map(deps));
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === 'gestionnaire') load();
  }, [role, load]);

  if (role !== 'gestionnaire') {
    return <Navigate to="/" replace />;
  }

  async function handleValidate(offerId: number) {
    setActionError(null);
    try {
      const updated = await validateOffer(offerId);
      setOffers((prev) => prev.map((o) => o.id === offerId ? updated : o));
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleReject(offerId: number) {
    setActionError(null);
    try {
      const updated = await rejectOffer(offerId);
      setOffers((prev) => prev.map((o) => o.id === offerId ? updated : o));
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleMarkUnavailable(offerId: number) {
    setActionError(null);
    try {
      const updated = await markUnavailable(offerId);
      setOffers((prev) => prev.map((o) => o.id === offerId ? updated : o));
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

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
            const deps = dependencies.get(offer.id);
            const hasBlockers = Boolean(deps && (deps.company_pending || deps.pending_contact_ids.length > 0));

            return (
              <div key={offer.id} className="card">
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Link to={`/admin/companies/${offer.company_id}`} style={{ fontSize: '0.8125rem' }}>
                          {offer.company_name}
                        </Link>
                        {offer.source_type === 'student' && (
                          <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                            Étudiant{offer.submitted_by_student_name ? ` : ${offer.submitted_by_student_name}` : ''}
                          </span>
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

                      {offer.status === 'soumise' && hasBlockers && deps && (
                        <div className="alert alert-warning" style={{ marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
                          Dépendance en attente :{' '}
                          {deps.company_pending && (
                            <Link to="/admin/companies#pending-companies">l'entreprise</Link>
                          )}
                          {deps.company_pending && deps.pending_contact_ids.length > 0 && ' et '}
                          {deps.pending_contact_ids.length > 0 && (
                            <Link to="/admin/companies#pending-contacts">
                              {deps.pending_contact_ids.length} contact{deps.pending_contact_ids.length > 1 ? 's' : ''}
                            </Link>
                          )}
                          {' '}doivent être validés avant de pouvoir publier cette offre.
                        </div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <StatusBadge status={offer.status} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                    {offer.status === 'soumise' && (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleValidate(offer.id)}
                          disabled={hasBlockers}
                          title={hasBlockers ? 'Validez d\'abord les dépendances en attente.' : undefined}
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
