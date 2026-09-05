import type {
  ActionRequest,
  ActionContext,
  ResourceWithOptions,
} from 'adminjs';
import { ValidationError } from 'adminjs';
import { Components, componentLoader } from '../component-loader.js';
import { Audioguide } from '../../entities/audioguide.entity.js';

/**
 * L'éditeur d'attributs envoie l'objet complet sérialisé dans `attributesJson`,
 * en plus (ou à la place) des clés pointées qu'AdminJS produit habituellement.
 * On reconstruit ici un payload sans ambiguïté : sans ce nettoyage, les clés
 * d'un chapitre supprimé survivraient au ré-aplatissement et le chapitre
 * réapparaîtrait après enregistrement.
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
    // `name: null` sort la ressource de tout groupe : elle devient une entrée
    // de premier niveau dans la sidebar, tout en gardant son icône. Sans ça,
    // AdminJS crée un groupe qui ne contient qu'elle — deux niveaux pour rien.
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
        // Un audioguide naît de la génération, pas d'une saisie manuelle : la
        // création à la main produirait une fiche sans média ni contenu.
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
