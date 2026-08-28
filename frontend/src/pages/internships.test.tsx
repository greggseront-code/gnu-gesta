import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/auth-context';
import { InternshipsPage } from './internships.page';
import { InternshipDetailPage } from './internship-detail.page';
import * as authApi from '../features/auth/auth.api';
import * as internshipsApi from '../features/internships/internships.api';
import type { InternshipDetail } from '../features/internships/internships.types';

vi.mock('../features/auth/auth.api');
vi.mock('../features/internships/internships.api');

function loginAs(role: 'gestionnaire' | 'lecteur') {
  vi.mocked(authApi.getCurrentUser).mockResolvedValue({
    name: 'Test pédagogique',
    email: 'test@vinci.be',
    baseRole: role,
    role,
    entityId: null,
    status: 'ok',
    impersonation: null,
    csrfToken: 'csrf',
  });
}

function detail(overrides: Partial<InternshipDetail> = {}): InternshipDetail {
  return {
    id: 10,
    student_id: 1,
    company_id: 2,
    origin_type: 'candidature',
    origin_offer_id: 3,
    origin_application_id: 4,
    start_date: '2026-09-15',
    end_date: '2027-01-31',
    academic_year: '2026-2027',
    signing_contact_id: 5,
    status: 'preparation',
    confirmed_at: null,
    created_at: '2026-08-26',
    updated_at: '2026-08-26',
    student: { id: 1, matricule: 'S001', first_name: 'Alice', last_name: 'Dupont', email: 'alice@example.test' },
    company: { id: 2, name: 'Acme', address: '1 rue du Test', general_email: 'contact@acme.test' },
    signing_contact: { id: 5, first_name: 'Jeanne', last_name: 'Martin', email: 'jeanne@acme.test' },
    origin_description: 'Développement logiciel',
    contacts: [{ id: 5, first_name: 'Jeanne', last_name: 'Martin', email: 'jeanne@acme.test', validation_status: 'validated' }],
    documents: [],
    ...overrides,
  };
}

function renderDetailPage() {
  return render(
    <MemoryRouter initialEntries={['/internships/10']}>
      <AuthProvider>
        <Routes><Route path="/internships/:id" element={<InternshipDetailPage />} /></Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(internshipsApi.internshipExportUrl).mockImplementation((year) => `/api/internships/export/${year}`);
  vi.mocked(internshipsApi.internshipDocumentUrl).mockImplementation((id, kind) => `/api/internships/${id}/documents/${kind}`);
});

test('la liste annuelle affiche aussi un étudiant sans stage et propose l’export au lecteur', async () => {
  loginAs('lecteur');
  vi.mocked(internshipsApi.listAcademicYears).mockResolvedValue(['2026-2027']);
  vi.mocked(internshipsApi.listAnnualInternships).mockResolvedValue([
    {
      student_id: 1, matricule: 'S001', last_name: 'Dupont', first_name: 'Alice', email: 'alice@example.test',
      has_internship: true, internship_id: 10, status: 'preparation', company_name: 'Acme',
      start_date: '2026-09-15', end_date: '2027-01-31', signing_contact_name: 'Jeanne Martin',
    },
    {
      student_id: 2, matricule: 'S002', last_name: 'Durand', first_name: 'Bob', email: 'bob@example.test',
      has_internship: false, internship_id: null, status: null, company_name: null,
      start_date: null, end_date: null, signing_contact_name: null,
    },
  ]);

  render(<MemoryRouter><AuthProvider><InternshipsPage /></AuthProvider></MemoryRouter>);

  expect(await screen.findByText('Dupont Alice')).toBeInTheDocument();
  expect(screen.getByText('Durand Bob')).toBeInTheDocument();
  expect(screen.getByText('Sans stage')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Exporter en Excel' })).toHaveAttribute('href', '/api/internships/export/2026-2027');
  expect(screen.queryByRole('link', { name: 'Importer des éligibles' })).not.toBeInTheDocument();
});

test('le lecteur ouvre un dossier en lecture seule et télécharge les documents', async () => {
  loginAs('lecteur');
  vi.mocked(internshipsApi.getInternship).mockResolvedValue(detail({
    documents: [{
      id: 1, internship_id: 10, kind: 'generated', original_name: 'convention.docx',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size_bytes: 100, created_at: '2026-08-26',
    }],
  }));

  renderDetailPage();

  expect(await screen.findByText('Consultation en lecture seule.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Télécharger la convention vierge' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Générer la convention' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Supprimer le dossier/ })).not.toBeInTheDocument();
});

test('le gestionnaire enregistre la préparation puis peut générer', async () => {
  loginAs('gestionnaire');
  const initial = detail({ start_date: null, end_date: null, academic_year: null, signing_contact_id: null, signing_contact: null });
  vi.mocked(internshipsApi.getInternship).mockResolvedValue(initial);
  vi.mocked(internshipsApi.updateInternship).mockResolvedValue(detail());
  vi.mocked(internshipsApi.generateConvention).mockResolvedValue(detail());

  renderDetailPage();

  const start = await screen.findByLabelText('Date de début');
  await userEvent.type(start, '2026-09-15');
  await userEvent.type(screen.getByLabelText('Date de fin'), '2027-01-31');
  await userEvent.selectOptions(screen.getByLabelText("Signataire de l'entreprise"), '5');
  await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

  await waitFor(() => expect(internshipsApi.updateInternship).toHaveBeenCalledWith(10, {
    start_date: '2026-09-15', end_date: '2027-01-31', signing_contact_id: 5,
  }));
  await userEvent.click(screen.getByRole('button', { name: 'Générer la convention' }));
  await waitFor(() => expect(internshipsApi.generateConvention).toHaveBeenCalledWith(10));
});
