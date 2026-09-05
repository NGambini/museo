import type {
  ActionRequest,
  ActionContext,
  ResourceWithOptions,
} from 'adminjs';
import { ValidationError } from 'adminjs';
import { Components, componentLoader } from '../component-loader.js';
import { Audioguide } from '../../entities/audioguide.entity.js';

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
      attributes: { message: `JSON invalide : ${(error as Error).message}` },
    });
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ValidationError({
      attributes: { message: 'La racine de attributes doit être un objet.' },
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
  resource: Audioguide,
  options: {
    id: 'Audioguide',
    // `name: null` pulls the resource out of any group: it becomes a top-level
    // sidebar entry while keeping its icon. Without it, AdminJS creates a group
    // holding nothing but this resource — two levels for no reason.
    navigation: { name: null, icon: 'Headphones' },
    listProperties: ['placeName', 'lang', 'placeId', 'createdAt'],
    filterProperties: ['placeName', 'placeId', 'lang', 'createdAt'],
    showProperties: [
      'placeName',
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
        isTitle: false,
        description: 'Identifiant Google Places. Clé du cache avec la langue.',
      },
      placeName: { isTitle: true },
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
      delete: {
        guard: 'Supprimer cet audioguide du catalogue partagé ?',
      },
      bulkDelete: { isAccessible: false },
    },
  },
};

export { componentLoader };
