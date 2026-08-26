import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StudentProposalPage } from './student-proposal.page';
import { AuthProvider } from '../context/auth-context';
import * as companiesApi from '../features/companies/companies.api';
import * as authApi from '../features/auth/auth.api';
import * as offersApi from '../features/offers/offers.api';
import type { Company, CompanyWithContacts } from '../features/companies/companies.types';

vi.mock('../features/companies/companies.api');
vi.mock('../features/auth/auth.api');
vi.mock('../features/offers/offers.api');

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: 1,
    name: 'Acme Corp',
    general_email: 'acme@acme.com',
    address: null,
    validation_status: 'validated',
    submitted_by_student_id: null,
    validated_at: '2026-01-01',
    created_at: '2026-01-01',
    ...overrides,
  };
}

function companyWithContacts(overrides: Partial<CompanyWithContacts> = {}): CompanyWithContacts {
  return {
    ...company(),
    contacts: [
      {
        id: 10,
        company_id: 1,
        first_name: 'Jean',
        last_name: 'Dupont',
        email: 'jean@acme.com',
        phone: null,
        roles: ['maitre_de_stage'],
        validation_status: 'validated',
        submitted_by_student_id: null,
        created_with_company: 0,
        validated_at: '2026-01-01',
        created_at: '2026-01-01',
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(authApi.getCurrentUser).mockResolvedValue({
    name: 'Alice Étudiante',
    email: 'alice@student.vinci.be',
    baseRole: 'etudiant',
    role: 'etudiant',
    entityId: 42,
    status: 'ok',
    impersonation: null,
    csrfToken: 'csrf-token',
  });
  vi.mocked(offersApi.listMyStudentOffers).mockResolvedValue([]);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <StudentProposalPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

/**
 * Les champs texte du formulaire sont des labels frères de leur input (pas
 * de htmlFor/id), donc pas repérables par getByLabelText : on retrouve
 * l'input par le texte exact du label qui le précède immédiatement.
 */
function fieldByLabel(container: HTMLElement, text: string, occurrence = 0): HTMLInputElement {
  const labels = Array.from(container.querySelectorAll('label')).filter((l) => l.textContent?.trim() === text);
  const label = labels[occurrence];
  return label.nextElementSibling as HTMLInputElement;
}

test("le formulaire de création d'entreprise reste indisponible avant la recherche", async () => {
  renderPage();

  await screen.findByText(/vérifiez d'abord que cette entreprise n'existe pas déjà/i);
  expect(screen.queryByText('Suggérer une nouvelle entreprise')).not.toBeInTheDocument();
});

test("le blocage d'une offre déjà en attente apparaît dès l'ouverture de la page, avant toute recherche", async () => {
  vi.mocked(offersApi.listMyStudentOffers).mockResolvedValue([
    {
      id: 7,
      company_id: 1,
      priority_contact_id: 10,
      description: 'Stage déjà proposé',
      location: null,
      technologies: null,
      objectives: null,
      remote_allowed: 0,
      remote_percentage: null,
      remarks: null,
      attachment_path: null,
      status: 'soumise',
      submitted_by_student_id: 42,
      created_by_company_id: null,
      source_type: 'student',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      company_name: 'Acme Corp',
      submitted_by_student_name: 'Alice Étudiante',
    },
  ]);

  renderPage();

  expect(await screen.findByText(/vous avez déjà une offre en attente de validation/i)).toBeInTheDocument();
  expect(screen.queryByText("Étape 1 — Rechercher l'entreprise")).not.toBeInTheDocument();
  const link = screen.getByRole('link', { name: 'Voir mon offre en attente' });
  expect(link).toHaveAttribute('href', '/offers/7');
});

test('la recherche débloque le résultat et le bouton de création', async () => {
  vi.mocked(companiesApi.listCompanies).mockResolvedValue([company()]);

  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Rechercher' }));

  expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
  expect(screen.getByText('Suggérer une nouvelle entreprise')).toBeInTheDocument();
});

test('modifier le terme de recherche redemande une recherche avant de pouvoir créer', async () => {
  vi.mocked(companiesApi.listCompanies).mockResolvedValue([company()]);

  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Rechercher' }));
  await screen.findByText('Suggérer une nouvelle entreprise');

  await userEvent.type(screen.getByPlaceholderText("Rechercher une entreprise…"), 'x');

  expect(screen.queryByText('Suggérer une nouvelle entreprise')).not.toBeInTheDocument();
  expect(await screen.findByText(/vérifiez d'abord que cette entreprise n'existe pas déjà/i)).toBeInTheDocument();
});

test("sélectionner une entreprise affiche directement tous ses contacts, sans recherche préalable", async () => {
  vi.mocked(companiesApi.listCompanies).mockResolvedValue([company()]);
  vi.mocked(companiesApi.getCompany).mockResolvedValue(companyWithContacts());

  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Rechercher' }));
  await userEvent.click(await screen.findByText('Sélectionner'));

  expect(await screen.findByText('Étape 2 — Rechercher le contact')).toBeInTheDocument();
  expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
  expect(screen.getByText('Proposer un nouveau contact')).toBeInTheDocument();
});

test('la recherche de contact filtre la liste déjà affichée', async () => {
  vi.mocked(companiesApi.listCompanies).mockResolvedValue([company()]);
  vi.mocked(companiesApi.getCompany).mockResolvedValue(companyWithContacts());

  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Rechercher' }));
  await userEvent.click(await screen.findByText('Sélectionner'));
  await screen.findByText('Jean Dupont');

  await userEvent.type(screen.getByPlaceholderText('Rechercher un contact…'), 'zzz');
  await userEvent.click(screen.getByRole('button', { name: 'Rechercher' }));

  expect(screen.queryByText('Jean Dupont')).not.toBeInTheDocument();
  expect(await screen.findByText('Aucun contact trouvé.')).toBeInTheDocument();
});

test("sélectionner un contact existant mène à l'étape du formulaire d'offre", async () => {
  vi.mocked(companiesApi.listCompanies).mockResolvedValue([company()]);
  vi.mocked(companiesApi.getCompany).mockResolvedValue(companyWithContacts());

  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Rechercher' }));
  await userEvent.click(await screen.findByText('Sélectionner'));
  await screen.findByText('Étape 2 — Rechercher le contact');
  await userEvent.click(await screen.findByText('Sélectionner'));

  expect(await screen.findByText('Étape 3 — Détails de la proposition')).toBeInTheDocument();
  expect(screen.getByText('Jean Dupont', { exact: false })).toBeInTheDocument();
});

test('créer un nouveau contact le sélectionne immédiatement et avance à l\'étape du formulaire', async () => {
  vi.mocked(companiesApi.listCompanies).mockResolvedValue([company()]);
  vi.mocked(companiesApi.getCompany).mockResolvedValue(companyWithContacts({ contacts: [] }));
  vi.mocked(companiesApi.addContact).mockResolvedValue({
    id: 99,
    company_id: 1,
    first_name: 'Marc',
    last_name: 'Petit',
    email: 'marc@acme.com',
    phone: null,
    roles: ['encadrant_technique'],
    validation_status: 'pending',
    submitted_by_student_id: 42,
    created_with_company: 0,
    validated_at: null,
    created_at: '2026-01-01',
  });

  const { container } = renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Rechercher' }));
  await userEvent.click(await screen.findByText('Sélectionner'));
  await screen.findByText('Aucun contact trouvé.');
  await userEvent.click(screen.getByText('Proposer un nouveau contact'));

  await userEvent.type(fieldByLabel(container, 'Prénom'), 'Marc');
  await userEvent.type(fieldByLabel(container, 'Nom'), 'Petit');
  await userEvent.type(fieldByLabel(container, 'Email'), 'marc@acme.com');
  await userEvent.click(screen.getByLabelText('Encadrant technique'));
  await userEvent.click(screen.getByRole('button', { name: 'Créer le contact et continuer' }));

  await waitFor(() => expect(companiesApi.addContact).toHaveBeenCalled());
  expect(await screen.findByText('Étape 3 — Détails de la proposition')).toBeInTheDocument();
  expect(screen.getByText(/En attente de validation/)).toBeInTheDocument();
});

test("créer une nouvelle entreprise avance directement à l'étape du formulaire avec son premier contact", async () => {
  vi.mocked(companiesApi.listCompanies).mockResolvedValue([]);
  vi.mocked(companiesApi.createCompany).mockResolvedValue(
    companyWithContacts({
      id: 5,
      name: 'Nouvelle SPRL',
      validation_status: 'pending',
      submitted_by_student_id: 42,
      validated_at: null,
      contacts: [
        {
          id: 50,
          company_id: 5,
          first_name: 'Marc',
          last_name: 'Petit',
          email: 'marc@nouvelle.com',
          phone: null,
          roles: ['maitre_de_stage'],
          validation_status: 'pending',
          submitted_by_student_id: 42,
          created_with_company: 1,
          validated_at: null,
          created_at: '2026-01-01',
        },
      ],
    }),
  );

  const { container } = renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Rechercher' }));
  await screen.findByText('Aucune entreprise trouvée.');
  await userEvent.click(screen.getByText('Suggérer une nouvelle entreprise'));

  await userEvent.type(fieldByLabel(container, 'Nom', 0), 'Nouvelle SPRL');
  await userEvent.type(fieldByLabel(container, 'Email général'), 'contact@nouvelle.com');
  await userEvent.type(fieldByLabel(container, 'Prénom'), 'Marc');
  await userEvent.type(fieldByLabel(container, 'Nom', 1), 'Petit');
  await userEvent.type(fieldByLabel(container, 'Email'), 'marc@nouvelle.com');
  await userEvent.click(screen.getByLabelText('Maître de stage'));
  await userEvent.click(screen.getByRole('button', { name: "Créer l'entreprise et continuer" }));

  await waitFor(() => expect(companiesApi.createCompany).toHaveBeenCalled());
  expect(await screen.findByText('Étape 3 — Détails de la proposition')).toBeInTheDocument();
});
