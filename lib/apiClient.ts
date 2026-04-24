import { API_BASE_URL } from '@/constants/api';
import { tokenStore } from './tokenStore';

type RequestConfig = RequestInit & { _retry?: boolean };

async function refreshTokens(): Promise<string> {
  const refreshToken = await tokenStore.getRefreshToken();
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${refreshToken}` },
  });
  if (!res.ok) {
    await tokenStore.clearTokens();
    throw new Error('Session expirée, veuillez vous reconnecter.');
  }
  const data = await res.json();
  await tokenStore.setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

export async function apiFetch<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const token = await tokenStore.getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(config.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, { ...config, headers });

  if (res.status === 401 && !config._retry) {
    const newToken = await refreshTokens();
    return apiFetch<T>(path, {
      ...config,
      _retry: true,
      headers: { ...headers, Authorization: `Bearer ${newToken}` },
    });
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json();

  if (!res.ok) {
    const error = new Error(body?.message ?? 'Erreur réseau') as Error & { status: number; body: unknown };
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return body as T;
}
