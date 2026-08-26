import { useState } from 'react';
import type { OfferInput } from './offers.types';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIME_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

interface OfferFormProps {
  companyId: number;
  contactId?: number;
  initialValues?: Partial<OfferInput>;
  existingAttachmentCount?: number;
  onSubmit: (data: OfferInput & { files: File[] }) => Promise<void>;
  submitLabel: string;
}

export function OfferForm({ companyId, contactId, initialValues, existingAttachmentCount = 0, onSubmit, submitLabel }: OfferFormProps) {
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [location, setLocation] = useState(initialValues?.location ?? '');
  const [technologies, setTechnologies] = useState(initialValues?.technologies ?? '');
  const [objectives, setObjectives] = useState(initialValues?.objectives ?? '');
  const [remoteAllowed, setRemoteAllowed] = useState(initialValues?.remote_allowed ?? false);
  const [remotePercentage, setRemotePercentage] = useState<string>(
    initialValues?.remote_percentage != null ? String(initialValues.remote_percentage) : '',
  );
  const [remarks, setRemarks] = useState(initialValues?.remarks ?? '');
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const priorityContactId = contactId ?? initialValues?.priority_contact_id ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (priorityContactId == null) {
      setError('Veuillez sélectionner un contact prioritaire.');
      return;
    }

    if (remoteAllowed && remotePercentage === '') {
      setError('Veuillez saisir le pourcentage de télétravail.');
      return;
    }

    const data: OfferInput & { files: File[] } = {
      company_id: companyId,
      priority_contact_id: priorityContactId,
      contact_ids: [priorityContactId],
      description,
      location: location || undefined,
      technologies: technologies || undefined,
      objectives: objectives || undefined,
      remote_allowed: remoteAllowed,
      remote_percentage: remoteAllowed && remotePercentage !== '' ? Number(remotePercentage) : undefined,
      remarks: remarks || undefined,
      files,
    };

    setSubmitting(true);
    try {
      await onSubmit(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label className="form-label form-label-required">Description du poste</label>
        <textarea
          className="form-textarea"
          required
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez le poste, les missions…"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Lieu</label>
          <input
            className="form-input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ville, département…"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Technologies</label>
          <input
            className="form-input"
            value={technologies}
            onChange={(e) => setTechnologies(e.target.value)}
            placeholder="React, Python, SQL…"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Objectifs pédagogiques</label>
        <textarea
          className="form-textarea"
          rows={3}
          value={objectives}
          onChange={(e) => setObjectives(e.target.value)}
          placeholder="Compétences visées, livrables attendus…"
        />
      </div>

      <div className="form-group">
        <label className="form-checkbox-label">
          <input
            type="checkbox"
            checked={remoteAllowed}
            onChange={(e) => {
              setRemoteAllowed(e.target.checked);
              if (!e.target.checked) setRemotePercentage('');
            }}
          />
          Télétravail autorisé
        </label>
      </div>

      {remoteAllowed && (
        <div className="form-group">
          <label className="form-label form-label-required">Pourcentage de télétravail</label>
          <input
            className="form-input"
            type="number"
            min={0}
            max={100}
            required={remoteAllowed}
            value={remotePercentage}
            onChange={(e) => setRemotePercentage(e.target.value)}
            placeholder="Ex. 50"
            style={{ maxWidth: '8rem' }}
          />
          <span className="form-hint">Entre 0 et 100 %</span>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Remarques</label>
        <textarea
          className="form-textarea"
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Informations complémentaires…"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Pièces jointes (PDF ou DOCX, 5 Mo maximum par fichier, 10 fichiers)</label>
        <input
          type="file"
          multiple
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => {
            const selected = Array.from(e.target.files ?? []);
            const errors: string[] = [];
            const remaining = MAX_FILES - existingAttachmentCount;
            if (selected.length > remaining) {
              errors.push(`Vous pouvez encore ajouter ${Math.max(remaining, 0)} fichier(s) à cette offre.`);
            }
            const valid: File[] = [];
            selected.slice(0, Math.max(remaining, 0)).forEach((file) => {
              const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
              if (!MIME_BY_EXTENSION[extension]) {
                errors.push(`${file.name} : extension non autorisée (PDF ou DOCX uniquement).`);
              } else if (file.type !== MIME_BY_EXTENSION[extension]) {
                errors.push(`${file.name} : type MIME incohérent avec son extension.`);
              } else if (file.size > MAX_FILE_SIZE) {
                errors.push(`${file.name} : la taille dépasse 5 Mo.`);
              } else {
                valid.push(file);
              }
            });
            setFiles(valid);
            setFileErrors(errors);
            e.currentTarget.value = '';
          }}
          className="form-input"
        />
        <span className="form-hint">{files.length} fichier(s) sélectionné(s), {Math.max(MAX_FILES - existingAttachmentCount - files.length, 0)} place(s) restante(s)</span>
        {files.length > 0 && (
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
            {files.map((file, index) => (
              <li key={`${file.name}-${file.lastModified}-${index}`}>
                {file.name}{' '}
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}>
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
        {fileErrors.length > 0 && (
          <div className="alert alert-error" style={{ marginTop: '0.5rem' }}>
            <ul style={{ paddingLeft: '1.25rem' }}>{fileErrors.map((message) => <li key={message}>{message}</li>)}</ul>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Envoi…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
