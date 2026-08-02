import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listVisibleOffers, listMyCompanyOffers, listMyStudentOffers } from '../features/offers/offers.api';
import type { Offer } from '../features/offers/offers.types';
import { OfferCard } from '../features/offers/offer-card';
import { useAuth } from '../context/auth-context';

export function OffersPage() {
  const { role } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let promise: Promise<Offer[]>;

    if (role === 'entreprise') {
      promise = listMyCompanyOffers();
    } else if (role === 'etudiant') {
      promise = listMyStudentOffers();
    } else {
      promise = listVisibleOffers(search || undefined);
    }

    promise
      .then(setOffers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, role]);

  const showSearch = role !== 'entreprise' && role !== 'etudiant';
  const canPropose = role === 'etudiant';
  const canSubmit = role === 'entreprise';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Offres de stage</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {canSubmit && (
            <Link to="/offers/new" className="btn btn-primary">+ Déposer une offre</Link>
          )}
          {canPropose && (
            <Link to="/offers/proposal" className="btn btn-primary">+ Proposer un stage</Link>
          )}
        </div>
      </div>

      {showSearch && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header">
            <input
              className="search-input"
              placeholder="Rechercher par description, technologies, lieu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="text-muted" style={{ fontSize: '0.8125rem' }}>
              {offers.length} résultat{offers.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : offers.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted table-empty">Aucune offre trouvée.</p>
          </div>
        </div>
      ) : (
        <div className="stack">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      )}
    </div>
  );
}
