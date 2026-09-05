import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type AdminJS from 'adminjs';
import {
  ApiError,
  login,
  refreshTokens,
  type ApiTokens,
  type JwtClaims,
} from '../api/client.js';
import { env } from '../config/env.js';

/**
 * Authentification sans état.
 *
 * Les jetons délivrés par l'API vivent dans deux cookies httpOnly ; il n'y a ni
 * table ni store de session côté backoffice. Chaque requête revalide la
 * signature de l'access token et relit le rôle : une rétrogradation en base
 * prend effet au plus tard à l'expiration du jeton courant.
 */
const ACCESS_COOKIE = 'bo_at';
const REFRESH_COOKIE = 'bo_rt';

// Les cookies portent la durée du refresh token de l'API (7 j). La validité
// réelle reste celle du `exp` de chaque jeton, vérifiée à chaque requête.
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.isProduction,
    path: '/',
    maxAge: COOKIE_MAX_AGE_MS,
  };
}

export function setAuthCookies(res: Response, tokens: ApiTokens): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, cookieOptions());
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, cookieOptions());
}

export function clearAuthCookies(res: Response): void {
  const { maxAge: _ignored, ...options } = cookieOptions();
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
}

/**
 * Vérifie la signature et la péremption d'un access token.
 *
 * `algorithms` est verrouillé volontairement : sans cette contrainte,
 * jsonwebtoken accepterait l'algorithme annoncé dans l'en-tête du jeton, ce qui
 * ouvre la porte aux attaques par confusion d'algorithme.
 */
export function verifyAccessToken(token: string): JwtClaims | null {
  try {
    return jwt.verify(token, env.jwtAccessSecret, {
      algorithms: ['HS256'],
    }) as JwtClaims;
  } catch {
    return null;
  }
}

/** Le compte a-t-il le droit d'entrer ? Le rôle prime, la liste blanche affine. */
export function isAllowedAdmin(claims: JwtClaims): boolean {
  if (claims.role !== 'admin') return false;
  if (env.allowedAdminEmails.length === 0) return true;
  return env.allowedAdminEmails.includes(claims.email.toLowerCase());
}

export interface AuthenticatedRequest {
  claims: JwtClaims;
  tokens: ApiTokens;
}

/**
 * Résout la requête courante en admin authentifié, en renouvelant les jetons au
 * passage si l'access token a expiré. Renvoie null si rien d'exploitable.
 */
async function resolveAdmin(
  req: Request,
  res: Response,
): Promise<AuthenticatedRequest | null> {
  const accessToken = req.cookies?.[ACCESS_COOKIE] as string | undefined;
  const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;

  const claims = accessToken ? verifyAccessToken(accessToken) : null;
  if (claims && accessToken) {
    if (!isAllowedAdmin(claims)) return null;
    return {
      claims,
      tokens: { accessToken, refreshToken: refreshToken ?? '' },
    };
  }

  if (!refreshToken) return null;

  try {
    const renewed = await refreshTokens(refreshToken);
    const renewedClaims = verifyAccessToken(renewed.accessToken);
    if (!renewedClaims || !isAllowedAdmin(renewedClaims)) {
      clearAuthCookies(res);
      return null;
    }
    setAuthCookies(res, renewed);
    return { claims: renewedClaims, tokens: renewed };
  } catch {
    clearAuthCookies(res);
    return null;
  }
}

/**
 * Ce qu'AdminJS affiche comme utilisateur courant. Il le sérialise dans le HTML
 * envoyé au navigateur : rien d'autre que l'identité ne doit y figurer, surtout
 * pas les jetons.
 */
function toCurrentAdmin(claims: JwtClaims) {
  return {
    id: claims.sub,
    email: claims.email,
    role: claims.role,
    title: claims.email,
  };
}

function attach(req: Request, resolved: AuthenticatedRequest): void {
  // AdminJS lit `req.session.adminUser` pour peupler `currentAdmin`
  // (cf. @adminjs/express/lib/buildRouter.js). On lui fournit un objet ordinaire
  // le temps de la requête : aucun store, rien de persisté.
  req.session = { adminUser: toCurrentAdmin(resolved.claims) };
  req.boTokens = resolved.tokens;
}

/** Garde des pages : redirige vers le formulaire de connexion. */
export function requireAdminPage(admin: AdminJS) {
  const { loginPath, rootPath } = admin.options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Les assets sont servis avant l'authentification, sinon la page de
    // connexion elle-même n'a ni JS ni styles. C'est aussi ce que fait
    // buildAuthenticatedRouter, qui monte buildAssets avant sa protection.
    if (req.path.startsWith('/frontend/assets/')) return next();

    const resolved = await resolveAdmin(req, res);
    if (!resolved) {
      return res.redirect(
        `${loginPath}?redirectTo=${encodeURIComponent(rootPath + req.path)}`,
      );
    }
    attach(req, resolved);
    next();
  };
}

/** Garde des routes JSON : 401 plutôt qu'une redirection. */
export async function requireAdminApi(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const resolved = await resolveAdmin(req, res);
  if (!resolved) {
    res.status(401).json({ message: 'Session expirée, reconnecte-toi.' });
    return;
  }
  attach(req, resolved);
  next();
}

// ── Formulaire de connexion ──────────────────────────────────────────────────

export function renderLoginPage(admin: AdminJS) {
  return async (req: Request, res: Response) => {
    const html = await admin.renderLogin({
      action: admin.options.loginPath,
      errorMessage: null,
    });
    res.send(html);
  };
}

export function handleLogin(admin: AdminJS) {
  return async (req: Request, res: Response) => {
    const { email, password } = (req.body ?? {}) as {
      email?: string;
      password?: string;
    };

    const fail = async (status: number) => {
      const html = await admin.renderLogin({
        action: admin.options.loginPath,
        errorMessage: 'invalidCredentials',
      });
      res.status(status).send(html);
    };

    if (!email || !password) return fail(400);

    let tokens: ApiTokens;
    try {
      tokens = await login(email, password);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return fail(400);
      console.error('[auth] login vers l’API en échec :', error);
      return fail(500);
    }

    const claims = verifyAccessToken(tokens.accessToken);
    if (!claims) {
      // Le jeton vient de l'API et ne passe pas notre vérification : les deux
      // JWT_ACCESS_SECRET ne concordent pas.
      console.error(
        '[auth] jeton de l’API refusé à la vérification — JWT_ACCESS_SECRET diffère de celui de l’API ?',
      );
      return fail(500);
    }

    if (!isAllowedAdmin(claims)) {
      console.warn(
        `[auth] ${claims.email} (rôle « ${claims.role} ») refusé à l’entrée du backoffice`,
      );
      return fail(403);
    }

    setAuthCookies(res, tokens);

    const redirectTo =
      typeof req.query.redirectTo === 'string' ? req.query.redirectTo : null;
    // On ne suit que des chemins internes : une URL absolue venue de la query
    // ferait du formulaire de connexion une redirection ouverte.
    const safeRedirect =
      redirectTo && redirectTo.startsWith(admin.options.rootPath)
        ? redirectTo
        : admin.options.rootPath;

    res.redirect(302, safeRedirect);
  };
}

export function handleLogout(admin: AdminJS) {
  return (req: Request, res: Response) => {
    clearAuthCookies(res);
    res.redirect(302, admin.options.loginPath);
  };
}
