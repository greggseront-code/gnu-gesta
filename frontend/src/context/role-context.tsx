import { createContext, useContext, useState, type ReactNode } from 'react';

export type Role = 'gestionnaire' | 'lecteur' | 'etudiant' | 'entreprise';

export interface RoleState {
  role: Role | null;
  entityId: number | null;
}

interface RoleContextValue extends RoleState {
  setRole: (role: Role, entityId?: number | null) => void;
  clearRole: () => void;
}

export const ROLE_STORAGE_KEY = 'gesta_role';

function loadFromStorage(): RoleState {
  try {
    // V1 role selection is a local UX shortcut, mirrored to backend headers by
    // api-client.ts. It is not a security boundary.
    const raw = localStorage.getItem(ROLE_STORAGE_KEY);
    if (!raw) return { role: null, entityId: null };
    return JSON.parse(raw) as RoleState;
  } catch {
    return { role: null, entityId: null };
  }
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RoleState>(loadFromStorage);

  function setRole(role: Role, entityId: number | null = null) {
    const next: RoleState = { role, entityId };
    setState(next);
    localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(next));
  }

  function clearRole() {
    setState({ role: null, entityId: null });
    localStorage.removeItem(ROLE_STORAGE_KEY);
  }

  return (
    <RoleContext.Provider value={{ ...state, setRole, clearRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used inside RoleProvider');
  return ctx;
}
