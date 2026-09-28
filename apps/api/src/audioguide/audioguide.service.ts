import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, MoreThanOrEqual, Repository } from 'typeorm';
import { Storage, Bucket } from '@google-cloud/storage';
import { v1beta1, protos } from '@google-cloud/text-to-speech';
import { GoogleGenAI } from '@google/genai';
import { Audioguide } from './audioguide.entity';
import { GeminiChapter, GeminiResult, PlaceDetails } from './audioguide.types';
import { buildAudioguidePrompt } from './audioguide.prompts';
import { encodeMp3, parseWav, stitchLines } from './audio.utils';
import { GenerationJobsService } from './jobs/generation-jobs.service';
import { GenerationJob } from './jobs/generation-job.types';
import { PaginatedAudioguides } from './dto/audioguide-summary.dto';
import {
  AdminListAudioguidesQueryDto,
  AdminPaginatedAudioguides,
  AudioguideStats,
  UpdateAudioguideDto,
} from './dto/admin-audioguide.dto';
import {
  buildMainImagePath,
  buildChapterImagePath,
  buildChapterAudioPath,
  parseGeminiText,
  parsePlacesApiResponse,
  PlacesApiRawData,
  buildAudioguideAttributes,
  replaceAttributePathsWithUrls,
  retryWithBackoff,
  buildTranscript,
  createLimiter,
  isRetryableTtsError,
} from './audioguide.utils';

// Service-wide cap, all users combined. The controller's throttle bounds what a
// single account can consume; this one bounds the day's Gemini + TTS spend no
// matter how many accounts exist. Cache hits do not count against it: they
// trigger no billable call.
const MAX_GENERATIONS_PER_DAY = 100;

const TTS_VOICE = 'fr-FR-Chirp3-HD-Puck';
const TTS_SAMPLE_RATE = 24000;
// Silence inserted between two karaoke lines, since each is synthesized on its own.
const LINE_GAP_SECONDS = 0.35;
// One TTS request per line adds up fast against the per-minute quota: cap the
// in-flight requests (process-wide, all generations together) and back off on
// RESOURCE_EXHAUSTED long enough for the minute window to roll over.
const TTS_CONCURRENCY = 4;
const TTS_RETRIES = 5;
const TTS_RETRY_BASE_DELAY_MS = 2000;

@Injectable()
export class AudioguideService {
  private readonly storage: Storage;
  private readonly ttsClient: v1beta1.TextToSpeechClient;
  private readonly ttsLimit = createLimiter(TTS_CONCURRENCY);

  constructor(
    @InjectRepository(Audioguide)
    private readonly audioguideRepository: Repository<Audioguide>,
    private readonly jobs: GenerationJobsService,
  ) {
    this.storage = new Storage({ projectId: process.env.GOOGLE_PROJECT_ID });
    this.ttsClient = new v1beta1.TextToSpeechClient();
  }

  // Audioguides form a shared catalogue: `generate`'s cache hands back the entry
  // somebody else created, so it has to stay readable by any user.
  async findOne(id: string): Promise<Audioguide> {
    const audioguide = await this.audioguideRepository.findOne({
      where: { id },
    });
    if (!audioguide) throw new NotFoundException('Audioguide not found');
    return this.withSignedUrls(audioguide);
  }

