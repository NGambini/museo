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
import { requestContext } from '../api/request-context.js';

/**
 * Stateless authentication.
 *
 * The tokens issued by the API live in two httpOnly cookies; there is no session
 * table and no store on the backoffice side. Every request re-verifies the
 * access token's signature and re-reads the role, so a demotion in the database
 * takes effect no later than the current token's expiry.
 */
const ACCESS_COOKIE = 'bo_at';
const REFRESH_COOKIE = 'bo_rt';

// Cookies carry the lifetime of the API's refresh token (7 days). Actual
// validity remains each token's own `exp`, checked on every request.
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
 * Verifies an access token's signature and expiry.
 *
 * `algorithms` is pinned on purpose: without that constraint, jsonwebtoken would
 * trust the algorithm advertised in the token's own header, which opens the door
 * to algorithm-confusion attacks.
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

/** Is this account allowed in? The role decides, the allowlist narrows further. */
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
 * Resolves the current request into an authenticated admin, refreshing the tokens
 * along the way if the access token has expired. Returns null when there is
 * nothing usable.
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
 * What AdminJS shows as the current user. It serialises this into the HTML sent
 * to the browser, so nothing beyond identity belongs here — least of all the
 * tokens.
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
  // AdminJS reads `req.session.adminUser` to populate `currentAdmin`
  // (see @adminjs/express/lib/buildRouter.js). We hand it a plain object for the
  // lifetime of the request: no store, nothing persisted.
  req.session = { adminUser: toCurrentAdmin(resolved.claims) };
  req.boTokens = resolved.tokens;
}

/** Page guard: redirects to the login form. */
export function requireAdminPage(admin: AdminJS) {
  const { loginPath, rootPath } = admin.options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Assets are served before authentication, otherwise the login page itself
    // would have no JS and no styles. buildAuthenticatedRouter does the same,
    // mounting buildAssets ahead of its own protection.
    if (req.path.startsWith('/frontend/assets/')) return next();

    const resolved = await resolveAdmin(req, res);
    if (!resolved) {
      return res.redirect(
        `${loginPath}?redirectTo=${encodeURIComponent(rootPath + req.path)}`,
      );
    }
    attach(req, resolved);
    // Everything downstream runs inside the context, so the AdminJS resources
    // can reach the tokens without being handed the request.
    requestContext.run({ tokens: resolved.tokens, res }, () => next());
  };
}

/** JSON route guard: 401 rather than a redirect. */
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
  requestContext.run({ tokens: resolved.tokens, res }, () => next());
}

// ── Login form ───────────────────────────────────────────────────────────────

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
      console.error('[auth] login against the API failed:', error);
      return fail(500);
    }

    const claims = verifyAccessToken(tokens.accessToken);
    if (!claims) {
      // The token came from the API and fails our own verification: the two
      // JWT_ACCESS_SECRET values do not match.
      console.error(
        "[auth] token from the API failed verification — does JWT_ACCESS_SECRET differ from the API's?",
      );
      return fail(500);
    }

    if (!isAllowedAdmin(claims)) {
      console.warn(
        `[auth] ${claims.email} (role "${claims.role}") denied entry to the backoffice`,
      );
      return fail(403);
    }

    setAuthCookies(res, tokens);

    const redirectTo =
      typeof req.query.redirectTo === 'string' ? req.query.redirectTo : null;
    // Only internal paths are followed: an absolute URL coming from the query
    // string would turn the login form into an open redirect.
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
