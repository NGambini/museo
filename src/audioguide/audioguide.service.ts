import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Storage, Bucket } from '@google-cloud/storage';
import { v1beta1, protos } from '@google-cloud/text-to-speech';
import { GoogleGenAI } from '@google/genai';
import { Audioguide } from './audioguide.entity';
import { GeminiChapter, GeminiResult, PlaceDetails } from './audioguide.types';
import { buildAudioguidePrompt } from './audioguide.prompts';
import { PaginatedAudioguides } from './dto/audioguide-summary.dto';
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
  buildChapterSsml,
  buildTranscript,
} from './audioguide.utils';

// Service-wide cap, all users combined. The controller's throttle bounds what a
// single account can consume; this one bounds the day's Gemini + TTS spend no
// matter how many accounts exist. Cache hits do not count against it: they
// trigger no billable call.
const MAX_GENERATIONS_PER_DAY = 100;

@Injectable()
export class AudioguideService {
  private readonly storage: Storage;
  private readonly ttsClient: v1beta1.TextToSpeechClient;

  constructor(
    @InjectRepository(Audioguide)
    private readonly audioguideRepository: Repository<Audioguide>,
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

  async generate(placeId: string, lang: string): Promise<Audioguide> {
    const existing = await this.audioguideRepository.findOne({
      where: { placeId, lang },
    });
    if (existing) {
      console.log(`Cache hit for place_id ${placeId}`);
      return this.withSignedUrls(existing);
    }

    await this.assertDailyQuotaAvailable();

    console.log(`Generating audioguide for place_id ${placeId}`);

    const bucketName = process.env.GCS_BUCKET_NAME!;
    const bucket = this.storage.bucket(bucketName);

    const placeDetails = await this.fetchPlaceDetailsFromGooglePlaces(
      placeId,
      lang,
      bucket,
    );

    const geminiResult = await this.generateAudioguideWithGemini(
      placeDetails.placeName,
      lang,
    );

    await this.fetchAndUploadChapterImages(
      geminiResult.chapters,
      placeId,
      lang,
      bucket,
      placeDetails.photoReferences,
    );

    await this.synthesizeAndUploadAudio(
      geminiResult.chapters,
      placeId,
      lang,
      bucket,
    );

    const saved = await this.persistAudioguideToDatabase(
      placeId,
      lang,
      placeDetails,
      geminiResult,
    );

    return this.withSignedUrls(saved);
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
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,geometry,rating,photos&key=${process.env.GOOGLE_PLACES_API_KEY}`,
      );
      const data = (await res.json()) as PlacesApiRawData;
      const { placeName, latitude, longitude, rating, photoReferences } =
        parsePlacesApiResponse(data);

      console.log(
        `Google Places OK: ${placeName} (${photoReferences.length} photos)`,
      );

      const mainImagePath = await this.uploadMainPhoto(
        photoReferences[0],
        placeId,
        lang,
        bucket,
      );

      return {
        placeName,
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
   */
  private async synthesizeAndUploadOneChapterAudio(
    chapter: GeminiChapter,
    placeId: string,
    lang: string,
    bucket: Bucket,
  ): Promise<void> {
    const ssml = buildChapterSsml(chapter.lines);

    const [ttsResponse] = await this.ttsClient.synthesizeSpeech({
      input: { ssml },
      voice: { languageCode: 'fr-FR', name: 'fr-FR-Neural2-G' },
      audioConfig: {
        audioEncoding:
          protos.google.cloud.texttospeech.v1beta1.AudioEncoding.MP3,
      },
      enableTimePointing: [
        protos.google.cloud.texttospeech.v1beta1.SynthesizeSpeechRequest
          .TimepointType.SSML_MARK,
      ],
    });

    const path = buildChapterAudioPath(placeId, lang, chapter.chapter_number);
    const audioBuffer = Buffer.from(ttsResponse.audioContent as Uint8Array);
    await bucket.file(path).save(audioBuffer, { contentType: 'audio/mpeg' });

    // Store the GCS path — signed URL is generated at read time
    chapter.audio_url = path;
    chapter.transcript = buildTranscript(
      chapter.lines,
      ttsResponse.timepoints ?? [],
    );
    console.log(`Chapter ${chapter.chapter_number} audio uploaded to GCS`);
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
