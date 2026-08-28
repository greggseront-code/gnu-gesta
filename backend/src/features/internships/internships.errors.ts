import { ConflictError } from '../../lib/http-errors';

export class StudentAlreadyHasInternshipError extends ConflictError {
  constructor() {
    super("Cet étudiant possède déjà un dossier de stage bloquant.");
    this.name = 'StudentAlreadyHasInternshipError';
  }
}

export class InternshipOriginAlreadyUsedError extends ConflictError {
  constructor() {
    super('Cette offre ou proposition possède déjà un dossier de stage.');
    this.name = 'InternshipOriginAlreadyUsedError';
  }
}

export function translateInternshipConstraint(err: unknown): never {
  if (err instanceof Error && err.message.includes('idx_internships_one_blocking_per_student')) {
    throw new StudentAlreadyHasInternshipError();
  }
  if (err instanceof Error && (
    err.message.includes('internships.origin_offer_id')
    || err.message.includes('internships.origin_application_id')
  )) {
    throw new InternshipOriginAlreadyUsedError();
  }
  throw err;
}
