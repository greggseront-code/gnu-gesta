import { Router, type Response } from 'express';
import { loadAuthConfig } from './auth.config';
import { getEntraProvider } from './entra.client';
import { buildLoginRequest, handleAuthCallback, AuthCallbackError } from './auth.service';

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
    const user = await handleAuthCallback(provider, config, pendingAuth, {
      code: firstString(req.query.code),
      state: firstString(req.query.state),
      error: firstString(req.query.error),
    });

    // Regenere l'identifiant de session apres connexion et efface au passage
    // le code verifier / nonce temporaires. Aucun jeton Microsoft n'est
    // conserve au-dela de cet appel.
    req.session.regenerate((err) => {
      if (err) {
        res.redirect(`${config.APP_BASE_URL}/auth-check?error=session_error`);
        return;
      }
      req.session.user = user;
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

// GET /api/auth/me — identite de la session pilote courante.
authRouter.get('/me', (req, res) => {
  const user = req.session.user;
  if (!user) {
    res.status(401).json({ error: 'not_authenticated' });
    return;
  }
  if (user.kind === 'gestionnaire') {
    res.json({ name: user.displayName, email: user.email, role: 'gestionnaire' });
    return;
  }
  res.json({ name: user.displayName, email: user.email, status: 'pilot_not_manager' });
});

// POST /api/auth/logout — deconnexion locale uniquement (pas de logout Microsoft global).
authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('gesta.sid');
    res.status(204).end();
  });
});
