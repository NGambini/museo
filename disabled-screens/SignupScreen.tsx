import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  SignupScreenView,
  type SignupFieldErrors,
} from '@/components/screenviews/SignupScreenView';
import { useSignup } from '@/api/auth';

export default function SignupScreen() {
  const router = useRouter();
  const signupMutation = useSignup();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  function handleSubmit() {
    if (!validate()) return;
    signupMutation.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => router.replace('/HomeScreen'),
        onError: (error) => {
          if ((error as { status?: number }).status === 409) {
            setFieldErrors((prev) => ({
              ...prev,
              email: 'Cette adresse e-mail est déjà utilisée.',
            }));
          }
        },
      }
    );
  }

  const globalError =
    signupMutation.error && (signupMutation.error as { status?: number }).status !== 409
      ? 'Une erreur est survenue. Veuillez réessayer.'
      : null;

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
      loading={signupMutation.isPending}
      globalError={globalError}
      fieldErrors={fieldErrors}
      onSubmit={handleSubmit}
      onNavigateToLogin={() => router.push('/LoginScreen')}
    />
  );
}
