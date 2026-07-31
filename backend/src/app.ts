import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { getDb } from './db/db.connection';
import { authContextMiddleware } from './middlewares/auth-context.middleware';
import {
  assertPilotEnvironmentAllowed,
  getFallbackSessionSecret,
  loadAuthConfigOrNull,
} from './features/auth/auth.config';
import { authRouter } from './features/auth/auth.routes';
import { companiesRouter } from './features/companies/companies.routes';
import { studentsRouter } from './features/students/students.routes';
import { offersRouter } from './features/offers/offers.routes';
import { applicationsRouter, selectCandidateRouter } from './features/applications/applications.routes';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Pilote jalon 1 : MemoryStore uniquement, jamais en NODE_ENV=production tant
// que le store SQLite du jalon 2 n'est pas en place. N'affecte pas les
// routes metier existantes, qui restent gouvernees par x-role/x-entity-id
// pendant le pilote.
assertPilotEnvironmentAllowed();

// backend/.env manquant ou invalide ne doit jamais empecher les routes
// metier existantes de demarrer : seules /api/auth/* echouent alors,
// avec un message clair (voir auth.routes.ts).
const pilotAuthConfig = loadAuthConfigOrNull();
if (!pilotAuthConfig && process.env.NODE_ENV !== 'test') {
  console.warn(
    '[auth] Configuration Entra manquante ou invalide : /api/auth/* restera indisponible ' +
      'tant que backend/.env n\'est pas complete (voir backend/.env.example).',
  );
}

app.use(
  session({
    name: 'gesta.sid',
    secret: pilotAuthConfig?.SESSION_SECRET ?? getFallbackSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 2,
    },
  }),
);
app.use('/api/auth', authRouter);

app.use(authContextMiddleware);

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
