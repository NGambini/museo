// Two roles for now: generating an audioguide costs Gemini + TTS calls, so it
// stays reserved for administrators. Regular accounts read the catalogue that
// has already been generated.
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}
