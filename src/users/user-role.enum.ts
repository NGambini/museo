// Deux rôles seulement pour l'instant : la génération d'un audioguide coûte des
// appels Gemini + TTS, elle reste donc réservée aux administrateurs. Les comptes
// ordinaires consultent le catalogue déjà généré.
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}
