import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StudentProposalPage } from './student-proposal.page';
import { AuthProvider } from '../context/auth-context';
import * as companiesApi from '../features/companies/companies.api';
import * as authApi from '../features/auth/auth.api';
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

test("sélectionner une entreprise mène à l'étape de recherche de contact", async () => {
  vi.mocked(companiesApi.listCompanies).mockResolvedValue([company()]);
  vi.mocked(companiesApi.getCompany).mockResolvedValue(companyWithContacts());

  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Rechercher' }));
  await userEvent.click(await screen.findByText('Sélectionner'));

  expect(await screen.findByText('Étape 2 — Rechercher le contact')).toBeInTheDocument();
  expect(screen.getByText(/vérifiez d'abord si le contact existe déjà/i)).toBeInTheDocument();
  expect(screen.queryByText('Proposer un nouveau contact')).not.toBeInTheDocument();
});

test("la recherche de contact affiche les résultats et débloque la création d'un nouveau contact", async () => {
  vi.mocked(companiesApi.listCompanies).mockResolvedValue([company()]);
  vi.mocked(companiesApi.getCompany).mockResolvedValue(companyWithContacts());

  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Rechercher' }));
  await userEvent.click(await screen.findByText('Sélectionner'));
  await screen.findByText('Étape 2 — Rechercher le contact');

  await userEvent.click(screen.getByRole('button', { name: 'Rechercher' }));

  expect(await screen.findByText('Jean Dupont')).toBeInTheDocument();
  expect(screen.getByText('Proposer un nouveau contact')).toBeInTheDocument();
});

test("sélectionner un contact existant mène à l'étape du formulaire d'offre", async () => {
  vi.mocked(companiesApi.listCompanies).mockResolvedValue([company()]);
  vi.mocked(companiesApi.getCompany).mockResolvedValue(companyWithContacts());

  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Rechercher' }));
  await userEvent.click(await screen.findByText('Sélectionner'));
  await screen.findByText('Étape 2 — Rechercher le contact');
  await userEvent.click(screen.getByRole('button', { name: 'Rechercher' }));
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
  await screen.findByText('Étape 2 — Rechercher le contact');
  await userEvent.click(screen.getByRole('button', { name: 'Rechercher' }));
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
