/** Erreur metier portant son propre code HTTP : les routes la traduisent via handleServiceError (voir requestErrorHandler). */
export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

/** 409 explicite : unicite, reference bloquante, dependance en attente, transition incoherente. */
export class ConflictError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(409, message, details);
    this.name = 'ConflictError';
  }
}

/** 404 : ressource absente ou masquee par les regles de visibilite (traitee comme absente, jamais 403). */
export class NotFoundError extends HttpError {
  constructor(message = 'Ressource non trouvée') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

/** 400 : reference fournie par l'appelant incoherente (ex: contact n'appartenant pas a l'entreprise choisie). */
export class BadRequestError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(400, message, details);
    this.name = 'BadRequestError';
  }
}

interface SqliteConstraintError {
  code?: string;
  message: string;
}

function isUniqueConstraintError(err: unknown): err is SqliteConstraintError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as SqliteConstraintError).code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
}

/**
 * Traduit une violation d'index unique SQLite en ConflictError metier. Les
 * index concernes designent tous une cle metier deja documentee cote
 * utilisateur (email de contact, couple nom/adresse d'entreprise) : le
 * message reste generique et n'expose ni identifiant ni donnee de la ligne en
 * conflit, qui peut appartenir a une soumission masquee (voir spec).
 */
export function translateUniqueConstraint(err: unknown, indexMessages: Record<string, string>): never {
  if (isUniqueConstraintError(err)) {
    for (const [indexName, message] of Object.entries(indexMessages)) {
      if (err.message.includes(indexName)) {
        throw new ConflictError(message);
      }
    }
  }
  throw err;
}
