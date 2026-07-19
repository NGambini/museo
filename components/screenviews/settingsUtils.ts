export type SettingsPasswordErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  deleteAccount?: string;
};

export function validatePasswordChange(values: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): SettingsPasswordErrors {
  const errors: SettingsPasswordErrors = {};

  if (!values.currentPassword.trim()) {
    errors.currentPassword = 'Veuillez entrer votre mot de passe actuel.';
  }

  if (!values.newPassword) {
    errors.newPassword = 'Un nouveau mot de passe est requis.';
  } else if (values.newPassword.length < 8) {
    errors.newPassword = 'Le mot de passe doit contenir au moins 8 caractères.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Veuillez confirmer votre mot de passe.';
  } else if (values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = 'Les mots de passe ne correspondent pas.';
  }

  return errors;
}
