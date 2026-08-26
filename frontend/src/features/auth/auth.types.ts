export type BaseRole = 'gestionnaire' | 'etudiant' | 'lecteur';
export type EffectiveRole = BaseRole | 'entreprise';
export type AccountStatus = 'ok' | 'student_not_imported';
export type AuthMode = 'entra' | 'dev';

export interface DevAuthFixture {
  name: 'manager' | 'reader' | 'student-alice' | 'student-bob' | 'company';
  label: string;
  description: string;
}

export interface ImpersonationState {
  kind: 'student' | 'company';
  entityId: number;
}

export interface CurrentAuthUser {
  name: string;
  email: string;
  baseRole: BaseRole;
  role: EffectiveRole | null;
  entityId: number | null;
  status: AccountStatus;
  impersonation: ImpersonationState | null;
  csrfToken: string;
  /** Présent dans la réponse serveur pour afficher le garde-fou local. */
  authMode?: AuthMode;
}
