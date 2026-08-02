import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { activateImpersonation } from '../features/auth/auth.api';
import { listCompanies } from '../features/companies/companies.api';
import { apiFetch } from '../lib/api-client';
import type { Company } from '../features/companies/companies.types';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

type Step = 'select' | 'student' | 'company';

/**
 * Réservée au gestionnaire (voir RequireGestionnaireBase dans app.tsx) :
 * reprend le parcours de recherche de l'ancien role-select.page.tsx, mais
 * active un mode d'incarnation côté backend au lieu de choisir un rôle local.
 */
export function ImpersonationSelectPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [step, setStep] = useState<Step>('select');
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (step === 'student') {
      setLoading(true);
      setEmpty(false);
      apiFetch<Student[]>('/students')
        .then((data) => { setStudents(data); if (data.length === 0) setEmpty(true); })
        .catch(() => { setStudents([]); setEmpty(true); })
        .finally(() => setLoading(false));
    }
    if (step === 'company') {
      setLoading(true);
      setEmpty(false);
      listCompanies()
        .then((data) => { setCompanies(data); if (data.length === 0) setEmpty(true); })
        .catch(() => { setCompanies([]); setEmpty(true); })
        .finally(() => setLoading(false));
    }
  }, [step]);

  async function activate(kind: 'student' | 'company', entityId: number) {
    setActivating(true);
    try {
      await activateImpersonation(kind, entityId);
      await refresh();
      navigate('/');
    } finally {
      setActivating(false);
    }
  }

  const filteredStudents = students.filter((s) =>
    `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="role-select-screen">
      <div className="role-select-container">
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
            gnu-gesta
          </div>
          <h1 className="role-select-title">Changer de rôle</h1>
          <p className="role-select-subtitle">
            Mode temporaire réservé au gestionnaire : votre identité de base reste disponible à tout moment.
          </p>
        </div>

        {step === 'select' && (
          <div className="role-grid">
            <button className="role-btn" onClick={() => { setSearch(''); setStep('student'); }}>
              <span className="role-btn-title">Voir comme un étudiant</span>
              <span className="role-btn-desc">Recherche de stage et suivi de candidatures.</span>
            </button>
            <button className="role-btn" onClick={() => { setSearch(''); setStep('company'); }}>
              <span className="role-btn-title">Voir comme une entreprise</span>
              <span className="role-btn-desc">Dépôt d'offres et suivi des candidats.</span>
            </button>
          </div>
        )}

        {(step === 'student' || step === 'company') && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                {step === 'student' ? 'Sélectionner un étudiant' : 'Sélectionner une entreprise'}
              </span>
              <button className="btn btn-secondary btn-sm" onClick={() => setStep('select')} disabled={activating}>
                ← Retour
              </button>
            </div>
            <div className="card-body">
              <input
                className="search-input"
                style={{ width: '100%', marginBottom: '1rem' }}
                placeholder={step === 'student' ? 'Rechercher par nom ou email…' : 'Rechercher une entreprise…'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />

              {loading && <p className="text-muted">Chargement…</p>}

              {!loading && empty && step === 'student' && (
                <p className="text-muted">Aucun étudiant importé.</p>
              )}
              {!loading && empty && step === 'company' && (
                <p className="text-muted">Aucune entreprise enregistrée.</p>
              )}

              {!loading && step === 'student' && filteredStudents.length > 0 && (
                <div className="contact-list">
                  {filteredStudents.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => activate('student', s.id)}
                      disabled={activating}
                      style={{ all: 'unset', cursor: 'pointer', width: '100%' }}
                    >
                      <div className="contact-item">
                        <div className="contact-avatar">
                          {(s.first_name[0] ?? '').toUpperCase()}{(s.last_name[0] ?? '').toUpperCase()}
                        </div>
                        <div className="contact-info">
                          <div className="contact-name">{s.first_name} {s.last_name}</div>
                          <div className="contact-detail">{s.email}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!loading && step === 'company' && filteredCompanies.length > 0 && (
                <div className="contact-list">
                  {filteredCompanies.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => activate('company', c.id)}
                      disabled={activating}
                      style={{ all: 'unset', cursor: 'pointer', width: '100%' }}
                    >
                      <div className="contact-item">
                        <div className="contact-avatar">
                          {c.name[0].toUpperCase()}
                        </div>
                        <div className="contact-info">
                          <div className="contact-name">{c.name}</div>
                          <div className="contact-detail">{c.general_email}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
