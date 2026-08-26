import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { listCompanies, getCompany, createCompany, addContact } from '../features/companies/companies.api';
import type { Company, CompanyContact, CompanyWithContacts, ContactRole } from '../features/companies/companies.types';
import { CONTACT_ROLE_LABELS } from '../features/companies/companies.types';
import { createOffer, uploadOfferAttachment, listMyStudentOffers } from '../features/offers/offers.api';
import type { Offer, OfferInput } from '../features/offers/offers.types';
import { OfferForm } from '../features/offers/offer-form';
import { useAuth } from '../context/auth-context';

type Step = 'search' | 'contact' | 'form';

const ALL_ROLES: ContactRole[] = ['maitre_de_stage', 'responsable_administratif', 'encadrant_technique'];

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function PendingBadge() {
  return <span className="badge badge-warning" style={{ marginLeft: '0.375rem' }}>En attente de validation</span>;
}

export function StudentProposalPage() {
  const { role } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('search');

  // Step 1: company search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithContacts | null>(null);

  // Step 1: new company inline form
  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCFirstName, setNewCFirstName] = useState('');
  const [newCLastName, setNewCLastName] = useState('');
  const [newCEmail, setNewCEmail] = useState('');
  const [newCPhone, setNewCPhone] = useState('');
  const [newCRoles, setNewCRoles] = useState<ContactRole[]>([]);
  const [newCompanyError, setNewCompanyError] = useState<string | null>(null);

  // Step 2: contact search — la liste complète des contacts est affichée par
  // défaut (aucune recherche préalable requise, voir
  // docs/specs/2026-08-02-ajustements-ux-offres-entreprises.md).
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [contactSearchResults, setContactSearchResults] = useState<CompanyContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  // Step 2: new contact inline form
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [ncFirstName, setNcFirstName] = useState('');
  const [ncLastName, setNcLastName] = useState('');
  const [ncEmail, setNcEmail] = useState('');
  const [ncPhone, setNcPhone] = useState('');
  const [ncRoles, setNcRoles] = useState<ContactRole[]>([]);
  const [newContactError, setNewContactError] = useState<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);

  // Un etudiant ne peut avoir qu'une offre 'soumise' en attente a la fois
  // (voir docs/specs/2026-08-02-ajustements-ux-offres-entreprises.md) : ce
  // blocage doit apparaitre des le clic sur "Proposer un stage", pas
  // seulement a la toute fin du formulaire en trois etapes.
  const [pendingOffer, setPendingOffer] = useState<Offer | null | 'checking'>('checking');

  useEffect(() => {
    if (role !== 'etudiant') return;
    listMyStudentOffers()
      .then((offers) => {
        const pending = offers.find((o) => o.source_type === 'student' && o.status === 'soumise');
        setPendingOffer(pending ?? null);
      })
      .catch(() => setPendingOffer(null));
  }, [role]);

  // Guard placé après tous les hooks pour respecter les règles des hooks.
  if (role !== 'etudiant') {
    return <Navigate to="/offers" replace />;
  }

  if (pendingOffer === 'checking') {
    return <p className="text-muted">Chargement…</p>;
  }

  if (pendingOffer) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Proposer un stage</h1>
            <p className="page-subtitle"><Link to="/offers">Offres</Link> / Proposer</p>
          </div>
        </div>
        <div className="alert alert-error">
          Vous avez déjà une offre en attente de validation. Attendez sa validation avant de soumettre une nouvelle proposition.
        </div>
        <div style={{ marginTop: '1rem' }}>
          <Link to={`/offers/${pendingOffer.id}`} className="btn btn-secondary">Voir mon offre en attente</Link>
        </div>
      </div>
    );
  }

  function handleSearchTermChange(value: string) {
    setSearchTerm(value);
    // Un ancien résultat ne doit pas débloquer la création pour un nouveau terme.
    setSearchDone(false);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    try {
      const results = await listCompanies(searchTerm || undefined);
      setSearchResults(results);
      setSearchDone(true);
    } catch (err) {
      setFormError(errorMessage(err));
    }
  }

  function resetContactStep(contacts: CompanyContact[]) {
    setContactSearchTerm('');
    setContactSearchResults(contacts);
    setSelectedContactId(null);
    setShowNewContactForm(false);
    setNcFirstName(''); setNcLastName(''); setNcEmail(''); setNcPhone(''); setNcRoles([]);
    setNewContactError(null);
  }

  async function handleSelectCompany(company: Company) {
    try {
      const full = await getCompany(company.id);
      setSelectedCompany(full);
      resetContactStep(full.contacts);
      setStep('contact');
    } catch (err) {
      setFormError(errorMessage(err));
    }
  }

  function toggleNewCRole(r: ContactRole) {
    setNewCRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    setNewCompanyError(null);
    try {
      const created = await createCompany({
        name: newName,
        general_email: newEmail,
        address: newAddress || undefined,
        contacts: [{
          first_name: newCFirstName,
          last_name: newCLastName,
          email: newCEmail,
          phone: newCPhone || undefined,
          roles: newCRoles,
        }],
      });
      setSelectedCompany(created);
      // L'entreprise et son premier contact forment une même soumission :
      // l'étudiant peut l'utiliser immédiatement, sans étape de recherche de contact.
      if (created.contacts.length > 0) {
        setSelectedContactId(created.contacts[0].id);
      }
      setStep('form');
    } catch (err) {
      setNewCompanyError(errorMessage(err));
    }
  }

  function handleContactSearchTermChange(value: string) {
    setContactSearchTerm(value);
  }

  function handleContactSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = contactSearchTerm.trim().toLowerCase();
    const all = selectedCompany?.contacts ?? [];
    const results = term
      ? all.filter(
          (c) => `${c.first_name} ${c.last_name}`.toLowerCase().includes(term) || c.email.toLowerCase().includes(term),
        )
      : all;
    setContactSearchResults(results);
  }

  function handleSelectContact(contact: CompanyContact) {
    setSelectedContactId(contact.id);
    setStep('form');
  }

  function toggleNcRole(r: ContactRole) {
    setNcRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }

  async function handleCreateContact(e: React.FormEvent) {
    e.preventDefault();
    setNewContactError(null);
    if (!selectedCompany) return;
    try {
      const created = await addContact(selectedCompany.id, {
        first_name: ncFirstName,
        last_name: ncLastName,
        email: ncEmail,
        phone: ncPhone || undefined,
        roles: ncRoles,
      });
      // Immédiatement utilisable par son créateur, même en attente de validation.
      setSelectedCompany({ ...selectedCompany, contacts: [...selectedCompany.contacts, created] });
      setSelectedContactId(created.id);
      setStep('form');
    } catch (err) {
      setNewContactError(errorMessage(err));
    }
  }

  async function handleSubmitProposal(data: OfferInput & { file?: File }) {
    if (!selectedCompany) return;
    // priority_contact_id is validated upstream by OfferForm; selectedContactId is non-null here
    if (selectedContactId == null) return;
    const { file, ...offerData } = data;
    const payload: OfferInput = {
      ...offerData,
      company_id: selectedCompany.id,
      priority_contact_id: selectedContactId,
      contact_ids: [selectedContactId],
    };
    const saved = await createOffer(payload);
    if (file) {
      await uploadOfferAttachment(saved.id, file);
    }
    navigate(`/offers/${saved.id}`);
  }

  // ---- Render Step 1: company search ----
  if (step === 'search') {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Proposer un stage</h1>
            <p className="page-subtitle"><Link to="/offers">Offres</Link> / Proposer</p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header">
            <span className="card-title">Étape 1 — Rechercher l'entreprise</span>
          </div>
          <div className="card-body">
            {!searchDone && (
              <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                Vérifiez d'abord que cette entreprise n'existe pas déjà dans le répertoire, afin d'éviter un doublon.
              </div>
            )}

            <form onSubmit={handleSearch} className="form">
              <div className="form-group">
                <label className="form-label">Nom de l'entreprise</label>
                <input
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => handleSearchTermChange(e.target.value)}
                  placeholder="Rechercher une entreprise…"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Rechercher</button>
              </div>
            </form>

            {searchDone && (
              <div style={{ marginTop: '1rem' }}>
                {searchResults.length === 0 ? (
                  <p className="text-muted">Aucune entreprise trouvée.</p>
                ) : (
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
                        {searchResults.map((c) => (
                          <tr key={c.id}>
                            <td>
                              {c.name}
                              {c.validation_status === 'pending' && <PendingBadge />}
                            </td>
                            <td className="text-muted">{c.general_email}</td>
                            <td>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleSelectCompany(c)}
                              >
                                Sélectionner
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!showNewCompanyForm && (
                  <div style={{ marginTop: '1rem' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowNewCompanyForm(true)}
                    >
                      Suggérer une nouvelle entreprise
                    </button>
                  </div>
                )}
              </div>
            )}

            {formError && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{formError}</div>}
          </div>
        </div>

        {showNewCompanyForm && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Nouvelle entreprise</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreateCompany} className="form">
                <p className="form-section-title" style={{ border: 'none', paddingTop: 0, marginTop: 0 }}>
                  Informations de l'entreprise
                </p>
                <div className="form-group">
                  <label className="form-label form-label-required">Nom</label>
                  <input className="form-input" required value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label form-label-required">Email général</label>
                  <input className="form-input" required type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Adresse</label>
                  <input className="form-input" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
                </div>

                <p className="form-section-title">Premier contact</p>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label form-label-required">Prénom</label>
                    <input className="form-input" required value={newCFirstName} onChange={(e) => setNewCFirstName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label form-label-required">Nom</label>
                    <input className="form-input" required value={newCLastName} onChange={(e) => setNewCLastName(e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label form-label-required">Email</label>
                    <input className="form-input" required type="email" value={newCEmail} onChange={(e) => setNewCEmail(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Téléphone</label>
                    <input className="form-input" value={newCPhone} onChange={(e) => setNewCPhone(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <fieldset className="form-fieldset">
                    <legend>Rôles *</legend>
                    <div className="form-checkbox-group">
                      {ALL_ROLES.map((r) => (
                        <label key={r} className="form-checkbox-label">
                          <input type="checkbox" checked={newCRoles.includes(r)} onChange={() => toggleNewCRole(r)} />
                          {CONTACT_ROLE_LABELS[r]}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
                {newCompanyError && <div className="alert alert-error">{newCompanyError}</div>}
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={newCRoles.length === 0}>
                    Créer l'entreprise et continuer
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowNewCompanyForm(false)}>
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- Render Step 2: contact search & selection ----
  if (step === 'contact') {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Proposer un stage</h1>
            <p className="page-subtitle"><Link to="/offers">Offres</Link> / Proposer</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Étape 2 — Rechercher le contact</span>
          </div>
          <div className="card-body">
            <p style={{ marginBottom: '1rem' }}>
              Entreprise sélectionnée : <strong>{selectedCompany?.name}</strong>
              {selectedCompany?.validation_status === 'pending' && <PendingBadge />}
            </p>

            <form onSubmit={handleContactSearch} className="form">
              <div className="form-group">
                <label className="form-label">Nom ou email du contact</label>
                <input
                  className="search-input"
                  value={contactSearchTerm}
                  onChange={(e) => handleContactSearchTermChange(e.target.value)}
                  placeholder="Rechercher un contact…"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Rechercher</button>
              </div>
            </form>

            <div style={{ marginTop: '1rem' }}>
              {contactSearchResults.length === 0 ? (
                <p className="text-muted">Aucun contact trouvé.</p>
              ) : (
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
                      {contactSearchResults.map((c) => (
                        <tr key={c.id}>
                          <td>
                            {c.first_name} {c.last_name}
                            {c.validation_status === 'pending' && <PendingBadge />}
                          </td>
                          <td className="text-muted">{c.email}</td>
                          <td>
                            <button className="btn btn-primary btn-sm" onClick={() => handleSelectContact(c)}>
                              Sélectionner
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!showNewContactForm && (
                <div style={{ marginTop: '1rem' }}>
                  <p className="text-muted" style={{ fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                    Vérifiez que le contact ne figure pas déjà dans la liste ci-dessus avant d'en proposer un nouveau.
                  </p>
                  <button className="btn btn-secondary" onClick={() => setShowNewContactForm(true)}>
                    Proposer un nouveau contact
                  </button>
                </div>
              )}
            </div>

            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep('search')}>
                Retour
              </button>
            </div>
          </div>
        </div>

        {showNewContactForm && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-header">
              <span className="card-title">Nouveau contact</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreateContact} className="form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label form-label-required">Prénom</label>
                    <input className="form-input" required value={ncFirstName} onChange={(e) => setNcFirstName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label form-label-required">Nom</label>
                    <input className="form-input" required value={ncLastName} onChange={(e) => setNcLastName(e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label form-label-required">Email</label>
                    <input className="form-input" required type="email" value={ncEmail} onChange={(e) => setNcEmail(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Téléphone</label>
                    <input className="form-input" value={ncPhone} onChange={(e) => setNcPhone(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <fieldset className="form-fieldset">
                    <legend>Rôles *</legend>
                    <div className="form-checkbox-group">
                      {ALL_ROLES.map((r) => (
                        <label key={r} className="form-checkbox-label">
                          <input type="checkbox" checked={ncRoles.includes(r)} onChange={() => toggleNcRole(r)} />
                          {CONTACT_ROLE_LABELS[r]}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
                {newContactError && <div className="alert alert-error">{newContactError}</div>}
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={ncRoles.length === 0}>
                    Créer le contact et continuer
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowNewContactForm(false)}>
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- Render Step 3: offer form ----
  const selectedContact = selectedCompany?.contacts.find((c) => c.id === selectedContactId);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Proposer un stage</h1>
          <p className="page-subtitle"><Link to="/offers">Offres</Link> / Proposer</p>
        </div>
      </div>

      <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
        <strong>Entreprise :</strong> {selectedCompany?.name}
        {selectedCompany?.validation_status === 'pending' && <PendingBadge />}
        {selectedContact && (
          <>
            {' — '}
            <strong>Contact :</strong> {selectedContact.first_name} {selectedContact.last_name}
            {selectedContact.validation_status === 'pending' && <PendingBadge />}
          </>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Étape 3 — Détails de la proposition</span>
        </div>
        <div className="card-body">
          <OfferForm
            companyId={selectedCompany?.id ?? 0}
            contactId={selectedContactId ?? undefined}
            onSubmit={handleSubmitProposal}
            submitLabel="Soumettre la proposition"
          />
        </div>
      </div>
    </div>
  );
}