  // Paginated catalogue, open to every authenticated account: it is the only way
  // a `user` account can discover what exists, generation being closed to it.
  async findAll(
    page: number,
    limit: number,
    lang?: string,
  ): Promise<PaginatedAudioguides> {
    const [items, total] = await this.audioguideRepository.findAndCount({
      select: [
        'id',
        'placeId',
        'placeName',
        'city',
        'latitude',
        'longitude',
        'lang',
        'createdAt',
      ],
      where: lang ? { lang } : {},
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  // ── Admin surface ───────────────────────────────────────────────────────────
  // Everything below is reached through /admin/audioguides and returns rows as
  // they are stored: `attributes` keeps its raw GCS paths instead of signed
  // URLs. The backoffice edits these rows, and writing a signed URL back into
  // the column would break playback as soon as the signature expires.

  async findAllForAdmin(
    query: AdminListAudioguidesQueryDto,
  ): Promise<AdminPaginatedAudioguides> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = {};
    if (query.lang) where.lang = query.lang;
    if (query.place_id) where.placeId = query.place_id;
    if (query.place_name) where.placeName = ILike(`%${query.place_name}%`);
    if (query.city) where.city = ILike(`%${query.city}%`);

    const [items, total] = await this.audioguideRepository.findAndCount({
      where,
      order: { [query.sort_by ?? 'createdAt']: query.direction ?? 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOneRaw(id: string): Promise<Audioguide> {
    const audioguide = await this.audioguideRepository.findOne({
      where: { id },
    });
    if (!audioguide) throw new NotFoundException('Audioguide not found');
    return audioguide;
  }

  async update(id: string, dto: UpdateAudioguideDto): Promise<Audioguide> {
    const audioguide = await this.findOneRaw(id);

    // The validation pipe hands back a DTO instance whose absent optional
    // fields are present but `undefined`. Assigning it wholesale would overwrite
    // every column the caller did not send. TypeORM happens to skip `undefined`
    // when building the UPDATE, so nothing is lost today — but that is a quirk
    // to lean on, not a guarantee, and it also truncates the entity we return.
    const patch = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    Object.assign(audioguide, patch);
    await this.audioguideRepository.save(audioguide);

    // Re-read rather than returning what `save` hands back: it only echoes the
    // columns it touched, so the caller would get a truncated record.
    return this.findOneRaw(id);
  }

  async remove(id: string): Promise<void> {
    const audioguide = await this.findOneRaw(id);
    await this.audioguideRepository.remove(audioguide);
  }

  async stats(): Promise<AudioguideStats> {
    const startOfDayUtc = new Date();
    startOfDayUtc.setUTCHours(0, 0, 0, 0);

    const [total, generatedToday, byLangRows] = await Promise.all([
      this.audioguideRepository.count(),
      this.audioguideRepository.count({
        where: { createdAt: MoreThanOrEqual(startOfDayUtc) },
      }),
      this.audioguideRepository
        .createQueryBuilder('a')
        .select('a.lang', 'lang')
        .addSelect('COUNT(*)', 'count')
        .groupBy('a.lang')
        .orderBy('count', 'DESC')
        .getRawMany<{ lang: string; count: string }>(),
    ]);

    return {
      total,
      generatedToday,
      dailyCap: MAX_GENERATIONS_PER_DAY,
      byLang: byLangRows.map((row) => ({
        lang: row.lang,
        count: Number(row.count),
      })),
    };
  }

  /**
   * Starts a generation and returns immediately.
   *
   * The pipeline chains Gemini, image fetching and per-chapter speech
   * synthesis, which routinely runs past the 60 s an HTTP request can hold —
   * hence a job the caller follows over the websocket rather than a response it
   * waits for. The two checks that can refuse the work outright, cache hit and
   * daily cap, still run synchronously so the caller learns about them from the
   * HTTP response.
   */
  async startGeneration(placeId: string, lang: string): Promise<GenerationJob> {
    const job = this.jobs.create(placeId, lang);

    const existing = await this.audioguideRepository.findOne({
      where: { placeId, lang },
    });
    if (existing) {
      console.log(`Cache hit for place_id ${placeId}`);
      this.jobs.succeed(job.id, existing.id);
      return this.jobs.find(job.id);
    }

    await this.assertDailyQuotaAvailable();

    // Intentionally not awaited: the caller gets its 202 now, and the job
    // carries the outcome. `runGeneration` never rejects.
    void this.runGeneration(job.id, placeId, lang);

    return job;
  }

  private async runGeneration(
    jobId: string,
    placeId: string,
    lang: string,
  ): Promise<void> {
    console.log(`Generating audioguide for place_id ${placeId}`);

    try {
      const bucket = this.storage.bucket(process.env.GCS_BUCKET_NAME!);

      // The weights below are rough: fetching a place takes a second, speech
      // synthesis takes most of the wall clock. They exist to make the bar
      // move at a plausible pace, not to be accurate.
      this.jobs.update(
        jobId,
        'place_details',
        0.05,
        'Reading the place details',
      );
      const placeDetails = await this.fetchPlaceDetailsFromGooglePlaces(
        placeId,
        lang,
        bucket,
      );

      this.jobs.update(
        jobId,
        'writing',
        0.15,
        `Writing the audioguide for ${placeDetails.placeName}`,
      );
      const geminiResult = await this.generateAudioguideWithGemini(
        placeDetails.placeName,
        lang,
      );

      const chapters = geminiResult.chapters.length;
      this.jobs.update(
        jobId,
        'images',
        0.4,
        `Fetching illustrations for ${chapters} chapters`,
      );
      await this.fetchAndUploadChapterImages(
        geminiResult.chapters,
        placeId,
        lang,
        bucket,
        placeDetails.photoReferences,
      );

      this.jobs.update(jobId, 'audio', 0.6, `Recording ${chapters} chapters`);
      await this.synthesizeAndUploadAudio(
        geminiResult.chapters,
        placeId,
        lang,
        bucket,
      );

      this.jobs.update(jobId, 'saving', 0.95, 'Saving');
      const saved = await this.persistAudioguideToDatabase(
        placeId,
        lang,
        placeDetails,
        geminiResult,
      );

      this.jobs.succeed(jobId, saved.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Generation failed for place_id ${placeId}: ${message}`);
      this.jobs.fail(jobId, message);
    }
  }

  // Counts audioguides created since midnight UTC. A failed generation writes no
  // row and is therefore not counted: the cap applies to successful generations,
  // not to attempts.
  private async assertDailyQuotaAvailable(): Promise<void> {
    const startOfDayUtc = new Date();
    startOfDayUtc.setUTCHours(0, 0, 0, 0);

    const generatedToday = await this.audioguideRepository.count({
      where: { createdAt: MoreThanOrEqual(startOfDayUtc) },
    });

    if (generatedToday >= MAX_GENERATIONS_PER_DAY) {
      console.warn(
        `Daily generation cap reached (${generatedToday}/${MAX_GENERATIONS_PER_DAY})`,
      );
      throw new ServiceUnavailableException(
        'Daily generation limit reached, please try again tomorrow',
      );
    }
  }

  private async signedUrl(path: string): Promise<string> {
    const bucket = this.storage.bucket(process.env.GCS_BUCKET_NAME!);
    const [url] = await bucket.file(path).getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000,
    });
    return url;
  }

  /**
   * Returns a copy of the audioguide entity with all stored GCS paths
   * in `attributes` replaced by signed URLs (valid 1 hour).
   */
  private async withSignedUrls(audioguide: Audioguide): Promise<Audioguide> {
    const attrs = await replaceAttributePathsWithUrls(
      audioguide.attributes,
      (path) => this.signedUrl(path),
    );
    return { ...audioguide, attributes: attrs };
  }

  private async fetchPlaceDetailsFromGooglePlaces(
    placeId: string,
    lang: string,
    bucket: Bucket,
  ): Promise<PlaceDetails> {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,geometry,rating,photos,address_components&key=${process.env.GOOGLE_PLACES_API_KEY}`,
      );
      const data = (await res.json()) as PlacesApiRawData;
      const { placeName, city, latitude, longitude, rating, photoReferences } =
        parsePlacesApiResponse(data);

      console.log(
        `Google Places OK: ${placeName}${city ? `, ${city}` : ''} (${photoReferences.length} photos)`,
      );

      const mainImagePath = await this.uploadMainPhoto(
        photoReferences[0],
        placeId,
        lang,
        bucket,
      );

      return {
        placeName,
        city,
        latitude,
        longitude,
        rating,
        mainImagePath,
        photoReferences,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Error at Google Places step: ${msg}`, error);
      throw new InternalServerErrorException(
        'An error occurred, please try again later',
      );
    }
  }

  private placesPhotoUrl(photoRef: string): string {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
  }

  /**
   * Downloads an image, or returns null when the response is not one — without
   * this check, Wikimedia's 2 KB HTML error page ended up uploaded as a photo.
   */
  private async downloadImage(url: string): Promise<Buffer | null> {
    try {
      const res = await fetch(url);
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || !type.startsWith('image/')) {
        console.log(`Ignored non-image response (${res.status}, ${type})`);
        return null;
      }
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  /**
   * Uploads the main place photo to GCS and returns its storage path.
   */
  private async uploadMainPhoto(
    photoRef: string | undefined,
    placeId: string,
    lang: string,
    bucket: Bucket,
  ): Promise<string | undefined> {
    if (!photoRef) return undefined;

    const buffer = await this.downloadImage(this.placesPhotoUrl(photoRef));
    if (!buffer) return undefined;

    const path = buildMainImagePath(placeId, lang);
    await bucket.file(path).save(buffer, { contentType: 'image/jpeg' });

    console.log('Main photo uploaded to GCS');
    return path;
  }

  private async generateAudioguideWithGemini(
    placeName: string,
    lang: string,
  ): Promise<GeminiResult> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      const generateContent = () =>
        ai.models.generateContent({
          // Gemini 3+ is required for grounding. No responseMimeType here:
          // combined with grounding, the API answers 200 with no candidate.
          model: 'gemini-3.5-flash-lite',
          contents: [
            {
              role: 'user',
              parts: [{ text: buildAudioguidePrompt(placeName, lang) }],
            },
          ],
          config: { tools: [{ googleSearch: {} }] },
        });

      const result = await retryWithBackoff(generateContent, {
        retries: 4,
        baseDelayMs: 1000,
        onRetry: (error, attempt, delayMs) => {
          const status = (error as { status?: number })?.status;
          console.warn(
            `Gemini overloaded (status ${status}), retry ${attempt}/4 in ${Math.round(delayMs)}ms`,
          );
        },
      });

      const geminiResult = parseGeminiText(result.text!);

      console.log(
        `Gemini OK: ${geminiResult.chapters.length} chapters generated`,
        JSON.stringify(geminiResult, null, 2),
      );
      return geminiResult;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Error at Gemini step: ${msg}`);
      throw new InternalServerErrorException(
        'An error occurred, please try again later',
      );
    }
  }

  private async fetchAndUploadChapterImages(
    chapters: GeminiChapter[],
    placeId: string,
    lang: string,
    bucket: Bucket,
    photoReferences: string[],
  ): Promise<void> {
    try {
      // Sequential: firing these in parallel made Wikimedia answer 429.
      for (const [index, chapter] of chapters.entries()) {
        // Offset by 1 so the main photo, which is the first of the batch, is
        // not repeated.
        const fallback =
          photoReferences.length > 0
            ? photoReferences[(index + 1) % photoReferences.length]
            : undefined;

        await this.fetchAndUploadOneChapterImage(
          chapter,
          placeId,
          lang,
          bucket,
          fallback,
        );
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Error at Wikimedia images step: ${msg}`);
      throw new InternalServerErrorException(
        'An error occurred, please try again later',
      );
    }
  }

  /**
   * Looks for an illustration on Wikimedia and otherwise falls back to a Google
   * Places photo of the venue, so that a chapter always has an image.
   */
  private async fetchAndUploadOneChapterImage(
    chapter: GeminiChapter,
    placeId: string,
    lang: string,
    bucket: Bucket,
    fallbackPhotoRef: string | undefined,
  ): Promise<void> {
    try {
      const wikiRes = await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(chapter.image_search_query)}&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=500&format=json`,
      );
      const wikiData = (await wikiRes.json()) as {
        query?: {
          pages?: Record<string, { imageinfo?: Array<{ thumburl?: string }> }>;
        };
      };
      const thumbUrl =
        Object.values(wikiData.query?.pages ?? {})[0]?.imageinfo?.[0]
          ?.thumburl ?? null;

      const buffer =
        (thumbUrl ? await this.downloadImage(thumbUrl) : null) ??
        (fallbackPhotoRef
          ? await this.downloadImage(this.placesPhotoUrl(fallbackPhotoRef))
          : null);

      if (!buffer) {
        console.log(`No image for chapter ${chapter.chapter_number}`);
        return;
      }

      const path = buildChapterImagePath(placeId, lang, chapter.chapter_number);
      await bucket.file(path).save(buffer, { contentType: 'image/jpeg' });

      chapter.image_url = path;
      console.log(`Chapter ${chapter.chapter_number} image uploaded`);
    } catch {
      console.log(`No image for chapter ${chapter.chapter_number}`);
    }
  }

  private async synthesizeAndUploadAudio(
    chapters: GeminiChapter[],
    placeId: string,
    lang: string,
    bucket: Bucket,
  ): Promise<void> {
    try {
      await Promise.all(
        chapters.map((chapter) =>
          this.synthesizeAndUploadOneChapterAudio(
            chapter,
            placeId,
            lang,
            bucket,
          ),
        ),
      );
      console.log(`TTS OK for ${chapters.length} chapters`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Error at TTS step: ${msg}`);
      throw new InternalServerErrorException(
        'An error occurred, please try again later',
      );
    }
  }

  /**
   * Synthesizes speech for a chapter, uploads the MP3 to GCS,
   * and stores the GCS path (not a full URL) on the chapter object.
   *
   * Chirp voices don't support SSML marks, so each karaoke line is synthesized
   * separately and stitched into one file — line offsets come from the PCM lengths.
   */
  private async synthesizeAndUploadOneChapterAudio(
    chapter: GeminiChapter,
    placeId: string,
    lang: string,
    bucket: Bucket,
  ): Promise<void> {
    const clips = await Promise.all(
      chapter.lines.map((line) => this.synthesizeLine(line)),
    );
    const stitched = stitchLines(clips, LINE_GAP_SECONDS);
    const audioBuffer = await encodeMp3(stitched);

    const path = buildChapterAudioPath(placeId, lang, chapter.chapter_number);
    await bucket.file(path).save(audioBuffer, { contentType: 'audio/mpeg' });

    // Store the GCS path — signed URL is generated at read time
    chapter.audio_url = path;
    chapter.transcript = buildTranscript(
      chapter.lines,
      stitched.lineStartSeconds,
    );
    console.log(`Chapter ${chapter.chapter_number} audio uploaded to GCS`);
  }

  private async synthesizeLine(text: string) {
    const synthesize = () =>
      this.ttsLimit(() =>
        this.ttsClient.synthesizeSpeech({
          input: { text },
          voice: { languageCode: 'fr-FR', name: TTS_VOICE },
          audioConfig: {
            audioEncoding:
              protos.google.cloud.texttospeech.v1beta1.AudioEncoding.LINEAR16,
            sampleRateHertz: TTS_SAMPLE_RATE,
          },
        }),
      );

    const [ttsResponse] = await retryWithBackoff(synthesize, {
      retries: TTS_RETRIES,
      baseDelayMs: TTS_RETRY_BASE_DELAY_MS,
      shouldRetry: isRetryableTtsError,
      onRetry: (error, attempt, delayMs) => {
        const code = (error as { code?: number })?.code;
        console.warn(
          `TTS throttled (gRPC ${code}), retry ${attempt}/${TTS_RETRIES} in ${Math.round(delayMs)}ms`,
        );
      },
    });
    return parseWav(Buffer.from(ttsResponse.audioContent as Uint8Array));
  }

  private async persistAudioguideToDatabase(
    placeId: string,
    lang: string,
    placeDetails: PlaceDetails,
    geminiResult: GeminiResult,
  ): Promise<Audioguide> {
    try {
      const audioguide = this.audioguideRepository.create({
        placeId,
        placeName: placeDetails.placeName,
        city: placeDetails.city,
        latitude: placeDetails.latitude,
        longitude: placeDetails.longitude,
        lang,
        attributes: buildAudioguideAttributes(placeDetails, geminiResult),
      });

      const saved = await this.audioguideRepository.save(audioguide);
      console.log('Audioguide saved to database successfully');
      return saved;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Error at DB save step: ${msg}`);
      throw new InternalServerErrorException(
        'An error occurred, please try again later',
      );
    }
  }
}
