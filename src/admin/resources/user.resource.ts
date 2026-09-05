import type { ResourceWithOptions } from 'adminjs';
import { User } from '../../entities/user.entity.js';

/**
 * Les comptes sont en lecture seule ici, à une exception près : le rôle.
 * Créer un compte passe par POST /auth/signup (l'API hache le mot de passe) ;
 * le backoffice ne doit jamais écrire dans la colonne `password`.
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
        // Libellés volontairement courts : en liste, AdminJS les passe dans
        // `startCase` de lodash, qui déburre les accents et découpe la
        // ponctuation. Le détail est dans la description ci-dessous.
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
