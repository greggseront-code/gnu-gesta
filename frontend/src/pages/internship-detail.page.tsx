import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import {
  confirmInternship,
  deleteInternship,
  generateConvention,
  getInternship,
  internshipDocumentUrl,
  setTerminalStatus,
  updateInternship,
  uploadSignedConvention,
} from '../features/internships/internships.api';
import {
  INTERNSHIP_STATUS_LABELS,
  type InternshipDetail,
  type InternshipStatus,
} from '../features/internships/internships.types';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function InternshipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [detail, setDetail] = useState<InternshipDetail | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contactId, setContactId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isManager = role === 'gestionnaire';
  const generated = useMemo(() => detail?.documents.find((document) => document.kind === 'generated'), [detail]);
  const signed = useMemo(() => detail?.documents.find((document) => document.kind === 'signed'), [detail]);

  function hydrate(value: InternshipDetail) {
    setDetail(value);
    setStartDate(value.start_date ?? '');
    setEndDate(value.end_date ?? '');
    setContactId(value.signing_contact_id?.toString() ?? '');
  }

  useEffect(() => {
    if (!id) return;
    getInternship(Number(id)).then(hydrate).catch((loadError) => setError(errorMessage(loadError)));
  }, [id]);

  async function run(action: () => Promise<InternshipDetail>, message: string) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      hydrate(await action());
      setSuccess(message);
    } catch (actionError) {
      setError(errorMessage(actionError));
    } finally {
      setBusy(false);
    }
  }

  if (role !== 'gestionnaire' && role !== 'lecteur') {
    return <div className="alert alert-error">Cette vue est réservée à l'équipe pédagogique.</div>;
  }
  if (!detail && error) return <div className="alert alert-error">{error}</div>;
  if (!detail) return <p className="text-muted">Chargement…</p>;

  const validContacts = detail.contacts.filter((contact) => contact.validation_status === 'validated');
  const preparationComplete = Boolean(detail.start_date && detail.end_date && detail.signing_contact_id);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    await run(() => updateInternship(detail!.id, {
      start_date: startDate,
      end_date: endDate,
      signing_contact_id: Number(contactId),
    }), 'Préparation enregistrée.');
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    await run(() => uploadSignedConvention(detail!.id, file), 'Convention signée enregistrée.');
  }

  async function handleDelete() {
    if (!window.confirm(
      `Supprimer ce dossier ? ${detail!.origin_type === 'candidature'
        ? "La candidature sera désélectionnée et l'offre redeviendra visible."
        : 'La proposition retournera à l’état soumise et restera privée.'}`,
    )) return;
    setBusy(true);
    try {
      await deleteInternship(detail!.id);
      navigate('/internships');
    } catch (deleteError) {
      setError(errorMessage(deleteError));
      setBusy(false);
    }
  }

  async function handleTerminal(status: Extract<InternshipStatus, 'termine' | 'interrompu' | 'echoue'>) {
    const label = INTERNSHIP_STATUS_LABELS[status].toLowerCase();
    if (!window.confirm(`Marquer ce stage comme ${label} ? Il cessera de bloquer l'étudiant et restera dans le suivi.`)) return;
    await run(() => setTerminalStatus(detail!.id, status), `Stage marqué comme ${label}.`);
  }

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dossier de stage</h1>
          <p className="page-subtitle"><Link to="/internships">Stages</Link> / {detail.student.first_name} {detail.student.last_name}</p>
        </div>
        <span className="badge badge-primary">{INTERNSHIP_STATUS_LABELS[detail.status]}</span>
      </div>

      {role === 'lecteur' && <div className="alert alert-info">Consultation en lecture seule.</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <div className="card-header"><span className="card-title">Stage</span></div>
        <div className="card-body"><div className="meta-list">
          <div className="meta-item"><span className="meta-label">Étudiant</span><span className="meta-value">
            {detail.student.first_name} {detail.student.last_name} · {detail.student.email}
          </span></div>
          <div className="meta-item"><span className="meta-label">Entreprise</span><span className="meta-value">
            {detail.company.name}{detail.company.address ? ` · ${detail.company.address}` : ' · adresse manquante'}
          </span></div>
          <div className="meta-item"><span className="meta-label">Origine</span><span className="meta-value">
            {detail.origin_type === 'candidature' ? 'Candidature sélectionnée' : 'Proposition étudiante'} · <Link to={`/offers/${detail.origin_offer_id}`}>voir</Link>
          </span></div>
          <div className="meta-item"><span className="meta-label">Description</span><span className="meta-value">{detail.origin_description}</span></div>
          <div className="meta-item"><span className="meta-label">Année académique</span><span className="meta-value">{detail.academic_year ?? 'Calculée après saisie des dates'}</span></div>
        </div></div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Préparation</span></div>
        <div className="card-body">
          {isManager && detail.status === 'preparation' ? (
            <form className="form" onSubmit={handleSave}>
              <div className="form-row">
                <label className="form-group"><span className="form-label form-label-required">Date de début</span>
                  <input className="form-input" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </label>
                <label className="form-group"><span className="form-label form-label-required">Date de fin</span>
                  <input className="form-input" type="date" required min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </label>
              </div>
              <label className="form-group"><span className="form-label form-label-required">Signataire de l'entreprise</span>
                <select className="form-select" required value={contactId} onChange={(event) => setContactId(event.target.value)}>
                  <option value="">Choisir un contact validé…</option>
                  {validContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.first_name} {contact.last_name} · {contact.email}</option>)}
                </select>
              </label>
              <div className="form-actions"><button className="btn btn-primary" disabled={busy}>Enregistrer</button></div>
            </form>
          ) : (
            <div className="meta-list">
              <div className="meta-item"><span className="meta-label">Dates</span><span className="meta-value">{detail.start_date ?? '—'} → {detail.end_date ?? '—'}</span></div>
              <div className="meta-item"><span className="meta-label">Signataire</span><span className="meta-value">
                {detail.signing_contact ? `${detail.signing_contact.first_name} ${detail.signing_contact.last_name}` : '—'}
              </span></div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Convention</span></div>
        <div className="card-body stack">
          {!detail.company.address && <div className="alert alert-warning">Ajoutez l'adresse de l'entreprise avant de générer la convention.</div>}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {generated && <a className="btn btn-secondary" href={internshipDocumentUrl(detail.id, 'generated')}>Télécharger la convention vierge</a>}
            {isManager && detail.status === 'preparation' && <button className="btn btn-primary" disabled={busy || !preparationComplete || !detail.company.address} onClick={() => void run(
              () => generateConvention(detail.id), generated ? 'Convention régénérée.' : 'Convention générée.',
            )}>{generated ? 'Régénérer' : 'Générer la convention'}</button>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {signed && <a className="btn btn-secondary" href={internshipDocumentUrl(detail.id, 'signed')}>Télécharger la convention signée</a>}
            {isManager && detail.status === 'preparation' && <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              {signed ? 'Remplacer la convention signée' : 'Ajouter la convention signée'}
              <input hidden type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => void handleUpload(event.target.files?.[0])} />
            </label>}
          </div>
          {isManager && detail.status === 'preparation' && <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={busy || !signed} onClick={() => void run(
            () => confirmInternship(detail.id), 'Stage confirmé.',
          )}>Confirmer le stage</button>}
        </div>
      </div>

      {isManager && (
        <div className="card"><div className="card-header"><span className="card-title">Cycle de vie</span></div><div className="card-body">
          {detail.status === 'preparation' && <button className="btn btn-danger" disabled={busy} onClick={() => void handleDelete()}>Supprimer le dossier créé par erreur</button>}
          {detail.status === 'confirme' && <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={busy} onClick={() => void handleTerminal('termine')}>Marquer terminé</button>
            <button className="btn btn-secondary" disabled={busy} onClick={() => void handleTerminal('interrompu')}>Marquer interrompu</button>
            <button className="btn btn-secondary" disabled={busy} onClick={() => void handleTerminal('echoue')}>Marquer échoué</button>
          </div>}
          {['termine', 'interrompu', 'echoue'].includes(detail.status) && <p className="text-muted">Ce dossier est conservé dans le suivi et ne bloque plus l'étudiant.</p>}
        </div></div>
      )}
    </div>
  );
}
