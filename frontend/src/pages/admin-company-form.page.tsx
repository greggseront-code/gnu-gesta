import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createCompany } from '../features/companies/companies.api';
import type { Company, ContactRole } from '../features/companies/companies.types';
import { CONTACT_ROLE_LABELS } from '../features/companies/companies.types';

const ALL_ROLES: ContactRole[] = ['maitre_de_stage', 'responsable_administratif', 'encadrant_technique'];

export function AdminCompanyFormPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const [cFirstName, setCFirstName] = useState('');
  const [cLastName, setCLastName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cRoles, setCRoles] = useState<ContactRole[]>([]);

  const [duplicates, setDuplicates] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggleRole(role: ContactRole) {
    setCRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDuplicates([]);

    try {
      const result = await createCompany({
        name,
        general_email: email,
        address: address || undefined,
        contacts: [{ first_name: cFirstName, last_name: cLastName, email: cEmail, phone: cPhone || undefined, roles: cRoles }],
      });
      if (result.probable_duplicates && result.probable_duplicates.length > 0) {
        setDuplicates(result.probable_duplicates);
      }
      navigate(`/admin/companies/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nouvelle entreprise</h1>
          <p className="page-subtitle"><Link to="/companies">Entreprises</Link> / Nouvelle</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="form">
            <p className="form-section-title" style={{ border: 'none', paddingTop: 0, marginTop: 0 }}>Informations de l'entreprise</p>

            <div className="form-group">
              <label className="form-label form-label-required">Nom</label>
              <input className="form-input" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">Email général</label>
              <input className="form-input" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Adresse</label>
              <input className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            <p className="form-section-title">Premier contact</p>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label form-label-required">Prénom</label>
                <input className="form-input" required value={cFirstName} onChange={(e) => setCFirstName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label form-label-required">Nom</label>
                <input className="form-input" required value={cLastName} onChange={(e) => setCLastName(e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label form-label-required">Email</label>
                <input className="form-input" required type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input className="form-input" value={cPhone} onChange={(e) => setCPhone(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <fieldset className="form-fieldset">
                <legend>Rôles *</legend>
                <div className="form-checkbox-group">
                  {ALL_ROLES.map((role) => (
                    <label key={role} className="form-checkbox-label">
                      <input type="checkbox" checked={cRoles.includes(role)} onChange={() => toggleRole(role)} />
                      {CONTACT_ROLE_LABELS[role]}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            {duplicates.length > 0 && (
              <div className="alert alert-warning">
                <strong>Doublons probables détectés :</strong>
                <ul>{duplicates.map((d) => <li key={d.id}>{d.name}</li>)}</ul>
                <p style={{ marginTop: '0.375rem' }}>L'entreprise a quand même été créée. Vérifiez si une fusion est nécessaire.</p>
              </div>
            )}

            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={cRoles.length === 0}>
                Créer l'entreprise
              </button>
              <Link to="/companies" className="btn btn-secondary">Annuler</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
