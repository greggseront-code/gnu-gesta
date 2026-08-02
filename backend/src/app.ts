import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { getDb } from './db/db.connection';
import { authContextMiddleware } from './middlewares/auth-context.middleware';
import { csrfMiddleware } from './middlewares/csrf.middleware';
import {
  getFallbackSessionSecret,
  isProductionLikeEnvironment,
  loadAuthConfig,
  loadAuthConfigOrNull,
} from './features/auth/auth.config';
import { SqliteSessionStore } from './features/auth/session.store';
import { authRouter } from './features/auth/auth.routes';
import { companiesRouter } from './features/companies/companies.routes';
import { studentsRouter } from './features/students/students.routes';
import { offersRouter } from './features/offers/offers.routes';
import { applicationsRouter, selectCandidateRouter } from './features/applications/applications.routes';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// production/staging partagent le meme domaine HTTPS (gng.seront.be) : la
// config Entra y est obligatoire, le demarrage echoue sinon (voir
// docs/deployment.md et backend/.env.example). En dev/test, une config
// absente ne degrade que /api/auth/* (voir requireAuthConfig dans
// auth.routes.ts), jamais le reste de l'application.
const authConfig = isProductionLikeEnvironment() ? loadAuthConfig() : loadAuthConfigOrNull();
if (!authConfig && process.env.NODE_ENV !== 'test') {
  console.warn(
    '[auth] Configuration Entra manquante ou invalide : /api/auth/* restera indisponible ' +
      'tant que backend/.env n\'est pas complete (voir backend/.env.example).',
  );
}

if (isProductionLikeEnvironment()) {
  // Necessaire pour que le cookie de session Secure et req.secure reflètent
  // X-Forwarded-Proto envoye par Nginx (voir deploy/nginx/gng.seront.be.conf).
  app.set('trust proxy', 1);
}

app.use(
  session({
    store: new SqliteSessionStore(),
    name: 'gesta.sid',
    secret: authConfig?.SESSION_SECRET ?? getFallbackSessionSecret(),
    resave: false,
    rolling: true,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProductionLikeEnvironment(),
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);

app.use(authContextMiddleware);
app.use(csrfMiddleware);

app.use('/api/auth', authRouter);

app.use('/api/companies', companiesRouter);
app.use('/api/students', studentsRouter);
app.use('/api/offers', offersRouter);
app.use('/api/offers/:offerId/applications', applicationsRouter);
app.use('/api/offers/:offerId/select-candidate', selectCandidateRouter);

app.get('/api/health', (_req, res) => {
  const db = getDb();
  const tables = db
    .prepare("SELECT COUNT(*) as n FROM sqlite_master WHERE type='table'")
    .get() as { n: number };
  res.json({ ok: true, tables: tables.n });
});
