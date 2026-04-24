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

export type SignupFieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export interface SignupScreenViewProps {
  email: string;
  onEmailChange: (v: string) => void;
  password: string;
  onPasswordChange: (v: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (v: string) => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  showConfirmPassword: boolean;
  onToggleShowConfirmPassword: () => void;
  loading: boolean;
  globalError: string | null;
  fieldErrors: SignupFieldErrors;
  onSubmit: () => void;
  onNavigateToLogin: () => void;
}

export function SignupScreenView({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  showPassword,
  onToggleShowPassword,
  showConfirmPassword,
  onToggleShowConfirmPassword,
  loading,
  globalError,
  fieldErrors,
  onSubmit,
  onNavigateToLogin,
}: SignupScreenViewProps) {
  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="Rejoignez-nous pour découvrir vos audioguides."
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
              placeholder="8 caractères minimum"
              secureTextEntry={!showPassword}
              autoComplete="new-password"
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

        <FormControl isInvalid={!!fieldErrors.confirmPassword}>
          <FormControlLabel>
            <FormControlLabelText>Confirmer le mot de passe</FormControlLabelText>
          </FormControlLabel>
          <Input size="lg">
            <InputField
              placeholder="••••••••"
              secureTextEntry={!showConfirmPassword}
              autoComplete="new-password"
              value={confirmPassword}
              onChangeText={onConfirmPasswordChange}
            />
            <InputSlot className="pr-3" onPress={onToggleShowConfirmPassword}>
              <InputIcon
                as={showConfirmPassword ? EyeOff : Eye}
                className="text-typography-500"
              />
            </InputSlot>
          </Input>
          <FormControlError>
            <FormControlErrorIcon as={AlertCircle} />
            <FormControlErrorText>
              {fieldErrors.confirmPassword}
            </FormControlErrorText>
          </FormControlError>
        </FormControl>

        <Button size="lg" className="mt-2" onPress={onSubmit} isDisabled={loading}>
          {loading ? <ButtonSpinner /> : null}
          <ButtonText>{loading ? 'Inscription...' : "S'inscrire"}</ButtonText>
        </Button>

        <HStack className="justify-center items-center" space="xs">
          <Text size="sm" className="text-typography-500">
            Déjà un compte ?
          </Text>
          <Pressable onPress={onNavigateToLogin}>
            <Text size="sm" className="text-primary-600 font-semibold">
              Se connecter
            </Text>
          </Pressable>
        </HStack>
      </VStack>
    </AuthLayout>
  );
}
