import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import {
  ApiError,
  authedCall,
  type ApiAudioguide,
  type GenerateAudioguideBody,
} from '../api/client.js';
import { setAuthCookies } from '../admin/auth.js';
import { env } from '../config/env.js';
import '../api/session.js';

/**
 * Routes maison consommées par les composants React du backoffice. Montées
 * hors du routeur AdminJS : l'adaptateur Express d'AdminJS termine par un
 * catch-all qui sert la SPA et masquerait tout ce qui est ajouté après lui.
 *
 * `requireAdminApi` est posé par le point d'entrée, en amont de ce routeur.
 */
export const boApiRouter = Router();

function fail(res: Response, error: unknown): void {
  if (error instanceof ApiError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  console.error('[bo-api]', error);
  res.status(500).json({ message: 'Erreur inattendue du backoffice.' });
}

/**
 * Appelle l'API NestJS avec les jetons de la requête courante. Si l'API en
 * renvoie de nouveaux, on repose les cookies : sans ça, la rotation serait
 * perdue au retour de la requête.
 */
function withSession<T>(
  req: Request,
  res: Response,
  path: string,
  init: RequestInit,
) {
  return authedCall<T>(path, init, req.boTokens!, (renewed) =>
    setAuthCookies(res, renewed),
  );
}

// ── Médias ────────────────────────────────────────────────────────────────────
// La base ne stocke que des chemins GCS. C'est l'API qui sait les signer, et
// elle le fait déjà sur GET /audioguides/:id : le backoffice n'a donc besoin
// d'aucun credential Google Cloud pour laisser écouter les pistes.
boApiRouter.get('/audioguides/:id/media', async (req, res) => {
  try {
    const audioguide = await withSession<ApiAudioguide>(
      req,
      res,
      `/audioguides/${encodeURIComponent(req.params.id)}`,
      { method: 'GET' },
    );
    res.json({ attributes: audioguide.attributes });
  } catch (error) {
    fail(res, error);
  }
});

// ── Génération ────────────────────────────────────────────────────────────────
boApiRouter.post('/generate', async (req, res) => {
  const { place_id, lang } = req.body as Partial<GenerateAudioguideBody>;
  if (!place_id || typeof place_id !== 'string') {
    res.status(400).json({ message: 'place_id manquant.' });
    return;
  }

  try {
    const audioguide = await withSession<ApiAudioguide>(
      req,
      res,
      '/audioguides/generate',
      {
        method: 'POST',
        body: JSON.stringify({ place_id, lang: lang || 'fr' }),
      },
    );
    res.json(audioguide);
  } catch (error) {
    fail(res, error);
  }
});

// ── Google Places ─────────────────────────────────────────────────────────────
// Proxy côté serveur : la clé Places ne descend jamais dans le navigateur.
interface PlacesAutocompleteResponse {
  status: string;
  error_message?: string;
  predictions?: Array<{
    place_id: string;
    description: string;
    structured_formatting?: { main_text?: string; secondary_text?: string };
  }>;
}

boApiRouter.get('/places/autocomplete', async (req, res) => {
  const input = String(req.query.q ?? '').trim();
  if (input.length < 3) {
    res.json({ predictions: [] });
    return;
  }
  if (!env.googlePlacesApiKey) {
    res.status(503).json({
      message: 'GOOGLE_PLACES_API_KEY absente du .env du backoffice.',
    });
    return;
  }

  const url =
    'https://maps.googleapis.com/maps/api/place/autocomplete/json' +
    `?input=${encodeURIComponent(input)}` +
    `&language=${encodeURIComponent(String(req.query.lang ?? 'fr'))}` +
    `&key=${env.googlePlacesApiKey}`;

  try {
    const response = await fetch(url);
    const body = (await response.json()) as PlacesAutocompleteResponse;

    // Places renvoie 200 même sur erreur : le verdict est dans `status`.
    if (body.status !== 'OK' && body.status !== 'ZERO_RESULTS') {
      res.status(502).json({
        message: body.error_message ?? `Google Places : ${body.status}`,
      });
      return;
    }

    res.json({
      predictions: (body.predictions ?? []).map((prediction) => ({
        place_id: prediction.place_id,
        description: prediction.description,
        main_text:
          prediction.structured_formatting?.main_text ?? prediction.description,
        secondary_text: prediction.structured_formatting?.secondary_text ?? '',
      })),
    });
  } catch (error) {
    fail(res, error);
  }
});

/** Indique si un place_id est déjà au catalogue, pour prévenir avant de générer. */
boApiRouter.get('/places/:placeId/existing', async (req, res) => {
  const { placeId } = req.params;
  const lang = String(req.query.lang ?? 'fr');
  try {
    const { dataSource } = await import('../db/data-source.js');
    const { Audioguide } = await import('../entities/audioguide.entity.js');
    const existing = await dataSource
      .getRepository(Audioguide)
      .findOne({ where: { placeId, lang } });

    res.json(
      existing
        ? { exists: true, id: existing.id, placeName: existing.placeName }
        : { exists: false },
    );
  } catch (error) {
    fail(res, error);
  }
});
