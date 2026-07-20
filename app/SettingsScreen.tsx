import React, { useState } from 'react';
import { useColorScheme } from 'nativewind';
import { SettingsScreenView } from '@/components/screenviews/SettingsScreenView';
import { validatePasswordChange, type SettingsPasswordErrors } from '@/lib/settingsUtils';

export default function SettingsScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();

  const [darkTheme, setDarkTheme] = useState(colorScheme === 'dark');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<SettingsPasswordErrors>({});
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleToggleTheme = () => {
    const nextMode = !darkTheme;
    setDarkTheme(nextMode);
    setColorScheme(nextMode ? 'dark' : 'light');
  };

  const handlePasswordSubmit = () => {
    const errors = validatePasswordChange({ currentPassword, newPassword, confirmPassword });
    setFieldErrors(errors);
    setPasswordError(null);
    setPasswordSuccess(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setPasswordLoading(true);
    setTimeout(() => {
      setPasswordLoading(false);
      setPasswordSuccess('Votre mot de passe a été mis à jour.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 600);
  };

  const handleDeleteAccount = () => {
    setDeleteLoading(true);
    setTimeout(() => {
      setDeleteLoading(false);
      setFieldErrors((prev) => ({ ...prev, deleteAccount: 'La suppression de compte sera bientôt disponible.' }));
    }, 500);
  };

  return (
    <SettingsScreenView
      darkTheme={darkTheme}
      onToggleDarkTheme={handleToggleTheme}
      currentPassword={currentPassword}
      newPassword={newPassword}
      confirmPassword={confirmPassword}
      showCurrentPassword={showCurrentPassword}
      showNewPassword={showNewPassword}
      showConfirmPassword={showConfirmPassword}
      onCurrentPasswordChange={(value) => {
        setCurrentPassword(value);
        setFieldErrors((prev) => ({ ...prev, currentPassword: undefined }));
      }}
      onNewPasswordChange={(value) => {
        setNewPassword(value);
        setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
      }}
      onConfirmPasswordChange={(value) => {
        setConfirmPassword(value);
        setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
      }}
      onToggleCurrentPassword={() => setShowCurrentPassword((value) => !value)}
      onToggleNewPassword={() => setShowNewPassword((value) => !value)}
      onToggleConfirmPassword={() => setShowConfirmPassword((value) => !value)}
      onSubmitPasswordChange={handlePasswordSubmit}
      onDeleteAccount={handleDeleteAccount}
      passwordLoading={passwordLoading}
      deleteLoading={deleteLoading}
      passwordError={passwordError}
      passwordSuccess={passwordSuccess}
      fieldErrors={fieldErrors}
    />
  );
}
