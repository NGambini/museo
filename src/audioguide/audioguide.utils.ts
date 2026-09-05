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
    result.chapters.length > 10 ||
    result.chapters.some((c) => !Array.isArray(c.lines) || c.lines.length === 0)
  ) {
    throw new Error('Invalid Gemini response structure');
  }
}

export function parseGeminiText(text: string): GeminiResult {
  // Without responseMimeType (incompatible with grounding), the model sometimes
  // wraps its JSON in markdown fences.
  const json = text.trim().replace(/^```(?:json)?|```$/g, '');
  const result = JSON.parse(json) as GeminiResult;
  validateGeminiResult(result);
  return {
    ...result,
    chapters: result.chapters.map((chapter) => ({
      ...chapter,
      text: chapter.lines.join(' '),
    })),
  };
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
  /** Every photo of the place: the first is used as the main photo, the rest as
   * fallbacks when Wikimedia finds nothing for a chapter. */
  photoReferences: string[];
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
    photoReferences: (data.result.photos ?? []).map((p) => p.photo_reference),
  };
}

// ── SSML transcript synthesis ─────────────────────────────────────────────────

function escapeSsml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatTimestamp(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

/** Wraps LLM-segmented lines in SSML, one <mark> per line, so TTS timepointing can report a start time for each. */
export function buildChapterSsml(lines: string[]): string {
  const body = lines
    .map((line, i) => `<mark name="s${i}"/>${escapeSsml(line)}`)
    .join(' ');
  return `<speak>${body}</speak>`;
}

export interface Timepoint {
  markName?: string | null;
  timeSeconds?: number | null;
}

/** Builds a `[HH:MM:SS] line` transcript from the chapter's lines and their TTS timepoints. */
export function buildTranscript(
  lines: string[],
  timepoints: Timepoint[],
): string {
  const timeByMark = new Map(
    timepoints.map((tp) => [tp.markName, tp.timeSeconds ?? 0]),
  );
  return lines
    .map((line, i) => {
      const seconds = timeByMark.get(`s${i}`) ?? 0;
      return `[${formatTimestamp(seconds)}] ${line}`;
    })
    .join('\n');
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
