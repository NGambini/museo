import { API_BASE_URL } from '@/constants/api';

export async function apiFetch<T>(path: string, config: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...config,
    headers: {
      'Content-Type': 'application/json',
      ...(config.headers as Record<string, string>),
    },
  });

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
