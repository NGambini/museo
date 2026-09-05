import {
  buildMainImagePath,
  buildChapterImagePath,
  buildChapterAudioPath,
  validateGeminiResult,
  parseGeminiText,
  parsePlacesApiResponse,
  extractCity,
  buildAudioguideAttributes,
  replaceAttributePathsWithUrls,
  isRetryableGeminiError,
  retryWithBackoff,
  buildChapterSsml,
  buildTranscript,
} from './audioguide.utils';
import { GeminiResult, PlaceDetails } from './audioguide.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeValidGeminiResult = (
  overrides: Partial<GeminiResult> = {},
): GeminiResult => ({
  title: 'Tour Eiffel pour les enfants',
  history: 'La Tour Eiffel a été construite en 1889.',
  chapters: [
    {
      chapter_number: 1,
      title: 'Ch1',
      description: 'D1',
      lines: ['T1'],
      text: 'T1',
      image_search_query: 'q1',
    },
    {
      chapter_number: 2,
      title: 'Ch2',
      description: 'D2',
      lines: ['T2'],
      text: 'T2',
      image_search_query: 'q2',
    },
    {
      chapter_number: 3,
      title: 'Ch3',
      description: 'D3',
      lines: ['T3'],
      text: 'T3',
      image_search_query: 'q3',
    },
  ],
  ...overrides,
});

const makePlaceDetails = (
  overrides: Partial<PlaceDetails> = {},
): PlaceDetails => ({
  placeName: 'Tour Eiffel',
  city: 'Paris',
  latitude: 48.8584,
  longitude: 2.2945,
  rating: 4.5,
  mainImagePath: 'place-123/fr/pictures/main.jpg',
  photoReferences: ['ref123'],
  ...overrides,
});

// ── GCS path builders ─────────────────────────────────────────────────────────

describe('buildMainImagePath', () => {
  it('returns the correct GCS path', () => {
    expect(buildMainImagePath('place-123', 'fr')).toBe(
      'place-123/fr/pictures/main.jpg',
    );
  });
});

describe('buildChapterImagePath', () => {
  it('returns the correct GCS path for a chapter', () => {
    expect(buildChapterImagePath('place-123', 'fr', 2)).toBe(
      'place-123/fr/pictures/chapter_2.jpg',
    );
  });
});

describe('buildChapterAudioPath', () => {
  it('returns the correct GCS path for a chapter audio', () => {
    expect(buildChapterAudioPath('place-123', 'fr', 3)).toBe(
      'place-123/fr/tracks/chapter_3.mp3',
    );
  });
});

// ── validateGeminiResult ──────────────────────────────────────────────────────

describe('validateGeminiResult', () => {
  it('does not throw for a valid result', () => {
    expect(() => validateGeminiResult(makeValidGeminiResult())).not.toThrow();
  });

  it('throws if title is missing', () => {
    expect(() =>
      validateGeminiResult(makeValidGeminiResult({ title: '' })),
    ).toThrow('Invalid Gemini response structure');
  });

  it('throws if history is missing', () => {
    expect(() =>
      validateGeminiResult(makeValidGeminiResult({ history: '' })),
    ).toThrow('Invalid Gemini response structure');
  });

  it('throws if chapters count is below 3', () => {
    expect(() =>
      validateGeminiResult(
        makeValidGeminiResult({
          chapters: makeValidGeminiResult().chapters.slice(0, 2),
        }),
      ),
    ).toThrow('Invalid Gemini response structure');
  });

  it('throws if a chapter has no lines', () => {
    const withoutLines = makeValidGeminiResult().chapters.map((c) => ({
      ...c,
      lines: [],
    }));
    expect(() =>
      validateGeminiResult(makeValidGeminiResult({ chapters: withoutLines })),
    ).toThrow('Invalid Gemini response structure');
  });

  it('throws if chapters count is above 10', () => {
    const tooMany = Array.from({ length: 11 }, (_, i) => ({
      chapter_number: i + 1,
      title: `Ch${i + 1}`,
      description: 'D',
      lines: ['T'],
      text: 'T',
      image_search_query: 'q',
    }));
    expect(() =>
      validateGeminiResult(makeValidGeminiResult({ chapters: tooMany })),
    ).toThrow('Invalid Gemini response structure');
  });
});

