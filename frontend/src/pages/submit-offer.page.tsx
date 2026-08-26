import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { getCompany, listCompanies } from '../features/companies/companies.api';
import type { Company, CompanyContact } from '../features/companies/companies.types';
import { createOffer, updateOffer, getOffer, uploadOfferAttachment, reassignOffer } from '../features/offers/offers.api';
import type { Offer, OfferInput } from '../features/offers/offers.types';
import { OfferForm } from '../features/offers/offer-form';
import { useAuth } from '../context/auth-context';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function SubmitOfferPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { role, entityId } = useAuth();
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [existingOffer, setExistingOffer] = useState<Offer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Réaffectation entreprise/contacts (gestionnaire, en édition uniquement).
  // Déplacé depuis admin-offers.page.tsx : la correction d'une offre se fait
  // désormais uniquement depuis son écran d'édition (voir
  // docs/specs/2026-08-02-ajustements-ux-offres-entreprises.md).
  const [companySearch, setCompanySearch] = useState('');
  const [companyResults, setCompanyResults] = useState<Company[]>([]);
  const [companySearchDone, setCompanySearchDone] = useState(false);
  const [assignmentCompany, setAssignmentCompany] = useState<Company | null>(null);
  const [assignmentContacts, setAssignmentContacts] = useState<CompanyContact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [priorityContactId, setPriorityContactId] = useState<number | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [reassignSuccess, setReassignSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        if (isEdit && id) {
          const offer = await getOffer(Number(id));
          setExistingOffer(offer);
          setSelectedContactId(offer.priority_contact_id);
          // Load contacts for the offer's company
          const company = await getCompany(offer.company_id);
          setContacts(company.contacts);
        } else if (role === 'entreprise' && entityId != null) {
          const company = await getCompany(entityId);
          setContacts(company.contacts);
          if (company.contacts.length > 0) {
            setSelectedContactId(company.contacts[0].id);
          }
        }
      } catch (err) {
        setLoadError(String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isEdit, role, entityId]);

  // Only entreprise can create; gestionnaire can also edit
  // Guard placed after all hooks to satisfy Rules of Hooks
  if (!isEdit && role !== 'entreprise') {
    return <Navigate to="/offers" replace />;
  }

  const companyId = isEdit
    ? (existingOffer?.company_id ?? entityId ?? 0)
    : (entityId ?? 0);

  async function handleSubmit(data: OfferInput & { file?: File }) {
    const { file, ...offerData } = data;
    const finalData = { ...offerData };

    let savedOffer: Offer;
    if (isEdit && id) {
      savedOffer = await updateOffer(Number(id), finalData);
    } else {
      savedOffer = await createOffer(finalData);
    }

    if (file) {
      await uploadOfferAttachment(savedOffer.id, file);
    }

    navigate(`/offers/${savedOffer.id}`);
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
    setReassignSuccess(false);
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
      const next = prev.includes(contactId) ? prev.filter((cid) => cid !== contactId) : [...prev, contactId];
      if (!next.includes(priorityContactId ?? -1)) {
        setPriorityContactId(next[0] ?? null);
      }
      return next;
    });
  }

  async function handleConfirmReassign() {
    setAssignmentError(null);
    if (!id || !assignmentCompany || priorityContactId == null || selectedContactIds.length === 0) {
      setAssignmentError('Sélectionnez une entreprise, un contact prioritaire et au moins un contact.');
      return;
    }
    try {
      const updated = await reassignOffer(Number(id), {
        company_id: assignmentCompany.id,
        priority_contact_id: priorityContactId,
        contact_ids: selectedContactIds,
      });
      setExistingOffer(updated);
      const full = await getCompany(assignmentCompany.id);
      setContacts(full.contacts);
      setSelectedContactId(updated.priority_contact_id);
      setCompanySearch('');
      setCompanyResults([]);
      setCompanySearchDone(false);
      setAssignmentCompany(null);
      setAssignmentContacts([]);
      setSelectedContactIds([]);
      setPriorityContactId(null);
      setReassignSuccess(true);
    } catch (err) {
      setAssignmentError(errorMessage(err));
    }
  }

  if (loading) return <p className="text-muted">Chargement…</p>;
  if (loadError) return <div className="alert alert-error">{loadError}</div>;

  const resolvedCompanyId = isEdit ? (existingOffer?.company_id ?? 0) : (entityId ?? 0);
  const canReassign = isEdit && role === 'gestionnaire' && existingOffer != null;

  const initialValues: Partial<OfferInput> | undefined = existingOffer
    ? {
        company_id: existingOffer.company_id,
        ...(existingOffer.priority_contact_id != null && { priority_contact_id: existingOffer.priority_contact_id }),
        description: existingOffer.description,
        location: existingOffer.location ?? undefined,
        technologies: existingOffer.technologies ?? undefined,
        objectives: existingOffer.objectives ?? undefined,
        remote_allowed: Boolean(existingOffer.remote_allowed),
        remote_percentage: existingOffer.remote_percentage ?? undefined,
        remarks: existingOffer.remarks ?? undefined,
      }
    : undefined;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? "Modifier l'offre" : 'Déposer une offre'}</h1>
          <p className="page-subtitle">
            <Link to="/offers">Offres</Link>{isEdit ? ` / #${id} / Modifier` : ' / Nouvelle'}
          </p>
        </div>
      </div>

      {contacts.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header">
            <span className="card-title">Contact prioritaire</span>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label form-label-required">Sélectionner un contact</label>
              <select
                className="form-select"
                value={selectedContactId ?? ''}
                onChange={(e) => setSelectedContactId(Number(e.target.value))}
              >
                <option value="">— Choisir un contact —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({c.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: canReassign ? '1rem' : 0 }}>
        <div className="card-body">
          <OfferForm
            companyId={resolvedCompanyId}
            contactId={selectedContactId ?? undefined}
            initialValues={initialValues}
            onSubmit={handleSubmit}
            submitLabel={isEdit ? "Enregistrer les modifications" : "Soumettre l'offre"}
          />
        </div>
      </div>

      {canReassign && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Entreprise et contacts</span>
          </div>
          <div className="card-body">
            <p style={{ marginBottom: '1rem' }}>
              Entreprise actuelle : <strong>{existingOffer?.company_name}</strong>
            </p>

            {reassignSuccess && (
              <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                Réaffectation effectuée.
              </div>
            )}

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
                                name="priority-contact"
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
                    onClick={handleConfirmReassign}
                    disabled={selectedContactIds.length === 0 || priorityContactId == null}
                  >
                    Confirmer la réaffectation
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
