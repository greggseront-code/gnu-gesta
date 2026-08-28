import ExcelJS from 'exceljs';
import type { AnnualInternshipRow, InternshipStatus } from './internships.types';

const STATUS_LABELS: Record<InternshipStatus, string> = {
  preparation: 'En préparation',
  confirme: 'Confirmé',
  termine: 'Terminé',
  interrompu: 'Interrompu',
  echoue: 'Échoué',
};

function excelDate(value: string | null): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export async function buildAnnualInternshipsWorkbook(
  academicYear: string,
  rows: AnnualInternshipRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GNU Gesta';
  workbook.created = new Date();
  workbook.title = `Stages ${academicYear}`;
  workbook.subject = 'Suivi annuel des étudiants éligibles et de leurs stages';

  const worksheet = workbook.addWorksheet('Stages', {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });
  worksheet.columns = [
    { header: 'Matricule', key: 'matricule', width: 14 },
    { header: 'Nom', key: 'last_name', width: 20 },
    { header: 'Prénom', key: 'first_name', width: 18 },
    { header: 'Email', key: 'email', width: 32 },
    { header: 'Situation', key: 'situation', width: 14 },
    { header: 'État du dossier', key: 'status', width: 18 },
    { header: 'Entreprise', key: 'company_name', width: 28 },
    { header: 'Date de début', key: 'start_date', width: 15, style: { numFmt: 'yyyy-mm-dd' } },
    { header: 'Date de fin', key: 'end_date', width: 15, style: { numFmt: 'yyyy-mm-dd' } },
    { header: 'Contact signataire', key: 'signing_contact_name', width: 26 },
  ];

  for (const row of rows) {
    worksheet.addRow({
      matricule: row.matricule,
      last_name: row.last_name,
      first_name: row.first_name,
      email: row.email,
      situation: row.has_internship ? 'Avec stage' : 'Sans stage',
      status: row.status ? STATUS_LABELS[row.status] : null,
      company_name: row.company_name,
      start_date: excelDate(row.start_date),
      end_date: excelDate(row.end_date),
      signing_contact_name: row.signing_contact_name,
    });
  }

  const header = worksheet.getRow(1);
  header.height = 24;
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F5F73' } };
  header.alignment = { vertical: 'middle', horizontal: 'left' };
  header.eachCell((cell) => {
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF174656' } } };
  });

  for (let index = 2; index <= worksheet.rowCount; index += 1) {
    const row = worksheet.getRow(index);
    row.alignment = { vertical: 'middle' };
    if (index % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F7F8' } };
    }
  }
  worksheet.autoFilter = { from: 'A1', to: `J${Math.max(1, worksheet.rowCount)}` };

  const bytes = await workbook.xlsx.writeBuffer();
  return Buffer.from(bytes);
}
