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
 * In-house routes consumed by the backoffice's React components. Mounted outside
 * the AdminJS router: its Express adapter ends with a catch-all that serves the
 * SPA and would shadow anything registered after it.
 *
 * `requireAdminApi` is applied by the entrypoint, ahead of this router.
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
 * Calls the NestJS API with the current request's tokens. If the API hands back
 * new ones, the cookies are rewritten: otherwise the rotation would be lost when
 * the request returns.
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

// ── Media ─────────────────────────────────────────────────────────────────────
// The database only stores GCS paths. The API is what knows how to sign them,
// and already does so on GET /audioguides/:id: the backoffice therefore needs no
// Google Cloud credentials of its own to let anyone play the tracks.
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

// ── Generation ────────────────────────────────────────────────────────────────
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
// Server-side proxy: the Places key never reaches the browser.
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

    // Places answers 200 even on failure: the verdict is in `status`.
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

/** Tells whether a place_id is already in the catalogue, to warn before generating. */
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
