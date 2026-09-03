import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { StudentsImportPage } from './students-import.page';
import * as studentsApi from '../features/students/students.api';

vi.mock('../features/students/students.api');

function studentWorkbook(): File {
  const worksheet = XLSX.utils.json_to_sheet([
    {
      Matricule: '202502681',
      Nom: 'Dupont',
      Prénom: 'Alice',
      Email: 'alice.dupont@student.vinci.be',
      'Date-Naissance': '2006-06-20',
    },
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Étudiants');
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new File([bytes], 'etudiants.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <StudentsImportPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

test('importe le fichier pour l’année choisie et confirme le rattachement', async () => {
  const user = userEvent.setup();
  vi.mocked(studentsApi.importStudents).mockResolvedValueOnce({
    imported: 1,
    academic_year: '2026-2027',
  });
  renderPage();

  await user.upload(screen.getByLabelText('Choisir un fichier'), studentWorkbook());
  expect(await screen.findByText(/Aperçu — 1 étudiant détecté/)).toBeInTheDocument();

  const academicYear = screen.getByLabelText("Année académique d'éligibilité");
  await user.clear(academicYear);
  await user.type(academicYear, '2026-2027');
  await user.click(screen.getByRole('button', { name: 'Importer 1 étudiant pour 2026-2027' }));

  expect(studentsApi.importStudents).toHaveBeenCalledWith({
    academic_year: '2026-2027',
    students: [{
      matricule: '202502681',
      last_name: 'Dupont',
      first_name: 'Alice',
      email: 'alice.dupont@student.vinci.be',
      date_naissance: '2006-06-20',
    }],
  });
  expect(await screen.findByText(/Éligibilité enregistrée pour 2026-2027/)).toBeInTheDocument();
});

test('F20 invalid academic year does not submit', async () => {
  const user = userEvent.setup();
  renderPage();
  await user.upload(screen.getByLabelText('Choisir un fichier'), studentWorkbook());
  await screen.findByText(/Aperçu — 1 étudiant détecté/);

  const academicYear = screen.getByLabelText("Année académique d'éligibilité");
  await user.clear(academicYear);
  await user.type(academicYear, '2026-2028');

  expect(screen.getByRole('alert')).toHaveTextContent(
    "L'année académique doit suivre le format AAAA-AAAA avec deux années consécutives.",
  );
  const submit = screen.getByRole('button', { name: 'Importer 1 étudiant pour 2026-2028' });
  expect(submit).toBeDisabled();
  await user.click(submit);
  expect(studentsApi.importStudents).not.toHaveBeenCalled();
});

test('affiche une erreur API textuelle sans préfixe technique', async () => {
  const user = userEvent.setup();
  vi.mocked(studentsApi.importStudents).mockRejectedValueOnce(new Error('Import impossible.'));
  renderPage();
  await user.upload(screen.getByLabelText('Choisir un fichier'), studentWorkbook());

  const button = await screen.findByRole('button', { name: /Importer 1 étudiant pour/ });
  await user.click(button);

  expect(await screen.findByText('Import impossible.')).toBeInTheDocument();
  expect(screen.queryByText('Error: Import impossible.')).not.toBeInTheDocument();
});
