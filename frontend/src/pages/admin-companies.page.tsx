import { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  listPendingQueue,
  validateCompany,
  rejectCompany,
  validateContact,
  rejectContact,
} from '../features/companies/companies.api';
import type { PendingCompany, PendingContact } from '../features/companies/companies.types';
import { ApiError } from '../lib/api-client';
import { useAuth } from '../context/auth-context';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function offerIdsFromError(err: unknown): number[] {
  if (err instanceof ApiError && err.body && typeof err.body === 'object' && 'offer_ids' in err.body) {
    const ids = (err.body as { offer_ids?: unknown }).offer_ids;
    if (Array.isArray(ids)) return ids as number[];
  }
  return [];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-BE');
}

export function AdminCompaniesPage() {
  const { role } = useAuth();

  const [companies, setCompanies] = useState<PendingCompany[]>([]);
  const [contacts, setContacts] = useState<PendingContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Par élément : message d'action (erreur ou blocage 409 avec offer_ids)
  const [companyErrors, setCompanyErrors] = useState<Record<number, { message: string; offerIds: number[] }>>({});
  const [contactErrors, setContactErrors] = useState<Record<number, { message: string; offerIds: number[] }>>({});
  const [confirmingCompanyId, setConfirmingCompanyId] = useState<number | null>(null);
  const [confirmingContactId, setConfirmingContactId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queue = await listPendingQueue();
      setCompanies(queue.companies);
      setContacts(queue.contacts);
    } catch (err) {
      setError(errorMessage(err));
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

  async function handleAcceptCompany(id: number) {
    setCompanyErrors((prev) => { const { [id]: _, ...rest } = prev; return rest; });
    try {
      await validateCompany(id);
      setCompanies((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setCompanyErrors((prev) => ({ ...prev, [id]: { message: errorMessage(err), offerIds: offerIdsFromError(err) } }));
    }
  }

  async function handleRejectCompany(id: number) {
    setCompanyErrors((prev) => { const { [id]: _, ...rest } = prev; return rest; });
    setConfirmingCompanyId(null);
    try {
      await rejectCompany(id);
      setCompanies((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setCompanyErrors((prev) => ({ ...prev, [id]: { message: errorMessage(err), offerIds: offerIdsFromError(err) } }));
    }
  }

  async function handleAcceptContact(id: number) {
    setContactErrors((prev) => { const { [id]: _, ...rest } = prev; return rest; });
    try {
      await validateContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setContactErrors((prev) => ({ ...prev, [id]: { message: errorMessage(err), offerIds: offerIdsFromError(err) } }));
    }
  }

  async function handleRejectContact(id: number) {
    setContactErrors((prev) => { const { [id]: _, ...rest } = prev; return rest; });
    setConfirmingContactId(null);
    try {
      await rejectContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setContactErrors((prev) => ({ ...prev, [id]: { message: errorMessage(err), offerIds: offerIdsFromError(err) } }));
    }
  }

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <h1 className="page-title">Administration des entreprises et contacts</h1>
          <p className="page-subtitle">Soumissions étudiantes en attente de validation.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : (
        <div className="stack-lg">
          <div id="pending-companies" className="card">
            <div className="card-header">
              <h2 className="card-title">
                Entreprises en attente <span className="badge badge-warning">{companies.length}</span>
              </h2>
            </div>
            <div className="card-body">
              {companies.length === 0 ? (
                <p className="text-muted">Aucune entreprise en attente.</p>
              ) : (
                <div className="stack">
                  {companies.map((c) => {
                    const err = companyErrors[c.id];
                    return (
                      <div key={c.id} className="card" style={{ background: 'var(--color-bg)' }}>
                        <div className="card-body">
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>
                                <Link to={`/admin/companies/${c.id}`}>{c.name}</Link>
                              </div>
                              <div className="text-muted" style={{ fontSize: '0.8125rem' }}>
                                {c.general_email}{c.address ? ` · ${c.address}` : ''}
                              </div>
                              <div className="text-muted" style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                                Proposée par {c.submitted_by_student ? `${c.submitted_by_student.first_name} ${c.submitted_by_student.last_name} (${c.submitted_by_student.email})` : 'un étudiant'}
                                {' — '}{formatDate(c.created_at)}
                              </div>
                              {c.probable_duplicates.length > 0 && (
                                <div className="alert alert-warning" style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}>
                                  Doublons probables :{' '}
                                  {c.probable_duplicates.map((d, i) => (
                                    <span key={d.id}>
                                      {i > 0 && ', '}
                                      <Link to={`/admin/companies/${d.id}`}>{d.name}</Link>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'flex-start' }}>
                              <Link to={`/admin/companies/${c.id}`} className="btn btn-secondary btn-sm">Voir / Modifier</Link>
                              <button className="btn btn-primary btn-sm" onClick={() => handleAcceptCompany(c.id)}>Accepter</button>
                              {confirmingCompanyId === c.id ? (
                                <>
                                  <button className="btn btn-secondary btn-sm" onClick={() => handleRejectCompany(c.id)}>Confirmer le refus</button>
                                  <button className="btn btn-secondary btn-sm" onClick={() => setConfirmingCompanyId(null)}>Annuler</button>
                                </>
                              ) : (
                                <button className="btn btn-secondary btn-sm" onClick={() => setConfirmingCompanyId(c.id)}>Refuser</button>
                              )}
                            </div>
                          </div>

                          {err && (
                            <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>
                              {err.message}
                              {err.offerIds.length > 0 && (
                                <div style={{ marginTop: '0.375rem' }}>
                                  Offres à réaffecter :{' '}
                                  {err.offerIds.map((offerId, i) => (
                                    <span key={offerId}>
                                      {i > 0 && ', '}
                                      <Link to={`/offers/${offerId}`}>#{offerId}</Link>
                                    </span>
                                  ))}
                                  {' '}(<Link to="/admin/offers">gérer les offres</Link>)
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
          </div>

          <div id="pending-contacts" className="card">
            <div className="card-header">
              <h2 className="card-title">
                Contacts en attente <span className="badge badge-warning">{contacts.length}</span>
              </h2>
            </div>
            <div className="card-body">
              {contacts.length === 0 ? (
                <p className="text-muted">Aucun contact en attente.</p>
              ) : (
                <div className="stack">
                  {contacts.map((c) => {
                    const err = contactErrors[c.id];
                    return (
                      <div key={c.id} className="card" style={{ background: 'var(--color-bg)' }}>
                        <div className="card-body">
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{c.first_name} {c.last_name}</div>
                              <div className="text-muted" style={{ fontSize: '0.8125rem' }}>
                                {c.email}{c.phone ? ` · ${c.phone}` : ''} — <Link to={`/admin/companies/${c.company_id}`}>{c.company_name}</Link>
                              </div>
                              <div className="text-muted" style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                                Proposé par {c.submitted_by_student ? `${c.submitted_by_student.first_name} ${c.submitted_by_student.last_name} (${c.submitted_by_student.email})` : 'un étudiant'}
                                {' — '}{formatDate(c.created_at)}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'flex-start' }}>
                              <Link to={`/admin/companies/${c.company_id}`} className="btn btn-secondary btn-sm">Voir / Modifier</Link>
                              <button className="btn btn-primary btn-sm" onClick={() => handleAcceptContact(c.id)}>Accepter</button>
                              {confirmingContactId === c.id ? (
                                <>
                                  <button className="btn btn-secondary btn-sm" onClick={() => handleRejectContact(c.id)}>Confirmer le refus</button>
                                  <button className="btn btn-secondary btn-sm" onClick={() => setConfirmingContactId(null)}>Annuler</button>
                                </>
                              ) : (
                                <button className="btn btn-secondary btn-sm" onClick={() => setConfirmingContactId(c.id)}>Refuser</button>
                              )}
                            </div>
                          </div>

                          {err && (
                            <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>
                              {err.message}
                              {err.offerIds.length > 0 && (
                                <div style={{ marginTop: '0.375rem' }}>
                                  Offres à réaffecter :{' '}
                                  {err.offerIds.map((offerId, i) => (
                                    <span key={offerId}>
                                      {i > 0 && ', '}
                                      <Link to={`/offers/${offerId}`}>#{offerId}</Link>
                                    </span>
                                  ))}
                                  {' '}(<Link to="/admin/offers">gérer les offres</Link>)
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
          </div>
        </div>
      )}
    </div>
  );
}
