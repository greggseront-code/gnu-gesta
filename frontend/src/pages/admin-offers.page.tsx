import { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  listPedagogicalOffers,
  validateOffer,
  rejectOffer,
  markUnavailable,
  getOfferDependencies,
  reassignOffer,
} from '../features/offers/offers.api';
import type { Offer, OfferDependencyStatus } from '../features/offers/offers.types';
import { StatusBadge } from '../components/status-badge';
import { listCompanies, getCompany } from '../features/companies/companies.api';
import type { Company, CompanyContact } from '../features/companies/companies.types';
import { useAuth } from '../context/auth-context';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function AdminOffersPage() {
  const { role } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [companies, setCompanies] = useState<Map<number, string>>(new Map());
  const [dependencies, setDependencies] = useState<Map<number, OfferDependencyStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Réaffectation atomique (entreprise + contact prioritaire + contacts associés)
  const [reassigningOfferId, setReassigningOfferId] = useState<number | null>(null);
  const [companySearch, setCompanySearch] = useState('');
  const [companyResults, setCompanyResults] = useState<Company[]>([]);
  const [companySearchDone, setCompanySearchDone] = useState(false);
  const [assignmentCompany, setAssignmentCompany] = useState<Company | null>(null);
  const [assignmentContacts, setAssignmentContacts] = useState<CompanyContact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [priorityContactId, setPriorityContactId] = useState<number | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [fetchedOffers, fetchedCompanies] = await Promise.all([
        listPedagogicalOffers(),
        listCompanies(),
      ]);
      setOffers(fetchedOffers);
      const map = new Map<number, string>();
      fetchedCompanies.forEach((c) => map.set(c.id, c.name));
      setCompanies(map);

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

  async function refreshDependency(offerId: number) {
    try {
      const status = await getOfferDependencies(offerId);
      setDependencies((prev) => new Map(prev).set(offerId, status));
    } catch {
      // best effort : l'affichage des dépendances n'est qu'indicatif
    }
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

  function startReassign(offerId: number) {
    setReassigningOfferId(offerId);
    setCompanySearch('');
    setCompanyResults([]);
    setCompanySearchDone(false);
    setAssignmentCompany(null);
    setAssignmentContacts([]);
    setSelectedContactIds([]);
    setPriorityContactId(null);
    setAssignmentError(null);
  }

  function cancelReassign() {
    setReassigningOfferId(null);
  }

  async function handleCompanySearch(e: React.FormEvent) {
    e.preventDefault();
    try {
      const results = await listCompanies(companySearch || undefined);
      // Une réaffectation exige une entreprise déjà validée.
      setCompanyResults(results.filter((c) => c.validation_status === 'validated'));
      setCompanySearchDone(true);
    } catch (err) {
      setAssignmentError(errorMessage(err));
    }
  }

  async function handleSelectAssignmentCompany(c: Company) {
    setAssignmentError(null);
    try {
      const full = await getCompany(c.id);
      setAssignmentCompany(c);
      const validContacts = full.contacts.filter((contact) => contact.validation_status === 'validated');
      setAssignmentContacts(validContacts);
      setSelectedContactIds([]);
      setPriorityContactId(null);
    } catch (err) {
      setAssignmentError(errorMessage(err));
    }
  }

  function toggleAssignmentContact(contactId: number) {
    setSelectedContactIds((prev) => {
      const next = prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId];
      if (!next.includes(priorityContactId ?? -1)) {
        setPriorityContactId(next[0] ?? null);
      }
      return next;
    });
  }

  async function handleConfirmReassign(offerId: number) {
    setAssignmentError(null);
    if (!assignmentCompany || priorityContactId == null || selectedContactIds.length === 0) {
      setAssignmentError('Sélectionnez une entreprise, un contact prioritaire et au moins un contact.');
      return;
    }
    try {
      const updated = await reassignOffer(offerId, {
        company_id: assignmentCompany.id,
        priority_contact_id: priorityContactId,
        contact_ids: selectedContactIds,
      });
      setOffers((prev) => prev.map((o) => o.id === offerId ? updated : o));
      setCompanies((prev) => new Map(prev).set(assignmentCompany.id, assignmentCompany.name));
      await refreshDependency(offerId);
      setReassigningOfferId(null);
    } catch (err) {
      setAssignmentError(errorMessage(err));
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
            const companyName = companies.get(offer.company_id) ?? `Entreprise #${offer.company_id}`;
            const isReassigning = reassigningOfferId === offer.id;
            const deps = dependencies.get(offer.id);
            const hasBlockers = Boolean(deps && (deps.company_pending || deps.pending_contact_ids.length > 0));

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
                          {offer.source_type === 'student' ? 'Accepter et ouvrir le dossier' : 'Valider et publier'}
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
                    {!isReassigning ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => startReassign(offer.id)}
                      >
                        Réaffecter l'entreprise et les contacts
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={cancelReassign}
                      >
                        Annuler
                      </button>
                    )}
                  </div>

                  {isReassigning && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--color-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
                      <p style={{ marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                        Réaffecter l'entreprise et les contacts (entreprise et contacts validés uniquement)
                      </p>

                      {!assignmentCompany ? (
                        <>
                          <form onSubmit={handleCompanySearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input
                              className="search-input"
                              value={companySearch}
                              onChange={(e) => setCompanySearch(e.target.value)}
                              placeholder="Rechercher une entreprise validée…"
                              style={{ flex: 1 }}
                            />
                            <button type="submit" className="btn btn-primary btn-sm">Rechercher</button>
                          </form>

                          {companySearchDone && companyResults.length === 0 && (
                            <p className="text-muted" style={{ fontSize: '0.875rem' }}>Aucune entreprise validée trouvée.</p>
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
                                          onClick={() => handleSelectAssignmentCompany(c)}
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
                        </>
                      ) : (
                        <>
                          <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            Entreprise choisie : <strong>{assignmentCompany.name}</strong>{' '}
                            <button className="btn btn-secondary btn-sm" onClick={() => setAssignmentCompany(null)}>Changer</button>
                          </p>

                          {assignmentContacts.length === 0 ? (
                            <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                              Cette entreprise n'a aucun contact validé : validez-en un avant de réaffecter cette offre.
                            </p>
                          ) : (
                            <div className="table-wrapper">
                              <table className="table">
                                <thead>
                                  <tr>
                                    <th>Inclure</th>
                                    <th>Prioritaire</th>
                                    <th>Nom</th>
                                    <th>Email</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {assignmentContacts.map((contact) => (
                                    <tr key={contact.id}>
                                      <td>
                                        <input
                                          type="checkbox"
                                          checked={selectedContactIds.includes(contact.id)}
                                          onChange={() => toggleAssignmentContact(contact.id)}
                                        />
                                      </td>
                                      <td>
                                        <input
                                          type="radio"
                                          name={`priority-${offer.id}`}
                                          checked={priorityContactId === contact.id}
                                          disabled={!selectedContactIds.includes(contact.id)}
                                          onChange={() => setPriorityContactId(contact.id)}
                                        />
                                      </td>
                                      <td>{contact.first_name} {contact.last_name}</td>
                                      <td className="text-muted">{contact.email}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {assignmentError && <div className="alert alert-error" style={{ marginTop: '0.5rem' }}>{assignmentError}</div>}

                          <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleConfirmReassign(offer.id)}
                              disabled={selectedContactIds.length === 0 || priorityContactId == null}
                            >
                              Confirmer la réaffectation
                            </button>
                          </div>
                        </>
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
