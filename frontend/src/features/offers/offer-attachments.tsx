import { useCallback, useEffect, useState } from 'react';
import {
  deleteOfferAttachment,
  getOfferAttachmentUrl,
  listOfferAttachments,
} from './offers.api';
import type { Offer, OfferAttachment } from './offers.types';
import { uploadFilesSequentially } from './offer-upload-status';
import type { EffectiveRole } from '../auth/auth.types';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIME_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

interface OfferAttachmentsProps {
  offer: Offer;
  role: EffectiveRole | null;
  entityId: number | null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function canManageAttachments(offer: Offer, role: EffectiveRole | null, entityId: number | null): boolean {
  return role === 'gestionnaire'
    || (role === 'entreprise' && offer.company_id === entityId)
    || (role === 'etudiant' && offer.submitted_by_student_id === entityId);
}

function formatSize(size: number): string {
  return `${(size / (1024 * 1024)).toFixed(size >= 1024 * 1024 ? 1 : 2)} Mo`;
}

export function OfferAttachments({ offer, role, entityId }: OfferAttachmentsProps) {
  const [attachments, setAttachments] = useState<OfferAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const canManage = canManageAttachments(offer, role, entityId);

  const load = useCallback(async () => {
    try {
      setError(null);
      setAttachments((await listOfferAttachments(offer.id)) ?? []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [offer.id]);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.currentTarget.value = '';
    if (files.length === 0) return;
    setUploadErrors([]);
    const errors: string[] = [];
    const remaining = MAX_FILES - attachments.length;
    if (files.length > remaining) errors.push(`Il ne reste que ${Math.max(remaining, 0)} place(s) pour cette offre.`);
    const valid = files.slice(0, Math.max(remaining, 0)).filter((file) => {
      const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
      if (!MIME_BY_EXTENSION[extension]) {
        errors.push(`${file.name} : extension non autorisée.`);
        return false;
      }
      if (file.type !== MIME_BY_EXTENSION[extension]) {
        errors.push(`${file.name} : type MIME incohérent avec l'extension.`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} : la taille dépasse 5 Mo.`);
        return false;
      }
      return true;
    });
    if (errors.length > 0) setUploadErrors(errors);
    if (valid.length === 0) return;

    setBusy(true);
    try {
      const result = await uploadFilesSequentially(offer.id, valid);
      if (result.failed.length > 0) setUploadErrors((current) => [
        ...current,
        ...result.failed.map(({ file, error }) => `${file.name} : ${error}`),
      ]);
      await load();
    } catch (err) {
      setUploadErrors((current) => [...current, errorMessage(err)]);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(attachment: OfferAttachment) {
    if (!window.confirm(`Supprimer ${attachment.storage_name} ?`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteOfferAttachment(offer.id, attachment.id);
      setAttachments((current) => current.filter((item) => item.id !== attachment.id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Pièces jointes</span></div>
      <div className="card-body">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? <p className="text-muted">Chargement…</p> : attachments.length === 0 ? (
          <p className="text-muted">Aucune pièce jointe.</p>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {attachments.map((attachment) => (
              <li key={attachment.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <span>
                  <strong>{attachment.storage_name}</strong>{' '}
                  <span className="text-muted">({formatSize(attachment.size_bytes)})</span>
                </span>
                <span style={{ display: 'flex', gap: '0.5rem' }}>
                  <a className="btn btn-secondary btn-sm" href={getOfferAttachmentUrl(offer.id, attachment.id)} download>
                    Télécharger
                  </a>
                  {canManage && (
                    <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(attachment)} disabled={busy}>
                      Supprimer
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {canManage && (
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Ajouter des fichiers (PDF ou DOCX, 5 Mo maximum, {MAX_FILES} au total)</label>
            <input
              type="file"
              multiple
              disabled={busy || attachments.length >= MAX_FILES}
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleUpload}
              className="form-input"
            />
            {uploadErrors.length > 0 && (
              <div className="alert alert-error" style={{ marginTop: '0.5rem' }}>
                <ul style={{ paddingLeft: '1.25rem' }}>{uploadErrors.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
