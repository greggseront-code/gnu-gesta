import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AdminCompaniesPage } from './admin-companies.page';
import { AuthProvider } from '../context/auth-context';
import * as companiesApi from '../features/companies/companies.api';
import * as authApi from '../features/auth/auth.api';
import { ApiError } from '../lib/api-client';
import type { PendingQueue } from '../features/companies/companies.types';

vi.mock('../features/companies/companies.api');
vi.mock('../features/auth/auth.api');

const student = { id: 1, first_name: 'Alice', last_name: 'Martin', email: 'alice@student.vinci.be' };

function emptyQueue(): PendingQueue {
  return { companies: [], contacts: [] };
}

function queueWithOneCompany(): PendingQueue {
  return {
    companies: [
      {
        id: 1,
        name: 'Pending Co',
        general_email: 'contact@pendingco.com',
        address: null,
        validation_status: 'pending',
        submitted_by_student_id: 1,
        validated_at: null,
        created_at: '2026-01-01T00:00:00Z',
        submitted_by_student: student,
        probable_duplicates: [],
        blocking_offer_ids: [],
      },
    ],
    contacts: [],
  };
}

function queueWithOneContact(): PendingQueue {
  return {
    companies: [],
    contacts: [
      {
        id: 10,
        company_id: 2,
        first_name: 'Marc',
        last_name: 'Petit',
        email: 'marc@acme.com',
        phone: null,
        roles: ['encadrant_technique'],
        validation_status: 'pending',
        submitted_by_student_id: 1,
        created_with_company: 0,
        validated_at: null,
        created_at: '2026-01-01T00:00:00Z',
        submitted_by_student: student,
        company_name: 'Acme Corp',
        blocking_offer_ids: [],
      },
    ],
  };
}

async function loginAs(role: 'gestionnaire' | 'lecteur' | 'etudiant') {
  vi.mocked(authApi.getCurrentUser).mockResolvedValue({
    name: 'Test User',
    email: 'test@vinci.be',
    baseRole: role === 'etudiant' ? 'etudiant' : role,
    role,
    entityId: role === 'etudiant' ? 1 : null,
    status: 'ok',
    impersonation: null,
    csrfToken: 'csrf-token',
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AdminCompaniesPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

test('un rôle non gestionnaire est redirigé hors de la page', async () => {
  await loginAs('lecteur');
  vi.mocked(companiesApi.listPendingQueue).mockResolvedValue(emptyQueue());

  renderPage();

  await waitFor(() => {
    expect(screen.queryByText('Administration des entreprises et contacts')).not.toBeInTheDocument();
  });
  expect(companiesApi.listPendingQueue).not.toHaveBeenCalled();
});

test('le gestionnaire voit les deux sections avec leurs compteurs', async () => {
  await loginAs('gestionnaire');
  vi.mocked(companiesApi.listPendingQueue).mockResolvedValue(emptyQueue());

  renderPage();

  expect(await screen.findByText('Aucune entreprise en attente.')).toBeInTheDocument();
  expect(screen.getByText('Aucun contact en attente.')).toBeInTheDocument();
});

test('affiche une entreprise en attente avec son créateur et permet de l\'accepter', async () => {
  await loginAs('gestionnaire');
  vi.mocked(companiesApi.listPendingQueue).mockResolvedValue(queueWithOneCompany());
  vi.mocked(companiesApi.validateCompany).mockResolvedValue({} as never);

  renderPage();

  expect(await screen.findByText('Pending Co')).toBeInTheDocument();
  expect(screen.getByText(/Alice Martin/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Accepter' }));

  await waitFor(() => expect(companiesApi.validateCompany).toHaveBeenCalledWith(1));
  await waitFor(() => expect(screen.queryByText('Pending Co')).not.toBeInTheDocument());
  expect(screen.getByText('Aucune entreprise en attente.')).toBeInTheDocument();
});

test('refuser une entreprise demande une confirmation puis la retire de la file', async () => {
  await loginAs('gestionnaire');
  vi.mocked(companiesApi.listPendingQueue).mockResolvedValue(queueWithOneCompany());
  vi.mocked(companiesApi.rejectCompany).mockResolvedValue(undefined);

  renderPage();
  await screen.findByText('Pending Co');

  await userEvent.click(screen.getByRole('button', { name: 'Refuser' }));
  expect(screen.getByRole('button', { name: 'Confirmer le refus' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Confirmer le refus' }));

  await waitFor(() => expect(companiesApi.rejectCompany).toHaveBeenCalledWith(1));
  await waitFor(() => expect(screen.queryByText('Pending Co')).not.toBeInTheDocument());
});

test('un refus bloqué (409) garde la soumission à l\'écran avec un lien vers l\'offre concernée', async () => {
  await loginAs('gestionnaire');
  vi.mocked(companiesApi.listPendingQueue).mockResolvedValue(queueWithOneCompany());
  vi.mocked(companiesApi.rejectCompany).mockRejectedValue(
    new ApiError('Cette entreprise est référencée par au moins une offre.', 409, { offer_ids: [7] }),
  );

  renderPage();
  await screen.findByText('Pending Co');

  await userEvent.click(screen.getByRole('button', { name: 'Refuser' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirmer le refus' }));

  expect(await screen.findByText(/référencée par au moins une offre/)).toBeInTheDocument();
  expect(screen.getByText('#7')).toBeInTheDocument();
  // La soumission bloquée reste affichée.
  expect(screen.getByText('Pending Co')).toBeInTheDocument();
});

test('affiche un contact en attente avec son entreprise et permet de l\'accepter', async () => {
  await loginAs('gestionnaire');
  vi.mocked(companiesApi.listPendingQueue).mockResolvedValue(queueWithOneContact());
  vi.mocked(companiesApi.validateContact).mockResolvedValue({} as never);

  renderPage();

  expect(await screen.findByText('Marc Petit')).toBeInTheDocument();
  expect(screen.getByText('Acme Corp')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Accepter' }));

  await waitFor(() => expect(companiesApi.validateContact).toHaveBeenCalledWith(10));
  await waitFor(() => expect(screen.queryByText('Marc Petit')).not.toBeInTheDocument());
});
