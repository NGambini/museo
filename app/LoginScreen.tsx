import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  LoginScreenView,
  type LoginFieldErrors,
} from '@/components/screenviews/LoginScreenView';
import { API_BASE_URL } from '@/constants/api';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});

  function validate(): boolean {
    const errors: LoginFieldErrors = {};
    if (!email.trim()) {
      errors.email = "L'adresse e-mail est requise.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "L'adresse e-mail n'est pas valide.";
    }
    if (!password) {
      errors.password = 'Le mot de passe est requis.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    setGlobalError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (response.status === 401) {
        setGlobalError('Identifiants incorrects. Veuillez réessayer.');
        return;
      }
      if (!response.ok) {
        setGlobalError('Une erreur est survenue. Veuillez réessayer.');
        return;
      }

      // TODO: stocker les tokens (access_token, refresh_token)
      // const { access_token, refresh_token } = await response.json();
      router.replace('/(tabs)/ExploreScreen');
    } catch {
      setGlobalError(
        'Impossible de contacter le serveur. Vérifiez votre connexion.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginScreenView
      email={email}
      onEmailChange={(v) => {
        setEmail(v);
        setFieldErrors((prev) => ({ ...prev, email: undefined }));
      }}
      password={password}
      onPasswordChange={(v) => {
        setPassword(v);
        setFieldErrors((prev) => ({ ...prev, password: undefined }));
      }}
      showPassword={showPassword}
      onToggleShowPassword={() => setShowPassword((v) => !v)}
      loading={loading}
      globalError={globalError}
      fieldErrors={fieldErrors}
      onSubmit={handleSubmit}
      onNavigateToSignup={() => router.push('/SignupScreen')}
    />
  );
}
