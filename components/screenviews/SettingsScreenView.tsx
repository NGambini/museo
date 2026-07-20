import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from '@/components/ui/scroll-view';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Input, InputField, InputSlot, InputIcon } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Pressable } from '@/components/ui/pressable';
import { Alert, AlertIcon, AlertText } from '@/components/ui/alert';
import { FormControl, FormControlLabel, FormControlLabelText, FormControlError, FormControlErrorIcon, FormControlErrorText } from '@/components/ui/form-control';
import { Header } from '@/components/Header';
import { Eye, EyeOff, AlertCircle, MoonStar, KeyRound, Trash2 } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import type { SettingsPasswordErrors } from '@/lib/settingsUtils';

export interface SettingsScreenViewProps {
  darkTheme: boolean;
  onToggleDarkTheme: () => void;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrentPassword: boolean;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onToggleCurrentPassword: () => void;
  onToggleNewPassword: () => void;
  onToggleConfirmPassword: () => void;
  onSubmitPasswordChange: () => void;
  onDeleteAccount: () => void;
  passwordLoading: boolean;
  deleteLoading: boolean;
  passwordError: string | null;
  passwordSuccess: string | null;
  fieldErrors: SettingsPasswordErrors;
}

export function SettingsScreenView({
  darkTheme,
  onToggleDarkTheme,
  currentPassword,
  newPassword,
  confirmPassword,
  showCurrentPassword,
  showNewPassword,
  showConfirmPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onToggleCurrentPassword,
  onToggleNewPassword,
  onToggleConfirmPassword,
  onSubmitPasswordChange,
  onDeleteAccount,
  passwordLoading,
  deleteLoading,
  passwordError,
  passwordSuccess,
  fieldErrors,
}: SettingsScreenViewProps) {
  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background-0">
      <Header title="Settings" />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <VStack space="xl" className="px-4 pt-4">
          <Box className="rounded-2xl border border-outline-200 bg-background-50 p-4">
            <HStack className="items-center justify-between">
              <HStack space="sm" className="items-center flex-1">
                <Box className="rounded-full bg-primary-100 p-2">
                  <MoonStar size={18} color={theme.primary} />
                </Box>
                <VStack className="flex-1 min-w-0">
                  <Text className="text-typography-900 font-semibold break-words">Thème sombre</Text>
                  <Text className="text-typography-500 text-sm break-words">Passez l’application en mode sombre.</Text>
                </VStack>
              </HStack>
              <Switch value={darkTheme} onValueChange={onToggleDarkTheme} />
            </HStack>
          </Box>

          <Box className="rounded-2xl border border-outline-200 bg-background-50 p-4">
            <VStack space="md">
              <HStack space="sm" className="items-center">
                <Box className="rounded-full bg-primary-100 p-2">
                  <KeyRound size={18} color={theme.primary} />
                </Box>
                <VStack className="flex-1 min-w-0">
                  <Heading size="md" className="text-typography-900 break-words">Changer le mot de passe</Heading>
                  <Text className="text-typography-500 text-sm break-words">Renseignez votre mot de passe actuel et choisissez un nouveau mot de passe.</Text>
                </VStack>
              </HStack>

              {passwordError ? (
                <Alert action="error" variant="solid">
                  <AlertIcon as={AlertCircle} />
                  <AlertText>{passwordError}</AlertText>
                </Alert>
              ) : null}

              {passwordSuccess ? (
                <Alert action="success" variant="solid">
                  <AlertIcon as={AlertCircle} />
                  <AlertText>{passwordSuccess}</AlertText>
                </Alert>
              ) : null}

              <FormControl isInvalid={!!fieldErrors.currentPassword}>
                <FormControlLabel>
                  <FormControlLabelText>Mot de passe actuel</FormControlLabelText>
                </FormControlLabel>
                <Input size="lg">
                  <InputField
                    placeholder="Votre mot de passe actuel"
                    secureTextEntry={!showCurrentPassword}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChangeText={onCurrentPasswordChange}
                  />
                  <InputSlot className="pr-3" onPress={onToggleCurrentPassword}>
                    <InputIcon as={showCurrentPassword ? EyeOff : Eye} className="text-typography-500" />
                  </InputSlot>
                </Input>
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircle} />
                  <FormControlErrorText>{fieldErrors.currentPassword}</FormControlErrorText>
                </FormControlError>
              </FormControl>

              <FormControl isInvalid={!!fieldErrors.newPassword}>
                <FormControlLabel>
                  <FormControlLabelText>Nouveau mot de passe</FormControlLabelText>
                </FormControlLabel>
                <Input size="lg">
                  <InputField
                    placeholder="8 caractères minimum"
                    secureTextEntry={!showNewPassword}
                    autoComplete="new-password"
                    value={newPassword}
                    onChangeText={onNewPasswordChange}
                  />
                  <InputSlot className="pr-3" onPress={onToggleNewPassword}>
                    <InputIcon as={showNewPassword ? EyeOff : Eye} className="text-typography-500" />
                  </InputSlot>
                </Input>
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircle} />
                  <FormControlErrorText>{fieldErrors.newPassword}</FormControlErrorText>
                </FormControlError>
              </FormControl>

              <FormControl isInvalid={!!fieldErrors.confirmPassword}>
                <FormControlLabel>
                  <FormControlLabelText>Confirmer le nouveau mot de passe</FormControlLabelText>
                </FormControlLabel>
                <Input size="lg">
                  <InputField
                    placeholder="Confirmez votre nouveau mot de passe"
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChangeText={onConfirmPasswordChange}
                  />
                  <InputSlot className="pr-3" onPress={onToggleConfirmPassword}>
                    <InputIcon as={showConfirmPassword ? EyeOff : Eye} className="text-typography-500" />
                  </InputSlot>
                </Input>
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircle} />
                  <FormControlErrorText>{fieldErrors.confirmPassword}</FormControlErrorText>
                </FormControlError>
              </FormControl>

              <Button size="lg" onPress={onSubmitPasswordChange} isDisabled={passwordLoading}>
                {passwordLoading ? <ButtonSpinner /> : null}
                <ButtonText>{passwordLoading ? 'Enregistrement...' : 'Enregistrer'}</ButtonText>
              </Button>
            </VStack>
          </Box>

          <Box className="rounded-2xl border border-error-200 bg-error-50 p-4">
            <VStack space="md">
              <HStack space="sm" className="items-center">
                <Box className="rounded-full bg-error-100 p-2">
                  <Trash2 size={18} color={theme.secondary} />
                </Box>
                <VStack className="flex-1 min-w-0">
                  <Heading size="md" className="text-typography-900 break-words">Supprimer mon compte</Heading>
                  <Text className="text-typography-500 text-sm break-words">Cette action est définitive et supprimera vos données associées.</Text>
                </VStack>
              </HStack>

              {fieldErrors.deleteAccount ? (
                <Alert action="error" variant="solid">
                  <AlertIcon as={AlertCircle} />
                  <AlertText>{fieldErrors.deleteAccount}</AlertText>
                </Alert>
              ) : null}

              <Button action="negative" size="lg" onPress={onDeleteAccount} isDisabled={deleteLoading}>
                {deleteLoading ? <ButtonSpinner /> : null}
                <ButtonText>{deleteLoading ? 'Suppression...' : 'Supprimer mon compte'}</ButtonText>
              </Button>
            </VStack>
          </Box>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
