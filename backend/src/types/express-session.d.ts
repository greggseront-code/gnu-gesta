import 'express-session';
import type { PendingAuthState, PilotSessionUser } from '../features/auth/auth.types';

declare module 'express-session' {
  interface SessionData {
    pendingAuth?: PendingAuthState;
    user?: PilotSessionUser;
  }
}
