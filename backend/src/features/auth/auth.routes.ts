import { Router, type Response } from 'express';
import { z } from 'zod';
import { loadAuthConfig } from './auth.config';
import { getEntraProvider } from './entra.client';
import {
  buildLoginRequest,
  handleAuthCallback,
  generateCsrfToken,
  assertCanImpersonate,
  ImpersonationForbiddenError,
  AuthCallbackError,
} from './auth.service';
import { getDb } from '../../db/db.connection';
import { findStudentById } from '../students/students.queries';
import { findCompanyById } from '../companies/companies.queries';

export const authRouter = Router();

function firstString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * loadAuthConfig() throws when backend/.env est absent ou incomplet. Ce cas
 * ne doit degrader que les routes /api/auth/*, jamais le reste de l'app
 * (voir app.ts). Retourne null et repond 500 quand la config est absente.
 */
function requireAuthConfig(res: Response) {
  try {
    return loadAuthConfig();
  } catch (e) {
    res.status(500).json({
      error: 'auth_not_configured',
      message: e instanceof Error ? e.message : 'Configuration Entra invalide.',
    });
    return null;
  }
}

// GET /api/auth/login — redirige vers Microsoft Entra.
authRouter.get('/login', async (req, res) => {
  const config = requireAuthConfig(res);
  if (!config) return;
  const provider = getEntraProvider(config);
  const { authUrl, pendingAuth } = await buildLoginRequest(provider);
  req.session.pendingAuth = pendingAuth;
  res.redirect(authUrl);
});

// GET /api/auth/callback — retour Microsoft Entra.
authRouter.get('/callback', async (req, res) => {
  const config = requireAuthConfig(res);
  if (!config) return;
  const provider = getEntraProvider(config);
  const pendingAuth = req.session.pendingAuth;

  try {
    const user = await handleAuthCallback(provider, config, getDb(), pendingAuth, {
      code: firstString(req.query.code),
      state: firstString(req.query.state),
      error: firstString(req.query.error),
    });

    // Regenere l'identifiant de session apres connexion : efface au passage
    // le code verifier/nonce temporaires et toute incarnation precedente.
    // Aucun jeton Microsoft n'est conserve au-dela de cet appel.
    req.session.regenerate((err) => {
      if (err) {
        res.redirect(`${config.APP_BASE_URL}/auth-check?error=session_error`);
        return;
      }
      req.session.user = user;
      req.session.csrfToken = generateCsrfToken();
      req.session.save(() => {
        res.redirect(`${config.APP_BASE_URL}/auth-check`);
      });
    });
  } catch (e) {
    delete req.session.pendingAuth;
    const code = e instanceof AuthCallbackError ? e.code : 'unknown_error';
    res.redirect(`${config.APP_BASE_URL}/auth-check?error=${code}`);
  }
});

// GET /api/auth/me — identite de la session courante (role de base + effectif + statut).
authRouter.get('/me', (req, res) => {
  const user = req.session.user;
  if (!user) {
    res.status(401).json({ error: 'not_authenticated' });
    return;
  }

  const impersonation = req.session.impersonation;
  const isImpersonating = Boolean(impersonation) && user.baseRole === 'gestionnaire';
  const role = user.status === 'student_not_imported'
    ? null
    : isImpersonating
      ? (impersonation!.kind === 'student' ? 'etudiant' : 'entreprise')
      : user.baseRole;
  const entityId = user.status === 'student_not_imported'
    ? null
    : isImpersonating
      ? impersonation!.entityId
      : user.entityId;

  res.json({
    name: user.displayName,
    email: user.email,
    baseRole: user.baseRole,
    role,
    entityId,
    status: user.status,
    impersonation: isImpersonating ? impersonation : null,
    csrfToken: req.session.csrfToken,
  });
});

// POST /api/auth/logout — deconnexion locale uniquement (pas de logout Microsoft global).
authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('gesta.sid');
    res.status(204).end();
  });
});

const ImpersonationInputSchema = z.object({
  kind: z.enum(['student', 'company']),
  entityId: z.number().int().positive(),
});

// POST /api/auth/impersonation — active un mode temporaire (gestionnaire uniquement, jalon 5).
authRouter.post('/impersonation', (req, res) => {
  try {
    assertCanImpersonate(req.session.user);
  } catch (e) {
    if (e instanceof ImpersonationForbiddenError) {
      res.status(403).json({ error: 'Accès refusé' });
      return;
    }
    throw e;
  }

  const result = ImpersonationInputSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { kind, entityId } = result.data;
  const entity = kind === 'student' ? findStudentById(getDb(), entityId) : findCompanyById(getDb(), entityId);
  if (!entity) {
    res.status(404).json({ error: 'Entité introuvable' });
    return;
  }

  req.session.impersonation = { kind, entityId };
  res.status(200).json({ kind, entityId });
});

// DELETE /api/auth/impersonation — restaure le rôle de base gestionnaire.
authRouter.delete('/impersonation', (req, res) => {
  try {
    assertCanImpersonate(req.session.user);
  } catch (e) {
    if (e instanceof ImpersonationForbiddenError) {
      res.status(403).json({ error: 'Accès refusé' });
      return;
    }
    throw e;
  }

  delete req.session.impersonation;
  res.status(204).end();
});
