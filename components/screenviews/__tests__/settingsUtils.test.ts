import { validatePasswordChange } from '../settingsUtils';

describe('validatePasswordChange', () => {
  it('returns errors when required fields are missing', () => {
    const result = validatePasswordChange({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });

    expect(result.currentPassword).toBe('Veuillez entrer votre mot de passe actuel.');
    expect(result.newPassword).toBe('Un nouveau mot de passe est requis.');
    expect(result.confirmPassword).toBe('Veuillez confirmer votre mot de passe.');
  });

  it('returns an error when the new password is too short', () => {
    const result = validatePasswordChange({
      currentPassword: 'oldpassword',
      newPassword: '1234',
      confirmPassword: '1234',
    });

    expect(result.newPassword).toBe('Le mot de passe doit contenir au moins 8 caractères.');
  });

  it('returns an error when confirmation does not match', () => {
    const result = validatePasswordChange({
      currentPassword: 'oldpassword',
      newPassword: 'newpassword1',
      confirmPassword: 'newpassword2',
    });

    expect(result.confirmPassword).toBe('Les mots de passe ne correspondent pas.');
  });
});
