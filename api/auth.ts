import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { tokenStore } from '@/lib/tokenStore';

type AuthTokens = { accessToken: string; refreshToken: string };

async function login(input: { email: string; password: string }): Promise<AuthTokens> {
  const data = await apiFetch<AuthTokens>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  await tokenStore.setTokens(data.accessToken, data.refreshToken);
  return data;
}

async function signup(input: { email: string; password: string }): Promise<AuthTokens> {
  const data = await apiFetch<AuthTokens>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  await tokenStore.setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } finally {
    await tokenStore.clearTokens();
  }
}

export function useLogin() {
  return useMutation({ mutationFn: login });
}

export function useSignup() {
  return useMutation({ mutationFn: signup });
}
