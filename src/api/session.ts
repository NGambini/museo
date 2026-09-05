import type { Request } from 'express';
import type { ApiTokens } from './client.js';
import type { JwtClaims } from './client.js';

/**
 * Augmentations set by the auth guard, for the lifetime of one request.
 *
 * `session` is not a session: it is the plain object AdminJS expects to find in
 * order to populate `currentAdmin`. Nothing is stored server-side.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: {
        adminUser?: {
          id: string;
          email: string;
          role: JwtClaims['role'];
          title: string;
        };
      };
      boTokens?: ApiTokens;
    }
  }
}

export {};
