import { BaseProperty, ValidationError } from 'adminjs';
import type { ActionRequest, ResourceWithOptions } from 'adminjs';
import { Components } from '../component-loader.js';
import { ApiResource } from '../api-resource.js';
import { adminApi, type AdminAudioguide } from '../../api/admin-client.js';

/** Columns the API accepts in a PATCH. Anything else is dropped. */
const EDITABLE_FIELDS = [
  'placeName',
  'city',
  'placeId',
  'lang',
  'latitude',
  'longitude',
  'attributes',
] as const;

const audioguideResourceInstance = new ApiResource<AdminAudioguide>({
  id: 'Audioguide',
  properties: [
    new BaseProperty({ path: 'id', type: 'uuid', isId: true, position: 0 }),
    new BaseProperty({ path: 'placeName', type: 'string', position: 1 }),
    new BaseProperty({ path: 'city', type: 'string', position: 2 }),
    new BaseProperty({ path: 'placeId', type: 'string', position: 3 }),
    new BaseProperty({ path: 'lang', type: 'string', position: 4 }),
    new BaseProperty({ path: 'latitude', type: 'float', position: 5 }),
    new BaseProperty({ path: 'longitude', type: 'float', position: 6 }),
    // `mixed` keeps AdminJS from trying to render the jsonb as a scalar; the
    // custom components take over anyway.
    new BaseProperty({
      path: 'attributes',
      type: 'mixed',
      isSortable: false,
      position: 7,
    }),
    new BaseProperty({ path: 'createdAt', type: 'datetime', position: 8 }),
    new BaseProperty({ path: 'updatedAt', type: 'datetime', position: 9 }),
  ],
  filterParams: {
    placeName: 'place_name',
    city: 'city',
    placeId: 'place_id',
    lang: 'lang',
  },
  list: (params) => adminApi.audioguides.list(params),
  get: (id) => adminApi.audioguides.get(id),
  update: (id, params) => {
    const body: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (params[field] !== undefined) body[field] = params[field];
    }
    return adminApi.audioguides.update(id, body);
  },
  remove: (id) => adminApi.audioguides.remove(id),
});

/**
 * The attributes editor sends the whole object serialised in `attributesJson`,
 * alongside (or instead of) the dotted keys AdminJS normally produces. This
 * rebuilds an unambiguous payload: without the cleanup, the keys of a deleted
 * chapter would survive re-flattening and the chapter would reappear on save.
 */
function normalizeAttributes(request: ActionRequest): ActionRequest {
  const payload = request.payload ?? {};
  const raw = payload.attributesJson;
  if (typeof raw !== 'string') return request;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new ValidationError({
      attributes: { message: `Invalid JSON: ${(error as Error).message}` },
    });
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ValidationError({
      attributes: { message: 'The root of attributes must be an object.' },
    });
  }

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === 'attributesJson') continue;
    if (key === 'attributes' || key.startsWith('attributes.')) continue;
    cleaned[key] = value;
  }
  cleaned.attributes = parsed;

  return { ...request, payload: cleaned };
}

export const audioguideResource: ResourceWithOptions = {
  resource: audioguideResourceInstance,
  options: {
    id: 'Audioguide',
    // `name: null` pulls the resource out of any group: it becomes a top-level
    // sidebar entry while keeping its icon. Without it, AdminJS creates a group
    // holding nothing but this resource — two levels for no reason.
    navigation: { name: null, icon: 'Headphones' },
    listProperties: ['placeName', 'city', 'lang', 'placeId', 'createdAt'],
    filterProperties: ['placeName', 'city', 'placeId', 'lang'],
    showProperties: [
      'placeName',
      'city',
      'placeId',
      'lang',
      'latitude',
      'longitude',
      'createdAt',
      'updatedAt',
      'attributes',
    ],
    editProperties: [
      'placeName',
      'city',
      'placeId',
      'lang',
      'latitude',
      'longitude',
      'attributes',
    ],
    sort: { direction: 'desc', sortBy: 'createdAt' },
    properties: {
      id: {
        isVisible: { list: false, show: true, edit: false, filter: false },
      },
      placeId: {
        description: 'Identifiant Google Places. Clé du cache avec la langue.',
      },
      placeName: { isTitle: true },
      city: {
        description:
          'Renseignée automatiquement à la génération, depuis Google Places.',
      },
      lang: {
        availableValues: [
          { value: 'fr', label: 'Français' },
          { value: 'en', label: 'Anglais' },
          { value: 'es', label: 'Espagnol' },
          { value: 'de', label: 'Allemand' },
          { value: 'it', label: 'Italien' },
        ],
      },
      attributes: {
        isVisible: { list: false, filter: false, show: true, edit: true },
        components: {
          edit: Components.AttributesEditor,
          show: Components.AttributesShow,
        },
      },
    },
    actions: {
      new: {
        // An audioguide is born from generation, not from manual entry: creating
        // one by hand would produce a record with no content and no media.
        isAccessible: false,
      },
      edit: { before: normalizeAttributes },
      delete: { guard: 'Supprimer cet audioguide du catalogue partagé ?' },
      bulkDelete: { isAccessible: false },
    },
  },
};
