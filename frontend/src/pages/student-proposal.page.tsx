import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { listCompanies, getCompany, createCompany } from '../features/companies/companies.api';
import type { Company, CompanyContact, CompanyWithContacts, ContactRole } from '../features/companies/companies.types';
import { CONTACT_ROLE_LABELS } from '../features/companies/companies.types';
import { createOffer, uploadOfferAttachment } from '../features/offers/offers.api';
import type { OfferInput } from '../features/offers/offers.types';
import { OfferForm } from '../features/offers/offer-form';
import { useAuth } from '../context/auth-context';

type Step = 'search' | 'contact' | 'form';

const ALL_ROLES: ContactRole[] = ['maitre_de_stage', 'responsable_administratif', 'encadrant_technique'];

export function StudentProposalPage() {
  const { role, entityId } = useAuth();
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

  // Step 2: contact selection
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  const [formError, setFormError] = useState<string | null>(null);

  if (role !== 'etudiant') {
    return <Navigate to="/offers" replace />;
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    try {
      const results = await listCompanies(searchTerm || undefined);
      setSearchResults(results);
      setSearchDone(true);
    } catch (err) {
      setFormError(String(err));
    }
  }

  async function handleSelectCompany(company: Company) {
    try {
      const full = await getCompany(company.id);
      setSelectedCompany(full);
      if (full.contacts.length > 0) {
        setSelectedContactId(full.contacts[0].id);
      }
      setStep('contact');
    } catch (err) {
      setFormError(String(err));
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
      if (created.contacts.length > 0) {
        setSelectedContactId(created.contacts[0].id);
      }
      setStep('form');
    } catch (err) {
      setNewCompanyError(String(err));
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
            <form onSubmit={handleSearch} className="form">
              <div className="form-group">
                <label className="form-label">Nom de l'entreprise</label>
                <input
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                            <td>{c.name}</td>
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

  // ---- Render Step 2: contact selection ----
  if (step === 'contact') {
    const contacts: CompanyContact[] = selectedCompany?.contacts ?? [];

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
            <span className="card-title">Étape 2 — Choisir le contact prioritaire</span>
          </div>
          <div className="card-body">
            <p style={{ marginBottom: '1rem' }}>
              Entreprise sélectionnée : <strong>{selectedCompany?.name}</strong>
            </p>

            {contacts.length === 0 ? (
              <div className="alert alert-warning">
                Cette entreprise n'a aucun contact enregistré.
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label form-label-required">Contact prioritaire</label>
                <select
                  className="form-select"
                  value={selectedContactId ?? ''}
                  onChange={(e) => setSelectedContactId(Number(e.target.value))}
                >
                  <option value="">— Choisir —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button
                className="btn btn-primary"
                disabled={selectedContactId == null}
                onClick={() => setStep('form')}
              >
                Continuer
              </button>
              <button className="btn btn-secondary" onClick={() => setStep('search')}>
                Retour
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Render Step 3: offer form ----
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
        {selectedCompany?.contacts.find((c) => c.id === selectedContactId) && (
          <>
            {' — '}
            <strong>Contact :</strong>{' '}
            {(() => {
              const c = selectedCompany.contacts.find((x) => x.id === selectedContactId);
              return c ? `${c.first_name} ${c.last_name}` : '';
            })()}
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
