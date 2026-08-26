import { useState } from 'react';
import { Link } from 'react-router-dom';
import { uploadOfferAttachment } from './offers.api';

export interface FailedOfferUpload {
  file: File;
  error: string;
}

export interface UploadBatchResult {
  succeeded: File[];
  failed: FailedOfferUpload[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function uploadFilesSequentially(offerId: number, files: File[]): Promise<UploadBatchResult> {
  const succeeded: File[] = [];
  const failed: FailedOfferUpload[] = [];
  for (const file of files) {
    try {
      await uploadOfferAttachment(offerId, file);
      succeeded.push(file);
    } catch (error) {
      failed.push({ file, error: errorMessage(error) });
    }
  }
  return { succeeded, failed };
}

interface OfferUploadStatusProps {
  offerId: number;
  uploadedCount: number;
  failures: FailedOfferUpload[];
  onRetry: () => Promise<void>;
  onContinue: () => void;
}

export function OfferUploadStatus({ offerId, uploadedCount, failures, onRetry, onContinue }: OfferUploadStatusProps) {
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Offre enregistrée</span></div>
      <div className="card-body">
        <div className="alert alert-warning">
          L'offre <Link to={`/offers/${offerId}`}>#{offerId}</Link> est enregistrée, mais certains fichiers n'ont pas pu être envoyés.
        </div>
        <p style={{ marginBottom: '0.75rem' }}>{uploadedCount} fichier(s) envoyé(s) avec succès.</p>
        <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem' }}>
          {failures.map(({ file, error }) => <li key={`${file.name}-${file.lastModified}`}>{file.name} : {error}</li>)}
        </ul>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={retry} disabled={retrying}>
            {retrying ? 'Nouvelle tentative…' : 'Réessayer les fichiers en erreur'}
          </button>
          <button className="btn btn-secondary" onClick={onContinue} disabled={retrying}>Continuer sans ces fichiers</button>
        </div>
      </div>
    </div>
  );
}
