import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { tokenStore } from '@/lib/tokenStore';
import { clearHistory } from '@/lib/historyStore';
import { useAuth } from '@/providers/AuthProvider';

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
    await Promise.all([tokenStore.clearTokens(), clearHistory()]);
  }
}

export function useLogin() {
  const { signIn } = useAuth();
  return useMutation({ mutationFn: login, onSuccess: signIn });
}

export function useSignup() {
  const { signIn } = useAuth();
  return useMutation({ mutationFn: signup, onSuccess: signIn });
}

export function useLogout() {
  const { signOut } = useAuth();
  return useMutation({ mutationFn: logout, onSuccess: signOut });
}
