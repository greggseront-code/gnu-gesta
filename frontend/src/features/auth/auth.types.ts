export type BaseRole = 'gestionnaire' | 'etudiant' | 'lecteur';
export type EffectiveRole = BaseRole | 'entreprise';
export type AccountStatus = 'ok' | 'student_not_imported';

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
}
