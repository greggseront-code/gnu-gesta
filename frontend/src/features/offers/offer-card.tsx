import { Link } from 'react-router-dom';
import type { Offer } from './offers.types';
import { StatusBadge } from '../../components/status-badge';
import { useAuth } from '../../context/auth-context';

interface OfferCardProps {
  offer: Offer;
}

function truncate(text: string, maxLength = 160): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

export function OfferCard({ offer }: OfferCardProps) {
  const { role, entityId } = useAuth();
  const isMine = role === 'etudiant' && entityId != null && offer.submitted_by_student_id === entityId;

  return (
    <div className="card">
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '0.25rem' }}>
              <Link to={`/admin/companies/${offer.company_id}`} className="text-muted" style={{ fontSize: '0.8125rem' }}>
                {offer.company_name}
              </Link>
            </div>
            <p style={{ marginBottom: '0.5rem' }}>{truncate(offer.description)}</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {offer.location && (
                <span className="text-muted" style={{ fontSize: '0.8125rem' }}>📍 {offer.location}</span>
              )}
              {offer.technologies && (
                <span className="text-muted" style={{ fontSize: '0.8125rem' }}>🛠 {offer.technologies}</span>
              )}
              {offer.remote_allowed ? (
                <span className="text-muted" style={{ fontSize: '0.8125rem' }}>
                  Télétravail{offer.remote_percentage != null ? ` ${offer.remote_percentage}%` : ''}
                </span>
              ) : null}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {isMine && <span className="badge badge-primary">Soumise par moi</span>}
              <StatusBadge status={offer.status} />
            </div>
            <Link to={`/offers/${offer.id}`} className="btn btn-secondary btn-sm">
              Voir l'offre
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
