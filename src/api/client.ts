import { env } from '../config/env.js';
import type { components, paths } from '../types/api.js';
import type { AudioguideAttributes } from '../types/attributes.js';

/**
 * Schémas issus de la spec OpenAPI de l'API NestJS, à une correction près :
 * l'API documente `attributes` comme un objet libre (le jsonb n'a pas de schéma
 * déclaré), ce que le générateur traduit par `Record<string, never>` —
 * inutilisable. On y substitue la forme réelle, écrite à la main.
 */
export type ApiAudioguide = Omit<
  components['schemas']['Audioguide'],
  'attributes'
> & { attributes: AudioguideAttributes };
export type ApiPaginatedAudioguides =
  components['schemas']['PaginatedAudioguides'];
export type GenerateAudioguideBody =
  paths['/audioguides/generate']['post']['requestBody']['content']['application/json'];

// Les routes /auth de l'API documentent leurs réponses en texte libre, sans
// schéma : ce contrat-là est écrit à la main et ne peut pas être généré.
export interface ApiTokens {
  accessToken: string;
  refreshToken: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function readError(res: Response): Promise<string> {
  const body: unknown = await res.json().catch(() => null);
  if (body && typeof body === 'object' && 'message' in body) {
    const { message } = body as { message: unknown };
    return Array.isArray(message) ? message.join(', ') : String(message);
  }
  return res.statusText || `HTTP ${res.status}`;
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) throw new ApiError(res.status, await readError(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function login(email: string, password: string): Promise<ApiTokens> {
  return call<ApiTokens>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function refreshTokens(refreshToken: string): Promise<ApiTokens> {
  return call<ApiTokens>('/auth/refresh', {
    method: 'POST',
    headers: { Authorization: `Bearer ${refreshToken}` },
  });
}

export interface JwtClaims {
  sub: string;
  email: string;
  role: 'admin' | 'user';
  exp: number;
}

/**
 * Lit les claims d'un access token. Pas de vérification de signature : ce token
 * nous a été remis à l'instant par l'API elle-même, il ne transite pas par
 * l'utilisateur. C'est l'API qui reste l'autorité — le backoffice s'en sert
 * uniquement pour savoir quoi afficher.
 */
export function decodeJwt(token: string): JwtClaims | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

/**
 * Appel authentifié avec rotation transparente : sur 401, on tente un refresh
 * puis on rejoue la requête une fois. Les access tokens de l'API vivent 15
 * minutes, une session de backoffice bien plus longtemps.
 */
export async function authedCall<T>(
  path: string,
  init: RequestInit,
  tokens: ApiTokens,
  onRenewed: (tokens: ApiTokens) => void,
): Promise<T> {
  const withAuth = (accessToken: string): RequestInit => ({
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  try {
    return await call<T>(path, withAuth(tokens.accessToken));
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;

    const renewed = await refreshTokens(tokens.refreshToken);
    onRenewed(renewed);
    return call<T>(path, withAuth(renewed.accessToken));
  }
}
