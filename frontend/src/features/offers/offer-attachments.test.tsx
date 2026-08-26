import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfferAttachments } from './offer-attachments';
import * as offersApi from './offers.api';
import type { Offer } from './offers.types';

vi.mock('./offers.api', () => ({
  listOfferAttachments: vi.fn(),
  deleteOfferAttachment: vi.fn(),
  uploadOfferAttachment: vi.fn(),
  getOfferAttachmentUrl: (offerId: number, attachmentId: number) => `/api/offers/${offerId}/attachments/${attachmentId}`,
}));

const offer: Offer = {
  id: 7,
  company_id: 3,
  priority_contact_id: 4,
  description: 'Stage test',
  location: null,
  technologies: null,
  objectives: null,
  remote_allowed: 0,
  remote_percentage: null,
  remarks: null,
  status: 'validee_et_visible',
  submitted_by_student_id: null,
  created_by_company_id: 3,
  source_type: 'company',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const attachment = {
  id: 12,
  offer_id: 7,
  storage_name: 'technical-file.pdf',
  mime_type: 'application/pdf' as const,
  size_bytes: 1024,
  created_at: '2026-01-01',
};

beforeEach(() => {
  vi.mocked(offersApi.listOfferAttachments).mockResolvedValue([attachment]);
  vi.mocked(offersApi.deleteOfferAttachment).mockResolvedValue(undefined);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => vi.restoreAllMocks());

test('affiche les documents et ne propose aucune mutation en lecture seule', async () => {
  render(<OfferAttachments offer={offer} role="lecteur" entityId={null} />);
  expect(await screen.findByText('technical-file.pdf')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Télécharger' })).toHaveAttribute('href', '/api/offers/7/attachments/12');
  expect(screen.queryByRole('button', { name: 'Supprimer' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Ajouter des fichiers/)).not.toBeInTheDocument();
});

test('supprime une ligne après confirmation et succès API', async () => {
  const user = userEvent.setup();
  render(<OfferAttachments offer={offer} role="gestionnaire" entityId={null} />);
  await screen.findByText('technical-file.pdf');
  await user.click(screen.getByRole('button', { name: 'Supprimer' }));
  await waitFor(() => expect(offersApi.deleteOfferAttachment).toHaveBeenCalledWith(7, 12));
  expect(screen.queryByText('technical-file.pdf')).not.toBeInTheDocument();
});