// ── parseGeminiText ───────────────────────────────────────────────────────────

describe('parseGeminiText', () => {
  it('throws on invalid JSON', () => {
    expect(() => parseGeminiText('not json')).toThrow();
  });

  it('throws if the parsed structure is invalid', () => {
    expect(() =>
      parseGeminiText(JSON.stringify({ title: '', chapters: [] })),
    ).toThrow('Invalid Gemini response structure');
  });

  it('returns the parsed GeminiResult for valid input', () => {
    const valid = makeValidGeminiResult();
    const result = parseGeminiText(JSON.stringify(valid));
    expect(result.title).toBe(valid.title);
    expect(result.chapters).toHaveLength(3);
  });

  it('derives chapter.text by joining chapter.lines', () => {
    const valid = makeValidGeminiResult({
      chapters: [
        {
          chapter_number: 1,
          title: 'Ch1',
          description: 'D1',
          lines: ['Première ligne.', 'Deuxième ligne.'],
          text: 'ignored, recomputed from lines',
          image_search_query: 'q1',
        },
        ...makeValidGeminiResult().chapters.slice(1),
      ],
    });
    const result = parseGeminiText(JSON.stringify(valid));
    expect(result.chapters[0].text).toBe('Première ligne. Deuxième ligne.');
  });
});

// ── buildChapterSsml ───────────────────────────────────────────────────────────

describe('buildChapterSsml', () => {
  it('wraps each line in a mark and joins them inside <speak>', () => {
    const ssml = buildChapterSsml(['Bonjour.', 'Comment ça va ?']);
    expect(ssml).toBe(
      '<speak><mark name="s0"/>Bonjour. <mark name="s1"/>Comment ça va ?</speak>',
    );
  });

  it('escapes XML special characters', () => {
    const ssml = buildChapterSsml(['Tom & Jerry <3']);
    expect(ssml).toBe('<speak><mark name="s0"/>Tom &amp; Jerry &lt;3</speak>');
  });
});

// ── buildTranscript ────────────────────────────────────────────────────────────

describe('buildTranscript', () => {
  it('pairs each line with its timepoint as [HH:MM:SS] line', () => {
    const transcript = buildTranscript(
      ['Première ligne.', 'Deuxième ligne.'],
      [
        { markName: 's0', timeSeconds: 3 },
        { markName: 's1', timeSeconds: 67 },
      ],
    );
    expect(transcript).toBe(
      '[00:00:03] Première ligne.\n[00:01:07] Deuxième ligne.',
    );
  });

  it('defaults to 00:00:00 when a line has no matching timepoint', () => {
    const transcript = buildTranscript(['Seule ligne.'], []);
    expect(transcript).toBe('[00:00:00] Seule ligne.');
  });
});

// ── parsePlacesApiResponse ────────────────────────────────────────────────────

