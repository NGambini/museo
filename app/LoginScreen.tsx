import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  LoginScreenView,
  type LoginFieldErrors,
} from '@/components/screenviews/LoginScreenView';
import { useLogin } from '@/api/auth';

export default function LoginScreen() {
  const router = useRouter();
  const loginMutation = useLogin();

  const [email, setEmail] = useState('noe@noe.test');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
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

  function handleSubmit() {
    if (!validate()) return;
    loginMutation.mutate(
      { email: email.trim(), password },
      { onSuccess: () => router.replace('/(tabs)/ExploreScreen') }
    );
  }

  const globalError = loginMutation.error
    ? (loginMutation.error as { status?: number }).status === 401
      ? 'Identifiants incorrects. Veuillez réessayer.'
      : 'Une erreur est survenue. Veuillez réessayer.'
    : null;

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
      loading={loginMutation.isPending}
      globalError={globalError}
      fieldErrors={fieldErrors}
      onSubmit={handleSubmit}
      onNavigateToSignup={() => router.push('/SignupScreen')}
    />
  );
}
