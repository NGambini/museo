import type { ResourceWithOptions } from 'adminjs';
import { User } from '../../entities/user.entity.js';

/**
 * Accounts are read-only here, with one exception: the role. Creating an account
 * goes through POST /auth/signup (the API hashes the password); the backoffice
 * must never write to the `password` column.
 */
export const userResource: ResourceWithOptions = {
  resource: User,
  options: {
    id: 'User',
    navigation: { name: null, icon: 'User' },
    listProperties: ['email', 'role', 'createdAt'],
    filterProperties: ['email', 'role', 'createdAt'],
    showProperties: ['email', 'role', 'createdAt', 'updatedAt'],
    editProperties: ['role'],
    sort: { direction: 'desc', sortBy: 'createdAt' },
    properties: {
      email: { isTitle: true },
      password: { isVisible: false },
      refreshToken: { isVisible: false },
      role: {
        // Deliberately short labels: in list view AdminJS runs them through
        // lodash's `startCase`, which strips accents and splits on punctuation.
        // The detail lives in the description below.
        availableValues: [
          { value: 'admin', label: 'Admin' },
          { value: 'user', label: 'User' },
        ],
        description:
          'Admin : peut générer un audioguide et accéder à ce backoffice. User : lecture seule.',
      },
    },
    actions: {
      new: { isAccessible: false },
      delete: { isAccessible: false },
      bulkDelete: { isAccessible: false },
    },
  },
};