describe('parsePlacesApiResponse', () => {
  const baseData = {
    status: 'OK',
    result: {
      name: 'Tour Eiffel',
      geometry: { location: { lat: 48.8584, lng: 2.2945 } },
      rating: 4.5,
      photos: [{ photo_reference: 'ref123' }],
    },
  };

  it('throws if status is not OK', () => {
    expect(() =>
      parsePlacesApiResponse({ ...baseData, status: 'ZERO_RESULTS' }),
    ).toThrow('Google Places API returned status: ZERO_RESULTS');
  });

  it('maps placeName, latitude, longitude correctly', () => {
    const result = parsePlacesApiResponse(baseData);
    expect(result.placeName).toBe('Tour Eiffel');
    expect(result.latitude).toBe(48.8584);
    expect(result.longitude).toBe(2.2945);
  });

  it('maps rating from the result', () => {
    const result = parsePlacesApiResponse(baseData);
    expect(result.rating).toBe(4.5);
  });

  it('defaults rating to null if absent', () => {
    const data = {
      ...baseData,
      result: { ...baseData.result, rating: undefined },
    };
    const result = parsePlacesApiResponse(data);
    expect(result.rating).toBeNull();
  });

  it('extracts every photo reference, in order', () => {
    const data = {
      ...baseData,
      result: {
        ...baseData.result,
        photos: [{ photo_reference: 'ref123' }, { photo_reference: 'ref456' }],
      },
    };
    const result = parsePlacesApiResponse(data);
    expect(result.photoReferences).toEqual(['ref123', 'ref456']);
  });

  it('returns an empty array if the place has no photos', () => {
    const data = { ...baseData, result: { ...baseData.result, photos: [] } };
    expect(parsePlacesApiResponse(data).photoReferences).toEqual([]);
  });
});

// ── buildAudioguideAttributes ─────────────────────────────────────────────────

describe('buildAudioguideAttributes', () => {
  it('maps all fields from placeDetails and geminiResult', () => {
    const placeDetails = makePlaceDetails();
    const geminiResult = makeValidGeminiResult();
    const attrs = buildAudioguideAttributes(placeDetails, geminiResult);

    expect(attrs.main_image_url).toBe(placeDetails.mainImagePath);
    expect(attrs.rating).toBe(placeDetails.rating);
    expect(attrs.title).toBe(geminiResult.title);
    expect(attrs.history).toBe(geminiResult.history);
    expect(attrs.chapters).toBe(geminiResult.chapters);
  });

  it('sets main_image_url to null if mainImagePath is undefined', () => {
    const attrs = buildAudioguideAttributes(
      makePlaceDetails({ mainImagePath: undefined }),
      makeValidGeminiResult(),
    );
    expect(attrs.main_image_url).toBeNull();
  });
});

// ── replaceAttributePathsWithUrls ─────────────────────────────────────────────

describe('replaceAttributePathsWithUrls', () => {
  const sign = (path: string) => Promise.resolve(`https://signed/${path}`);

  it('replaces main_image_url with a signed URL', async () => {
    const attrs = await replaceAttributePathsWithUrls(
      { main_image_url: 'place/fr/pictures/main.jpg' },
      sign,
    );
    expect(attrs.main_image_url).toBe(
      'https://signed/place/fr/pictures/main.jpg',
    );
  });

  it('leaves main_image_url untouched if it is not a string', async () => {
    const attrs = await replaceAttributePathsWithUrls(
      { main_image_url: null },
      sign,
    );
    expect(attrs.main_image_url).toBeNull();
  });

  it('replaces image_url and audio_url in each chapter', async () => {
    const attrs = await replaceAttributePathsWithUrls(
      {
        chapters: [
          {
            chapter_number: 1,
            image_url: 'place/fr/pictures/chapter_1.jpg',
            audio_url: 'place/fr/tracks/chapter_1.mp3',
          },
        ],
      },
      sign,
    );
    const chapter = (attrs.chapters as any[])[0];
    expect(chapter.image_url).toBe(
      'https://signed/place/fr/pictures/chapter_1.jpg',
    );
    expect(chapter.audio_url).toBe(
      'https://signed/place/fr/tracks/chapter_1.mp3',
    );
  });

  it('leaves chapter fields untouched if they are not strings', async () => {
    const attrs = await replaceAttributePathsWithUrls(
      { chapters: [{ chapter_number: 1 }] },
      sign,
    );
    const chapter = (attrs.chapters as any[])[0];
    expect(chapter.image_url).toBeUndefined();
    expect(chapter.audio_url).toBeUndefined();
  });
});

// ── isRetryableGeminiError ─────────────────────────────────────────────────────

