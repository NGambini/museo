import { env } from '../config/env.js';
import type { components, paths } from '../types/api.js';
import type { AudioguideAttributes } from '../types/attributes.js';

/**
 * Schemas generated from the NestJS API's OpenAPI spec, with one correction: the
 * API documents `attributes` as a free-form object (the jsonb has no declared
 * schema), which the generator turns into `Record<string, never>` — unusable.
 * The real, hand-written shape is substituted for it.
 */
export type ApiAudioguide = Omit<
  components['schemas']['Audioguide'],
  'attributes'
> & { attributes: AudioguideAttributes };
export type ApiPaginatedAudioguides =
  components['schemas']['PaginatedAudioguides'];
export type GenerateAudioguideBody =
  paths['/audioguides/generate']['post']['requestBody']['content']['application/json'];

// The API's /auth routes document their responses in prose, with no schema:
// this contract is hand-written and cannot be generated.
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
 * Reads an access token's claims without verifying the signature. Only ever call
 * this on a token the API just handed us over our own connection — anything that
 * came back from a client must go through `verifyAccessToken` instead.
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
 * Authenticated call with transparent rotation: on a 401, refresh once and replay
 * the request. The API's access tokens live 15 minutes; a backoffice sitting is
 * usually much longer.
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
