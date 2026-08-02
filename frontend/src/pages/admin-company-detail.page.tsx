import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getCompany,
  addContact,
  updateCompany,
  validateCompany,
  rejectCompany,
  validateContact,
  updateContact,
  rejectContact,
} from '../features/companies/companies.api';
import type { CompanyContact, CompanyWithContacts, ContactRole } from '../features/companies/companies.types';
import { CONTACT_ROLE_LABELS } from '../features/companies/companies.types';
import { ApiError } from '../lib/api-client';
import { useAuth } from '../context/auth-context';

const ALL_ROLES: ContactRole[] = ['maitre_de_stage', 'responsable_administratif', 'encadrant_technique'];

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

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export function AdminCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isManager = role === 'gestionnaire';

  const [company, setCompany] = useState<CompanyWithContacts | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roles, setRoles] = useState<ContactRole[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // Édition gestionnaire de l'entreprise
  const [editingCompany, setEditingCompany] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Actions de modération (entreprise + par contact)
  const [companyActionError, setCompanyActionError] = useState<{ message: string; offerIds: number[] } | null>(null);
  const [contactActionErrors, setContactActionErrors] = useState<Record<number, { message: string; offerIds: number[] }>>({});
  const [confirmingRejectCompany, setConfirmingRejectCompany] = useState(false);
  const [confirmingRejectContactId, setConfirmingRejectContactId] = useState<number | null>(null);
  const [editingContactId, setEditingContactId] = useState<number | null>(null);
  const [ceFirstName, setCeFirstName] = useState('');
  const [ceLastName, setCeLastName] = useState('');
  const [ceEmail, setCeEmail] = useState('');
  const [cePhone, setCePhone] = useState('');
  const [ceRoles, setCeRoles] = useState<ContactRole[]>([]);
  const [ceError, setCeError] = useState<string | null>(null);

  function load() {
    if (id) getCompany(Number(id)).then((c) => {
      setCompany(c);
      setEditName(c.name);
      setEditEmail(c.general_email);
      setEditAddress(c.address ?? '');
    }).catch(console.error);
  }

  useEffect(() => { load(); }, [id]);

  function toggleRole(role: ContactRole) {
    setRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]);
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);
    try {
      await addContact(Number(id), { first_name: firstName, last_name: lastName, email, phone: phone || undefined, roles });
      setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setRoles([]);
      setFormSuccess(true);
      load();
    } catch (err) {
      setFormError(errorMessage(err));
    }
  }

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    try {
      await updateCompany(Number(id), { name: editName, general_email: editEmail, address: editAddress || undefined });
      setEditingCompany(false);
      load();
    } catch (err) {
      setEditError(errorMessage(err));
    }
  }

  async function handleAcceptCompany() {
    setCompanyActionError(null);
    try {
      await validateCompany(Number(id));
      load();
    } catch (err) {
      setCompanyActionError({ message: errorMessage(err), offerIds: offerIdsFromError(err) });
    }
  }

  async function handleRejectCompany() {
    setCompanyActionError(null);
    setConfirmingRejectCompany(false);
    try {
      await rejectCompany(Number(id));
      navigate('/admin/companies');
    } catch (err) {
      setCompanyActionError({ message: errorMessage(err), offerIds: offerIdsFromError(err) });
    }
  }

  async function handleAcceptContact(contactId: number) {
    setContactActionErrors((prev) => { const { [contactId]: _, ...rest } = prev; return rest; });
    try {
      await validateContact(contactId);
      load();
    } catch (err) {
      setContactActionErrors((prev) => ({ ...prev, [contactId]: { message: errorMessage(err), offerIds: offerIdsFromError(err) } }));
    }
  }

  async function handleRejectContact(contactId: number) {
    setContactActionErrors((prev) => { const { [contactId]: _, ...rest } = prev; return rest; });
    setConfirmingRejectContactId(null);
    try {
      await rejectContact(contactId);
      load();
    } catch (err) {
      setContactActionErrors((prev) => ({ ...prev, [contactId]: { message: errorMessage(err), offerIds: offerIdsFromError(err) } }));
    }
  }

  function startEditContact(c: CompanyContact) {
    setEditingContactId(c.id);
    setCeFirstName(c.first_name);
    setCeLastName(c.last_name);
    setCeEmail(c.email);
    setCePhone(c.phone ?? '');
    setCeRoles(c.roles);
    setCeError(null);
  }

  function toggleCeRole(r: ContactRole) {
    setCeRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }

  async function handleSaveContact(e: React.FormEvent, contactId: number) {
    e.preventDefault();
    setCeError(null);
    try {
      await updateContact(contactId, { first_name: ceFirstName, last_name: ceLastName, email: ceEmail, phone: cePhone || undefined, roles: ceRoles });
      setEditingContactId(null);
      load();
    } catch (err) {
      setCeError(errorMessage(err));
    }
  }

  if (!company) return <p className="text-muted">Chargement…</p>;

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {company.name}
            {company.validation_status === 'pending' && (
              <span className="badge badge-warning" style={{ marginLeft: '0.5rem' }}>En attente de validation</span>
            )}
          </h1>
          <p className="page-subtitle"><Link to="/companies">Entreprises</Link> / {company.name}</p>
        </div>
        {isManager && company.validation_status === 'pending' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary btn-sm" onClick={handleAcceptCompany}>Accepter l'entreprise</button>
            {confirmingRejectCompany ? (
              <>
                <button className="btn btn-secondary btn-sm" onClick={handleRejectCompany}>Confirmer le refus</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setConfirmingRejectCompany(false)}>Annuler</button>
              </>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirmingRejectCompany(true)}>Refuser</button>
            )}
          </div>
        )}
      </div>

      {companyActionError && (
        <div className="alert alert-error">
          {companyActionError.message}
          {companyActionError.offerIds.length > 0 && (
            <div style={{ marginTop: '0.375rem' }}>
              Offres à réaffecter :{' '}
              {companyActionError.offerIds.map((offerId, i) => (
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

      {company.probable_duplicates && company.probable_duplicates.length > 0 && (
        <div className="alert alert-warning">
          <strong>Doublons probables :</strong>
          <ul>
            {company.probable_duplicates.map((d) => (
              <li key={d.id}><Link to={`/admin/companies/${d.id}`}>{d.name}</Link></li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Informations</span>
          {isManager && !editingCompany && (
            <button className="btn btn-secondary btn-sm" onClick={() => setEditingCompany(true)}>Modifier</button>
          )}
        </div>
        <div className="card-body">
          {editingCompany ? (
            <form onSubmit={handleSaveCompany} className="form">
              <div className="form-group">
                <label className="form-label form-label-required">Nom</label>
                <input className="form-input" required value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label form-label-required">Email général</label>
                <input className="form-input" required type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Adresse</label>
                <input className="form-input" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
              </div>
              {editError && <div className="alert alert-error">{editError}</div>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Enregistrer</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingCompany(false)}>Annuler</button>
              </div>
            </form>
          ) : (
            <div className="meta-list">
              <div className="meta-item">
                <span className="meta-label">Email général</span>
                <span className="meta-value">{company.general_email}</span>
              </div>
              {company.address && (
                <div className="meta-item">
                  <span className="meta-label">Adresse</span>
                  <span className="meta-value">{company.address}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Contacts ({company.contacts.length})</span>
        </div>
        <div className="card-body">
          {company.contacts.length === 0 ? (
            <p className="text-muted">Aucun contact enregistré.</p>
          ) : (
            <div className="contact-list">
              {company.contacts.map((c) => (
                <div key={c.id} className="contact-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', gap: '0.875rem' }}>
                    <div className="contact-avatar">{initials(c.first_name, c.last_name)}</div>
                    <div className="contact-info" style={{ flex: 1 }}>
                      <div className="contact-name">
                        {c.first_name} {c.last_name}
                        {c.validation_status === 'pending' && (
                          <span className="badge badge-warning" style={{ marginLeft: '0.375rem' }}>En attente</span>
                        )}
                      </div>
                      <div className="contact-detail">{c.email}{c.phone && ` · ${c.phone}`}</div>
                      <div className="contact-roles">
                        {c.roles.map((r) => (
                          <span key={r} className="badge badge-primary">{CONTACT_ROLE_LABELS[r]}</span>
                        ))}
                      </div>
                    </div>
                    {isManager && (
                      <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0, alignItems: 'flex-start' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => startEditContact(c)}>Modifier</button>
                        {c.validation_status === 'pending' && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => handleAcceptContact(c.id)}>Accepter</button>
                            {confirmingRejectContactId === c.id ? (
                              <>
                                <button className="btn btn-secondary btn-sm" onClick={() => handleRejectContact(c.id)}>Confirmer</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => setConfirmingRejectContactId(null)}>Annuler</button>
                              </>
                            ) : (
                              <button className="btn btn-secondary btn-sm" onClick={() => setConfirmingRejectContactId(c.id)}>Refuser</button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {contactActionErrors[c.id] && (
                    <div className="alert alert-error" style={{ marginTop: '0.5rem' }}>
                      {contactActionErrors[c.id].message}
                      {contactActionErrors[c.id].offerIds.length > 0 && (
                        <div style={{ marginTop: '0.375rem' }}>
                          Offres à réaffecter :{' '}
                          {contactActionErrors[c.id].offerIds.map((offerId, i) => (
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

                  {editingContactId === c.id && (
                    <form onSubmit={(e) => handleSaveContact(e, c.id)} className="form" style={{ marginTop: '0.75rem' }}>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label form-label-required">Prénom</label>
                          <input className="form-input" required value={ceFirstName} onChange={(e) => setCeFirstName(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label form-label-required">Nom</label>
                          <input className="form-input" required value={ceLastName} onChange={(e) => setCeLastName(e.target.value)} />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label form-label-required">Email</label>
                          <input className="form-input" required type="email" value={ceEmail} onChange={(e) => setCeEmail(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Téléphone</label>
                          <input className="form-input" value={cePhone} onChange={(e) => setCePhone(e.target.value)} />
                        </div>
                      </div>
                      <div className="form-group">
                        <fieldset className="form-fieldset">
                          <legend>Rôles *</legend>
                          <div className="form-checkbox-group">
                            {ALL_ROLES.map((r) => (
                              <label key={r} className="form-checkbox-label">
                                <input type="checkbox" checked={ceRoles.includes(r)} onChange={() => toggleCeRole(r)} />
                                {CONTACT_ROLE_LABELS[r]}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      </div>
                      {ceError && <div className="alert alert-error">{ceError}</div>}
                      <div className="form-actions">
                        <button type="submit" className="btn btn-primary btn-sm" disabled={ceRoles.length === 0}>Enregistrer</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingContactId(null)}>Annuler</button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Ajouter un contact</span>
        </div>
        <div className="card-body">
          <form onSubmit={handleAddContact} className="form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label form-label-required">Prénom</label>
                <input className="form-input" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label form-label-required">Nom</label>
                <input className="form-input" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label form-label-required">Email</label>
                <input className="form-input" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <fieldset className="form-fieldset">
                <legend>Rôles *</legend>
                <div className="form-checkbox-group">
                  {ALL_ROLES.map((role) => (
                    <label key={role} className="form-checkbox-label">
                      <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)} />
                      {CONTACT_ROLE_LABELS[role]}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            {formSuccess && <div className="alert alert-success">Contact ajouté avec succès.</div>}
            {formError && <div className="alert alert-error">{formError}</div>}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={roles.length === 0}>
                Ajouter le contact
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
