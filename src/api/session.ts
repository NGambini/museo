import type { Request } from 'express';
import type { ApiTokens } from './client.js';
import type { JwtClaims } from './client.js';

/**
 * Augmentations posées par la garde d'authentification, le temps d'une requête.
 *
 * `session` n'est pas une session : c'est l'objet ordinaire qu'AdminJS s'attend
 * à trouver pour peupler `currentAdmin`. Rien n'est stocké côté serveur.
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
