import { GeminiChapter, GeminiResult, PlaceDetails } from './audioguide.types';

// ── GCS path builders ─────────────────────────────────────────────────────────

export function buildMainImagePath(placeId: string, lang: string): string {
  return `${placeId}/${lang}/pictures/main.jpg`;
}

export function buildChapterImagePath(
  placeId: string,
  lang: string,
  chapterNumber: number,
): string {
  return `${placeId}/${lang}/pictures/chapter_${chapterNumber}.jpg`;
}

export function buildChapterAudioPath(
  placeId: string,
  lang: string,
  chapterNumber: number,
): string {
  return `${placeId}/${lang}/tracks/chapter_${chapterNumber}.mp3`;
}

// ── Gemini response parsing ───────────────────────────────────────────────────

export function validateGeminiResult(result: GeminiResult): void {
  if (
    !result.title ||
    !result.history ||
    !Array.isArray(result.chapters) ||
    result.chapters.length < 3 ||
    result.chapters.length > 5
  ) {
    throw new Error('Invalid Gemini response structure');
  }
}

export function parseGeminiText(text: string): GeminiResult {
  const result = JSON.parse(text) as GeminiResult;
  validateGeminiResult(result);
  return result;
}

// ── Retry with backoff ────────────────────────────────────────────────────────

// Gemini's ApiError exposes the HTTP status: 503 = model overloaded, 429 = rate limited.
const RETRYABLE_STATUS_CODES = new Set([429, 503]);

export function isRetryableGeminiError(error: unknown): boolean {
  const status = (error as { status?: number } | undefined)?.status;
  return status !== undefined && RETRYABLE_STATUS_CODES.has(status);
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    retries = 3,
    baseDelayMs = 1000,
    shouldRetry = isRetryableGeminiError,
    onRetry,
  } = options;

  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      if (attempt >= retries || !shouldRetry(error)) {
        throw error;
      }
      const delayMs = baseDelayMs * 2 ** attempt + Math.random() * 250;
      onRetry?.(error, attempt + 1, delayMs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

// ── Places API response parsing ───────────────────────────────────────────────

export interface PlacesApiRawData {
  status: string;
  result: {
    name: string;
    geometry: { location: { lat: number; lng: number } };
    rating?: number;
    photos?: Array<{ photo_reference: string }>;
  };
}

export interface ParsedPlacesData {
  placeName: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  photoReference: string | undefined;
}

export function parsePlacesApiResponse(
  data: PlacesApiRawData,
): ParsedPlacesData {
  if (data.status !== 'OK') {
    throw new Error(`Google Places API returned status: ${data.status}`);
  }
  return {
    placeName: data.result.name,
    latitude: data.result.geometry.location.lat,
    longitude: data.result.geometry.location.lng,
    rating: data.result.rating ?? null,
    photoReference: data.result.photos?.[0]?.photo_reference,
  };
}

// ── Audioguide attributes builder ─────────────────────────────────────────────

export function buildAudioguideAttributes(
  placeDetails: PlaceDetails,
  geminiResult: GeminiResult,
): Record<string, unknown> {
  return {
    main_image_url: placeDetails.mainImagePath ?? null,
    rating: placeDetails.rating,
    admission_price: geminiResult.admission_price,
    title: geminiResult.title,
    history: geminiResult.history,
    chapters: geminiResult.chapters,
  };
}

// ── Signed URL replacement ────────────────────────────────────────────────────

export async function replaceAttributePathsWithUrls(
  attributes: Record<string, unknown>,
  signFn: (path: string) => Promise<string>,
): Promise<Record<string, unknown>> {
  const attrs = { ...attributes };

  if (typeof attrs.main_image_url === 'string') {
    attrs.main_image_url = await signFn(attrs.main_image_url);
  }

  if (Array.isArray(attrs.chapters)) {
    attrs.chapters = await Promise.all(
      (attrs.chapters as GeminiChapter[]).map(async (chapter) => {
        const updated = { ...chapter };
        if (typeof updated.image_url === 'string') {
          updated.image_url = await signFn(updated.image_url);
        }
        if (typeof updated.audio_url === 'string') {
          updated.audio_url = await signFn(updated.audio_url);
        }
        return updated;
      }),
    );
  }

  return attrs;
}
