import React from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { AuthLayout } from './AuthLayout';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Input, InputField, InputSlot, InputIcon } from '@/components/ui/input';
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
} from '@/components/ui/form-control';
import { Text } from '@/components/ui/text';
import { Alert, AlertIcon, AlertText } from '@/components/ui/alert';
import { Pressable } from '@/components/ui/pressable';

export type LoginFieldErrors = {
  email?: string;
  password?: string;
};

export interface LoginScreenViewProps {
  email: string;
  onEmailChange: (v: string) => void;
  password: string;
  onPasswordChange: (v: string) => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  loading: boolean;
  globalError: string | null;
  fieldErrors: LoginFieldErrors;
  onSubmit: () => void;
  onNavigateToSignup: () => void;
}

export function LoginScreenView({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  showPassword,
  onToggleShowPassword,
  loading,
  globalError,
  fieldErrors,
  onSubmit,
  onNavigateToSignup,
}: LoginScreenViewProps) {
  return (
    <AuthLayout
      title="Connexion"
      subtitle="Bon retour ! Connectez-vous pour continuer."
    >
      <VStack space="lg">
        {globalError ? (
          <Alert action="error" variant="solid">
            <AlertIcon as={AlertCircle} />
            <AlertText>{globalError}</AlertText>
          </Alert>
        ) : null}

        <FormControl isInvalid={!!fieldErrors.email}>
          <FormControlLabel>
            <FormControlLabelText>Adresse e-mail</FormControlLabelText>
          </FormControlLabel>
          <Input size="lg">
            <InputField
              placeholder="vous@exemple.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={onEmailChange}
            />
          </Input>
          <FormControlError>
            <FormControlErrorIcon as={AlertCircle} />
            <FormControlErrorText>{fieldErrors.email}</FormControlErrorText>
          </FormControlError>
        </FormControl>

        <FormControl isInvalid={!!fieldErrors.password}>
          <FormControlLabel>
            <FormControlLabelText>Mot de passe</FormControlLabelText>
          </FormControlLabel>
          <Input size="lg">
            <InputField
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              autoComplete="current-password"
              value={password}
              onChangeText={onPasswordChange}
            />
            <InputSlot className="pr-3" onPress={onToggleShowPassword}>
              <InputIcon
                as={showPassword ? EyeOff : Eye}
                className="text-typography-500"
              />
            </InputSlot>
          </Input>
          <FormControlError>
            <FormControlErrorIcon as={AlertCircle} />
            <FormControlErrorText>{fieldErrors.password}</FormControlErrorText>
          </FormControlError>
        </FormControl>

        <Button size="lg" className="mt-2" onPress={onSubmit} isDisabled={loading}>
          {loading ? <ButtonSpinner /> : null}
          <ButtonText>{loading ? 'Connexion...' : 'Se connecter'}</ButtonText>
        </Button>

        <HStack className="justify-center items-center" space="xs">
          <Text size="sm" className="text-typography-500">
            Pas encore de compte ?
          </Text>
          <Pressable onPress={onNavigateToSignup}>
            <Text size="sm" className="text-primary-600 font-semibold">
              S'inscrire
            </Text>
          </Pressable>
        </HStack>
      </VStack>
    </AuthLayout>
  );
}
