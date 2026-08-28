import { z } from 'zod';

export const AcademicYearSchema = z.string().regex(/^\d{4}-\d{4}$/, 'Année académique invalide').refine((value) => {
  const [from, to] = value.split('-').map(Number);
  return to === from + 1;
}, 'Les deux années doivent être consécutives');

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide').refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Date invalide');

export const InternshipPreparationSchema = z.object({
  start_date: IsoDateSchema,
  end_date: IsoDateSchema,
  signing_contact_id: z.number().int().positive(),
}).refine((value) => value.end_date >= value.start_date, {
  message: 'La date de fin doit être égale ou postérieure à la date de début',
  path: ['end_date'],
});

export const InternshipTerminalStatusSchema = z.object({
  status: z.enum(['termine', 'interrompu', 'echoue']),
});

export const StudentsAnnualImportSchema = z.object({
  academic_year: AcademicYearSchema,
  students: z.array(z.object({
    matricule: z.string().optional(),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    email: z.string().email(),
    date_naissance: z.string().optional(),
  })).min(1, 'La liste ne peut pas être vide'),
});
