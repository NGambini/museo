import { BaseProperty } from 'adminjs';
import type { ResourceWithOptions } from 'adminjs';
import { ApiResource } from '../api-resource.js';
import { adminApi, type AdminUser } from '../../api/admin-client.js';

/**
 * Accounts are read-only here, with one exception: the role. Creating an
 * account goes through POST /auth/signup, which hashes the password, and the
 * API never exposes that column in the first place.
 */
const userResourceInstance = new ApiResource<AdminUser>({
  id: 'User',
  properties: [
    new BaseProperty({ path: 'id', type: 'uuid', isId: true, position: 0 }),
    new BaseProperty({ path: 'email', type: 'string', position: 1 }),
    new BaseProperty({ path: 'role', type: 'string', position: 2 }),
    new BaseProperty({ path: 'createdAt', type: 'datetime', position: 3 }),
    new BaseProperty({ path: 'updatedAt', type: 'datetime', position: 4 }),
  ],
  filterParams: { email: 'email', role: 'role' },
  list: (params) => adminApi.users.list(params),
  get: (id) => adminApi.users.get(id),
  update: (id, params) => adminApi.users.updateRole(id, String(params.role)),
});

export const userResource: ResourceWithOptions = {
  resource: userResourceInstance,
  options: {
    id: 'User',
    navigation: { name: null, icon: 'User' },
    listProperties: ['email', 'role', 'createdAt'],
    filterProperties: ['email', 'role'],
    showProperties: ['email', 'role', 'createdAt', 'updatedAt'],
    editProperties: ['role'],
    sort: { direction: 'desc', sortBy: 'createdAt' },
    properties: {
      id: {
        isVisible: { list: false, show: true, edit: false, filter: false },
      },
      email: { isTitle: true },
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
