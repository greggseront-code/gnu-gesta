export interface AuthenticatedManager {
  name: string;
  email: string;
  role: 'gestionnaire';
}

export interface PilotNotManager {
  name: string;
  email: string;
  status: 'pilot_not_manager';
}

export type CurrentAuthUser = AuthenticatedManager | PilotNotManager;
