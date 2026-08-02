import { z } from 'zod';

const ContactRoleSchema = z.enum([
  'maitre_de_stage',
  'responsable_administratif',
  'encadrant_technique',
]);

export const ContactInputSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  roles: z.array(ContactRoleSchema).min(1),
});

export const CompanyInputSchema = z.object({
  name: z.string().min(1),
  general_email: z.string().email(),
  address: z.string().optional(),
  contacts: z.array(ContactInputSchema).min(1, 'Au moins un contact est requis'),
});

/** Modification gestionnaire d'un contact en attente ou déjà validé : mêmes contraintes que la création, tous champs optionnels. */
export const ContactPatchSchema = ContactInputSchema.partial();
