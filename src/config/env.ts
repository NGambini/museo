import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}. Copy .env.sample to .env.`,
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
   * The same secret as the API's (JWT_ACCESS_SECRET). The backoffice issues no
   * token: it verifies the signature of the ones the API handed out. That check
   * is not optional — the token arrives from a cookie, so from the client, and
   * without it anyone could forge a `role: admin`.
   */
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),

  // Optional allowlist. Empty means any `admin` account of the API gets in.
  allowedAdminEmails: optional('ALLOWED_ADMIN_EMAILS', '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),

  apiBaseUrl: optional('API_BASE_URL', 'http://localhost:3000').replace(
    /\/+$/,
    '',
  ),

  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? '',
  isProduction: process.env.NODE_ENV === 'production',
} as const;
