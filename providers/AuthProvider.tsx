import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { tokenStore } from '@/lib/tokenStore';
import { refreshTokens, setUnauthorizedHandler } from '@/lib/apiClient';
import { clearHistory } from '@/lib/historyStore';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  signIn: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');

  const signOut = useCallback(async () => {
    await Promise.all([tokenStore.clearTokens(), clearHistory()]);
    setStatus('unauthenticated');
  }, []);

  const signIn = useCallback(() => setStatus('authenticated'), []);

  useEffect(() => {
    setUnauthorizedHandler(() => setStatus('unauthenticated'));
  }, []);

  useEffect(() => {
    (async () => {
      const refreshToken = await tokenStore.getRefreshToken();
      if (!refreshToken) {
        setStatus('unauthenticated');
        return;
      }
      try {
        await refreshTokens();
        setStatus('authenticated');
      } catch {
        setStatus('unauthenticated');
      }
    })();
  }, []);

  return (
    <AuthContext.Provider value={{ status, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
