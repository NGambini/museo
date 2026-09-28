import { AsyncLocalStorage } from 'node:async_hooks';
import type { Response } from 'express';
import type { ApiTokens } from './client.js';

export interface RequestContext {
  tokens: ApiTokens;
  /** Needed to rewrite the cookies when the API rotates the tokens. */
  res: Response;
}

/**
 * Carries the signed-in admin's tokens down to the AdminJS resources.
 *
 * AdminJS calls `resource.find()` and friends without handing them the Express
 * request, so there is no way to thread credentials through as an argument.
 * AsyncLocalStorage keeps them attached to the async call chain instead, which
 * means every API call the backoffice makes is attributed to the admin who
 * actually triggered it rather than to a shared service account.
 */
export const requestContext = new AsyncLocalStorage<RequestContext>();

export function currentContext(): RequestContext {
  const store = requestContext.getStore();
  if (!store) {
    throw new Error(
      'No request context: an API call was made outside the authenticated middleware.',
    );
  }
  return store;
}
