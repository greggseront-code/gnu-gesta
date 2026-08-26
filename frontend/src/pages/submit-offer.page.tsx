import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { getCompany } from '../features/companies/companies.api';
import type { CompanyContact } from '../features/companies/companies.types';
import { createOffer, updateOffer, getOffer, listOfferAttachments } from '../features/offers/offers.api';
import type { Offer, OfferInput } from '../features/offers/offers.types';
import { OfferForm } from '../features/offers/offer-form';
import { OfferUploadStatus, uploadFilesSequentially, type FailedOfferUpload } from '../features/offers/offer-upload-status';
import { useAuth } from '../context/auth-context';

export function SubmitOfferPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { role, entityId } = useAuth();
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [existingOffer, setExistingOffer] = useState<Offer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [existingAttachmentCount, setExistingAttachmentCount] = useState(0);
  const [partialUploads, setPartialUploads] = useState<{ offerId: number; uploadedCount: number; failures: FailedOfferUpload[] } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        if (isEdit && id) {
          const offer = await getOffer(Number(id));
          setExistingOffer(offer);
          setSelectedContactId(offer.priority_contact_id);
          const attachments = await listOfferAttachments(offer.id);
          setExistingAttachmentCount(attachments?.length ?? 0);
          // Load contacts for the offer's company
          const company = await getCompany(offer.company_id);
          setContacts(company.contacts);
        } else if (role === 'entreprise' && entityId != null) {
          const company = await getCompany(entityId);
          setContacts(company.contacts);
          if (company.contacts.length > 0) {
            setSelectedContactId(company.contacts[0].id);
          }
        }
      } catch (err) {
        setLoadError(String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isEdit, role, entityId]);

  // Only entreprise can create; gestionnaire can also edit
  // Guard placed after all hooks to satisfy Rules of Hooks
  if (!isEdit && role !== 'entreprise') {
    return <Navigate to="/offers" replace />;
  }

  const companyId = isEdit
    ? (existingOffer?.company_id ?? entityId ?? 0)
    : (entityId ?? 0);

  async function handleSubmit(data: OfferInput & { files: File[] }) {
    const { files, ...offerData } = data;
    const finalData = { ...offerData };

    let savedOffer: Offer;
    if (isEdit && id) {
      savedOffer = await updateOffer(Number(id), finalData);
    } else {
      savedOffer = await createOffer(finalData);
    }

    if (files.length > 0) {
      const result = await uploadFilesSequentially(savedOffer.id, files);
      if (result.failed.length > 0) {
        setPartialUploads({ offerId: savedOffer.id, uploadedCount: result.succeeded.length, failures: result.failed });
        return;
      }
    }

    navigate(`/offers/${savedOffer.id}`);
  }

  async function retryFailedUploads() {
    if (!partialUploads) return;
    const result = await uploadFilesSequentially(partialUploads.offerId, partialUploads.failures.map(({ file }) => file));
    if (result.failed.length > 0) {
      setPartialUploads({
        offerId: partialUploads.offerId,
        uploadedCount: partialUploads.uploadedCount + result.succeeded.length,
        failures: result.failed,
      });
      return;
    }
    navigate(`/offers/${partialUploads.offerId}`);
  }

  if (loading) return <p className="text-muted">Chargement…</p>;
  if (loadError) return <div className="alert alert-error">{loadError}</div>;

  const resolvedCompanyId = isEdit ? (existingOffer?.company_id ?? 0) : (entityId ?? 0);

  const initialValues: Partial<OfferInput> | undefined = existingOffer
    ? {
        company_id: existingOffer.company_id,
        ...(existingOffer.priority_contact_id != null && { priority_contact_id: existingOffer.priority_contact_id }),
        description: existingOffer.description,
        location: existingOffer.location ?? undefined,
        technologies: existingOffer.technologies ?? undefined,
        objectives: existingOffer.objectives ?? undefined,
        remote_allowed: Boolean(existingOffer.remote_allowed),
        remote_percentage: existingOffer.remote_percentage ?? undefined,
        remarks: existingOffer.remarks ?? undefined,
      }
    : undefined;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? "Modifier l'offre" : 'Déposer une offre'}</h1>
          <p className="page-subtitle">
            <Link to="/offers">Offres</Link>{isEdit ? ` / #${id} / Modifier` : ' / Nouvelle'}
          </p>
        </div>
      </div>

      {contacts.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header">
            <span className="card-title">Contact prioritaire</span>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label form-label-required">Sélectionner un contact</label>
              <select
                className="form-select"
                value={selectedContactId ?? ''}
                onChange={(e) => setSelectedContactId(Number(e.target.value))}
              >
                <option value="">— Choisir un contact —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({c.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {partialUploads ? (
            <OfferUploadStatus
              offerId={partialUploads.offerId}
              uploadedCount={partialUploads.uploadedCount}
              failures={partialUploads.failures}
              onRetry={retryFailedUploads}
              onContinue={() => navigate(`/offers/${partialUploads.offerId}`)}
            />
          ) : (
            <OfferForm
              companyId={resolvedCompanyId}
              contactId={selectedContactId ?? undefined}
              initialValues={initialValues}
              existingAttachmentCount={existingAttachmentCount}
              onSubmit={handleSubmit}
              submitLabel={isEdit ? "Enregistrer les modifications" : "Soumettre l'offre"}
            />
          )}
        </div>
      </div>
    </div>
  );
}
