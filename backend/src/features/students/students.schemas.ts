import { z } from 'zod';
import { isValidAcademicYear } from '../../lib/academic-year';

export const StudentInputSchema = z.object({
  matricule: z.string().optional(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  date_naissance: z.string().optional(),
});

export const StudentsImportSchema = z.object({
  academic_year: z
    .string()
    .refine(
      isValidAcademicYear,
      "L'année académique doit respecter le format AAAA-AAAA et contenir deux années consécutives",
    ),
  students: z.array(StudentInputSchema).min(1, 'La liste ne peut pas être vide'),
});
