import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. Copie .env.sample vers .env.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const env = {
  port: Number(optional('PORT', '4000')),

  /**
   * Le même secret que celui de l'API (JWT_ACCESS_SECRET). Le backoffice n'émet
   * pas de jeton : il vérifie la signature de ceux que l'API a délivrés. Cette
   * vérification n'est pas optionnelle — le token vient d'un cookie, donc du
   * client, et sans elle n'importe qui pourrait forger un `role: admin`.
   */
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),

  // Liste blanche facultative. Vide = tout compte `admin` de l'API entre.
  allowedAdminEmails: optional('ALLOWED_ADMIN_EMAILS', '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),

  apiBaseUrl: optional('API_BASE_URL', 'http://localhost:3000').replace(
    /\/+$/,
    '',
  ),

  db: {
    host: optional('DB_HOST', 'localhost'),
    port: Number(optional('DB_PORT', '5432')),
    username: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
  },

  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? '',
  isProduction: process.env.NODE_ENV === 'production',
} as const;
