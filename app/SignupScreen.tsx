import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  SignupScreenView,
  type SignupFieldErrors,
} from '@/components/screenviews/SignupScreenView';
import { API_BASE_URL } from '@/constants/api';

export default function SignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});

  function validate(): boolean {
    const errors: SignupFieldErrors = {};
    if (!email.trim()) {
      errors.email = "L'adresse e-mail est requise.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "L'adresse e-mail n'est pas valide.";
    }
    if (!password) {
      errors.password = 'Le mot de passe est requis.';
    } else if (password.length < 8) {
      errors.password = 'Le mot de passe doit contenir au moins 8 caractères.';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Veuillez confirmer votre mot de passe.';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    setGlobalError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (response.status === 409) {
        setFieldErrors((prev) => ({
          ...prev,
          email: 'Cette adresse e-mail est déjà utilisée.',
        }));
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
    <SignupScreenView
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
      confirmPassword={confirmPassword}
      onConfirmPasswordChange={(v) => {
        setConfirmPassword(v);
        setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
      }}
      showPassword={showPassword}
      onToggleShowPassword={() => setShowPassword((v) => !v)}
      showConfirmPassword={showConfirmPassword}
      onToggleShowConfirmPassword={() => setShowConfirmPassword((v) => !v)}
      loading={loading}
      globalError={globalError}
      fieldErrors={fieldErrors}
      onSubmit={handleSubmit}
      onNavigateToLogin={() => router.push('/LoginScreen')}
    />
  );
}
