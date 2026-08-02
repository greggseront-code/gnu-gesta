import 'express-session';
import type { ImpersonationState, PendingAuthState, SessionUser } from '../features/auth/auth.types';

declare module 'express-session' {
  interface SessionData {
    pendingAuth?: PendingAuthState;
    user?: SessionUser;
    impersonation?: ImpersonationState;
    csrfToken?: string;
  }
}
