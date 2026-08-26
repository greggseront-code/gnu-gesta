import { fireEvent, render, screen } from '@testing-library/react';
import { OfferForm } from './offer-form';

function renderForm(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const rendered = render(
      <OfferForm
        companyId={1}
        contactId={10}
        onSubmit={onSubmit}
        submitLabel="Soumettre"
      />,
    );
  return { onSubmit, ...rendered };
}

test('soumet zéro fichier quand aucune pièce jointe n’est sélectionnée', async () => {
  const { onSubmit, container } = renderForm();
  fireEvent.change(container.querySelector('textarea')!, { target: { value: 'Stage test' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Soumettre' }).closest('form')!);
  await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ files: [] })));
});

test('affiche plusieurs fichiers et permet d’en retirer un avant l’envoi', async () => {
  const { onSubmit, container } = renderForm();
  const pdf = new File(['pdf'], 'contrat.pdf', { type: 'application/pdf' });
  const docx = new File(['docx'], 'convention.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [pdf, docx] } });

  expect(screen.getByText('contrat.pdf')).toBeInTheDocument();
  expect(screen.getByText('convention.docx')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Retirer' })[0]);
  expect(screen.queryByText('contrat.pdf')).not.toBeInTheDocument();
  fireEvent.submit(screen.getByRole('button', { name: 'Soumettre' }).closest('form')!);
  await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ files: [docx] })));
});

test('signale les erreurs locales de nombre, taille, extension et MIME', () => {
  const { container } = renderForm();
  const files = [
    new File(['x'], 'bad.exe', { type: 'application/octet-stream' }),
    new File(['x'], 'wrong.pdf', { type: 'application/octet-stream' }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' }),
  ];
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files } });
  expect(screen.getByText(/extension non autorisée/)).toBeInTheDocument();
  expect(screen.getByText(/type MIME incohérent/)).toBeInTheDocument();
  expect(screen.getByText(/taille dépasse 5 Mo/)).toBeInTheDocument();

  const tenFiles = Array.from({ length: 11 }, (_, index) => new File(['x'], `${index}.pdf`, { type: 'application/pdf' }));
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: tenFiles } });
  expect(screen.getByText(/place/)).toBeInTheDocument();
});