describe('isRetryableGeminiError', () => {
  it('returns true for a 503 (model overloaded) error', () => {
    expect(isRetryableGeminiError({ status: 503 })).toBe(true);
  });

  it('returns true for a 429 (rate limited) error', () => {
    expect(isRetryableGeminiError({ status: 429 })).toBe(true);
  });

  it('returns false for a 400 (bad request) error', () => {
    expect(isRetryableGeminiError({ status: 400 })).toBe(false);
  });

  it('returns false for errors without a status', () => {
    expect(isRetryableGeminiError(new Error('boom'))).toBe(false);
  });
});

// ── retryWithBackoff ────────────────────────────────────────────────────────────

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const flushRetries = async () => {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
      jest.runAllTimers();
    }
  };

  it('returns the result immediately if fn succeeds on the first try', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await retryWithBackoff(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on a retryable error and eventually succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValue('ok');

    const promise = retryWithBackoff(fn, { retries: 3, baseDelayMs: 10 });
    await flushRetries();

    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws immediately on a non-retryable error without retrying', async () => {
    const fn = jest.fn().mockRejectedValue({ status: 400 });

    await expect(
      retryWithBackoff(fn, { retries: 3, baseDelayMs: 10 }),
    ).rejects.toEqual({ status: 400 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up and throws the last error after exhausting retries', async () => {
    const fn = jest.fn().mockRejectedValue({ status: 503 });

    const promise = retryWithBackoff(fn, { retries: 2, baseDelayMs: 10 });
    const expectation = expect(promise).rejects.toEqual({ status: 503 });
    await flushRetries();
    await expectation;

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('calls onRetry with the error, attempt number, and delay', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValue('ok');
    const onRetry = jest.fn();

    const promise = retryWithBackoff(fn, {
      retries: 3,
      baseDelayMs: 10,
      onRetry,
    });
    await flushRetries();
    await promise;

    expect(onRetry).toHaveBeenCalledWith(
      { status: 503 },
      1,
      expect.any(Number),
    );
  });

  it('uses a custom shouldRetry predicate', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('custom'))
      .mockResolvedValue('ok');

    const promise = retryWithBackoff(fn, {
      retries: 3,
      baseDelayMs: 10,
      shouldRetry: (error) => error instanceof Error,
    });
    await flushRetries();

    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('extractCity', () => {
  const component = (long_name: string, ...types: string[]) => ({
    long_name,
    types,
  });

  it('prefers the locality', () => {
    expect(
      extractCity([
        component('Île-de-France', 'administrative_area_level_1', 'political'),
        component('Paris', 'locality', 'political'),
      ]),
    ).toBe('Paris');
  });

  it('falls back to postal_town where Google omits the locality (UK)', () => {
    expect(
      extractCity([
        component('Greater London', 'administrative_area_level_2'),
        component('London', 'postal_town'),
      ]),
    ).toBe('London');
  });

  it('falls back to an administrative area for places outside any town', () => {
    expect(
      extractCity([component('Drôme', 'administrative_area_level_2')]),
    ).toBe('Drôme');
  });

  it('returns null rather than guessing when no component qualifies', () => {
    expect(extractCity([component('France', 'country')])).toBeNull();
    expect(extractCity([])).toBeNull();
    expect(extractCity()).toBeNull();
  });
});

describe('parsePlacesApiResponse city extraction', () => {
  it('reads the city from the address components', () => {
    const parsed = parsePlacesApiResponse({
      status: 'OK',
      result: {
        name: 'Tour Eiffel',
        geometry: { location: { lat: 48.8584, lng: 2.2945 } },
        address_components: [
          { long_name: 'Paris', types: ['locality', 'political'] },
        ],
      },
    });
    expect(parsed.city).toBe('Paris');
  });

  it('leaves the city null when Places returns no components', () => {
    const parsed = parsePlacesApiResponse({
      status: 'OK',
      result: {
        name: 'Nowhere',
        geometry: { location: { lat: 0, lng: 0 } },
      },
    });
    expect(parsed.city).toBeNull();
  });
});
