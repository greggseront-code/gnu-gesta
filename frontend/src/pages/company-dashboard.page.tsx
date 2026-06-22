import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useRole } from '../context/role-context';
import { getCompany, updateCompany, addContact } from '../features/companies/companies.api';
import type { CompanyWithContacts, ContactRole } from '../features/companies/companies.types';
import { CONTACT_ROLE_LABELS } from '../features/companies/companies.types';
import { listMyCompanyOffers } from '../features/offers/offers.api';
import type { Offer } from '../features/offers/offers.types';
import { StatusBadge } from '../components/status-badge';
import { listStudents } from '../features/students/students.api';
import type { Student } from '../features/students/students.types';
import { listApplications, selectCandidate } from '../features/applications/applications.api';
import type { Application } from '../features/applications/applications.api';

const ALL_ROLES: ContactRole[] = ['maitre_de_stage', 'responsable_administratif', 'encadrant_technique'];

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export function CompanyDashboardPage() {
  const { role, entityId } = useRole();

  const [company, setCompany] = useState<CompanyWithContacts | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [studentMap, setStudentMap] = useState<Map<number, string>>(new Map());
  const [applicationsByOffer, setApplicationsByOffer] = useState<Map<number, Application[]>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roles, setRoles] = useState<ContactRole[]>([]);
  const [contactFormError, setContactFormError] = useState<string | null>(null);
  const [contactFormSuccess, setContactFormSuccess] = useState(false);

  async function loadApplications(fetchedOffers: Offer[]) {
    // The company dashboard only needs candidates for offers that can still
    // influence selection history: published offers and offers already taken.
    const relevant = fetchedOffers.filter(
      (o) => o.status === 'validee_et_visible' || o.status === 'prise',
    );
    const results = await Promise.all(
      relevant.map((o) =>
        listApplications(o.id)
          .then((apps) => ({ offerId: o.id, apps }))
          .catch(() => ({ offerId: o.id, apps: [] as Application[] })),
      ),
    );
    const map = new Map<number, Application[]>();
    results.forEach(({ offerId, apps }) => map.set(offerId, apps));
    setApplicationsByOffer(map);
  }

  async function load() {
    if (entityId == null) return;
    try {
      const [companyData, fetchedOffers, students] = await Promise.all([
        getCompany(entityId),
        listMyCompanyOffers(),
        listStudents(),
      ]);
      setCompany(companyData);
      setOffers(fetchedOffers);
      const map = new Map<number, string>();
      students.forEach((s: Student) => map.set(s.id, `${s.first_name} ${s.last_name}`));
      setStudentMap(map);
      await loadApplications(fetchedOffers);
    } catch (err) {
      setLoadError(String(err));
    }
  }

  useEffect(() => { load(); }, [entityId]);

  function startEdit() {
    if (!company) return;
    setEditName(company.name);
    setEditEmail(company.general_email);
    setEditAddress(company.address ?? '');
    setEditError(null);
    setEditSuccess(false);
    setEditing(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (entityId == null) return;
    setEditError(null);
    setEditSuccess(false);
    try {
      await updateCompany(entityId, {
        name: editName,
        general_email: editEmail,
        address: editAddress || undefined,
      });
      setEditSuccess(true);
      setEditing(false);
      const updated = await getCompany(entityId);
      setCompany(updated);
    } catch (err) {
      setEditError(String(err));
    }
  }

  function toggleRole(r: ContactRole) {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    if (entityId == null) return;
    setContactFormError(null);
    setContactFormSuccess(false);
    try {
      await addContact(entityId, {
        first_name: firstName,
        last_name: lastName,
        email: contactEmail,
        phone: phone || undefined,
        roles,
      });
      setFirstName('');
      setLastName('');
      setContactEmail('');
      setPhone('');
      setRoles([]);
      setContactFormSuccess(true);
      const updated = await getCompany(entityId);
      setCompany(updated);
    } catch (err) {
      setContactFormError(String(err));
    }
  }

  async function handleSelectCandidate(offerId: number, applicationId: number) {
    setActionError(null);
    try {
      await selectCandidate(offerId, applicationId);
      await load();
    } catch (err) {
      setActionError(String(err));
    }
  }

  if (role !== 'entreprise') {
    return <div className="alert alert-error">Accès réservé aux entreprises.</div>;
  }

  if (entityId == null) {
    return <div className="alert alert-error">Aucune entreprise associée à ce compte.</div>;
  }

  if (loadError) {
    return <div className="alert alert-error">{loadError}</div>;
  }

  if (!company) return <p className="text-muted">Chargement…</p>;

  const relevantOffers = offers.filter(
    (o) => o.status === 'validee_et_visible' || o.status === 'prise',
  );

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <h1 className="page-title">Espace entreprise</h1>
          <p className="page-subtitle">{company.name}</p>
        </div>
      </div>

      {actionError && <div className="alert alert-error">{actionError}</div>}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Profil</span>
          {!editing && (
            <button className="btn btn-secondary btn-sm" onClick={startEdit}>Modifier</button>
          )}
        </div>
        <div className="card-body">
          {editSuccess && <div className="alert alert-success">Profil mis à jour.</div>}
          {!editing ? (
            <div className="meta-list">
              <div className="meta-item">
                <span className="meta-label">Nom</span>
                <span className="meta-value">{company.name}</span>
              </div>
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
          ) : (
            <form onSubmit={handleSaveEdit} className="form">
              <div className="form-group">
                <label className="form-label form-label-required">Nom</label>
                <input
                  className="form-input"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label form-label-required">Email général</label>
                <input
                  className="form-input"
                  required
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Adresse</label>
                <input
                  className="form-input"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                />
              </div>
              {editError && <div className="alert alert-error">{editError}</div>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Enregistrer</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Annuler</button>
              </div>
            </form>
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
                <div key={c.id} className="contact-item">
                  <div className="contact-avatar">{initials(c.first_name, c.last_name)}</div>
                  <div className="contact-info">
                    <div className="contact-name">{c.first_name} {c.last_name}</div>
                    <div className="contact-detail">{c.email}{c.phone && ` · ${c.phone}`}</div>
                    <div className="contact-roles">
                      {c.roles.map((r) => (
                        <span key={r} className="badge badge-primary">{CONTACT_ROLE_LABELS[r]}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9375rem' }}>Ajouter un contact</p>
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
                  <input className="form-input" required type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
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
                    {ALL_ROLES.map((r) => (
                      <label key={r} className="form-checkbox-label">
                        <input type="checkbox" checked={roles.includes(r)} onChange={() => toggleRole(r)} />
                        {CONTACT_ROLE_LABELS[r]}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
              {contactFormSuccess && <div className="alert alert-success">Contact ajouté.</div>}
              {contactFormError && <div className="alert alert-error">{contactFormError}</div>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={roles.length === 0}>
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Mes offres</span>
          <Link to="/offers/new" className="btn btn-primary btn-sm">+ Déposer une offre</Link>
        </div>
        <div className="card-body">
          {offers.length === 0 ? (
            <p className="text-muted">Aucune offre.</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((o) => (
                    <tr key={o.id}>
                      <td>
                        {o.description.length > 120
                          ? o.description.slice(0, 120) + '…'
                          : o.description}
                      </td>
                      <td><StatusBadge status={o.status} /></td>
                      <td>
                        <Link to={`/offers/${o.id}`} className="btn btn-secondary btn-sm">Voir</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Candidatures reçues</span>
        </div>
        <div className="card-body">
          {relevantOffers.length === 0 ? (
            <p className="text-muted">Aucune offre éligible aux candidatures.</p>
          ) : (
            <div className="stack">
              {relevantOffers.map((o) => {
                const apps = applicationsByOffer.get(o.id) ?? [];
                return (
                  <div key={o.id} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {o.description.length > 80 ? o.description.slice(0, 80) + '…' : o.description}
                      </span>
                      <StatusBadge status={o.status} />
                    </div>
                    {apps.length === 0 ? (
                      <p className="text-muted" style={{ fontSize: '0.875rem' }}>Aucune candidature.</p>
                    ) : (
                      <div className="table-wrapper">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Étudiant</th>
                              <th>Date</th>
                              <th>Statut</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {apps.map((app) => (
                              <tr key={app.id}>
                                <td>{studentMap.get(app.student_id) ?? `Étudiant #${app.student_id}`}</td>
                                <td className="text-muted">
                                  {new Date(app.created_at).toLocaleDateString('fr-FR')}
                                </td>
                                <td>
                                  {app.selected === 1 ? (
                                    <span className="badge badge-success">Retenu(e)</span>
                                  ) : (
                                    <span className="badge badge-warning">En attente</span>
                                  )}
                                </td>
                                <td>
                                  {o.status === 'validee_et_visible' && app.selected === 0 && (
                                    <button
                                      className="btn btn-primary btn-sm"
                                      onClick={() => handleSelectCandidate(o.id, app.id)}
                                    >
                                      Retenir
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
