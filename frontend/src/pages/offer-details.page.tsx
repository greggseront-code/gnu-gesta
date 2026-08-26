import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOffer, validateOffer, rejectOffer, markUnavailable } from '../features/offers/offers.api';
import type { Offer } from '../features/offers/offers.types';
import { StatusBadge } from '../components/status-badge';
import { useAuth } from '../context/auth-context';
import { applyToOffer } from '../features/applications/applications.api';

export function OfferDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { role, entityId } = useAuth();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    getOffer(Number(id))
      .then(setOffer)
      .catch((err) => setError(String(err)));
  }, [id]);

  if (error) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Offre introuvable</h1>
        </div>
        <div className="alert alert-error">{error}</div>
        <Link to="/offers" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Retour aux offres
        </Link>
      </div>
    );
  }

  if (!offer) return <p className="text-muted">Chargement…</p>;

  const o = offer;
  const canEdit = role === 'entreprise' || role === 'gestionnaire';
  const canManage = role === 'gestionnaire' && o.status === 'soumise';
  const canApply = role === 'etudiant' && o.status === 'validee_et_visible' && entityId != null;

  async function handleApply() {
    if (entityId == null) return;
    setActionError(null);
    try {
      await applyToOffer(o.id, entityId!);
      setApplied(true);
      setApplySuccess(true);
    } catch (err) {
      setActionError(String(err));
    }
  }

  async function handleAction(action: 'validate' | 'reject' | 'unavailable') {
    setActionError(null);
    try {
      let updated: Offer;
      if (action === 'validate') updated = await validateOffer(o.id);
      else if (action === 'reject') updated = await rejectOffer(o.id);
      else updated = await markUnavailable(o.id);
      setOffer(updated);
    } catch (err) {
      setActionError(String(err));
    }
  }

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <h1 className="page-title">Détail de l'offre</h1>
          <p className="page-subtitle">
            <Link to="/offers">Offres</Link> / #{offer.id}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusBadge status={offer.status} />
          {canApply && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleApply}
              disabled={applied}
            >
              {applied ? 'Candidature envoyée' : 'Postuler'}
            </button>
          )}
          {canManage && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => handleAction('validate')}>Valider</button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleAction('reject')}>Refuser</button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleAction('unavailable')}>Indisponible</button>
            </>
          )}
          {canEdit && (
            <Link to={`/offers/${offer.id}/edit`} className="btn btn-secondary btn-sm">
              Modifier
            </Link>
          )}
        </div>
      </div>

      {applySuccess && (
        <div className="alert alert-success">Votre candidature a bien été envoyée.</div>
      )}
      {actionError && (
        <div className="alert alert-error">{actionError}</div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Description du poste</span>
        </div>
        <div className="card-body">
          <p style={{ whiteSpace: 'pre-wrap' }}>{offer.description}</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Informations</span>
        </div>
        <div className="card-body">
          <div className="meta-list">
            <div className="meta-item">
              <span className="meta-label">Entreprise</span>
              <span className="meta-value">
                <Link to={`/admin/companies/${offer.company_id}`}>{offer.company_name}</Link>
              </span>
            </div>
            {role === 'gestionnaire' && offer.source_type === 'student' && offer.submitted_by_student_name && (
              <div className="meta-item">
                <span className="meta-label">Soumise par</span>
                <span className="meta-value">{offer.submitted_by_student_name}</span>
              </div>
            )}
            {offer.location && (
              <div className="meta-item">
                <span className="meta-label">Lieu</span>
                <span className="meta-value">{offer.location}</span>
              </div>
            )}
            {offer.technologies && (
              <div className="meta-item">
                <span className="meta-label">Technologies</span>
                <span className="meta-value">{offer.technologies}</span>
              </div>
            )}
            {offer.objectives && (
              <div className="meta-item">
                <span className="meta-label">Objectifs pédagogiques</span>
                <span className="meta-value" style={{ whiteSpace: 'pre-wrap' }}>{offer.objectives}</span>
              </div>
            )}
            <div className="meta-item">
              <span className="meta-label">Télétravail</span>
              <span className="meta-value">
                {offer.remote_allowed
                  ? `Oui${offer.remote_percentage != null ? ` (${offer.remote_percentage}%)` : ''}`
                  : 'Non'}
              </span>
            </div>
            {offer.remarks && (
              <div className="meta-item">
                <span className="meta-label">Remarques</span>
                <span className="meta-value" style={{ whiteSpace: 'pre-wrap' }}>{offer.remarks}</span>
              </div>
            )}
            <div className="meta-item">
              <span className="meta-label">Soumise le</span>
              <span className="meta-value">
                {new Date(offer.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {offer.attachment_path && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Pièce jointe</span>
          </div>
          <div className="card-body">
            <a
              href={`/api/offers/${offer.id}/attachment`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              Télécharger la pièce jointe
            </a>
          </div>
        </div>
      )}

      <div style={{ marginTop: '0.5rem' }}>
        <Link to="/offers" className="btn btn-secondary">← Retour aux offres</Link>
      </div>
    </div>
  );
}
