import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Storage, Bucket } from '@google-cloud/storage';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { GoogleGenAI } from '@google/genai';
import { Audioguide } from './audioguide.entity';
import { GeminiChapter, GeminiResult, PlaceDetails } from './audioguide.types';
import { buildAudioguidePrompt } from './audioguide.prompts';

@Injectable()
export class AudioguideService {
  private readonly storage: Storage;
  private readonly ttsClient: TextToSpeechClient;

  constructor(
    @InjectRepository(Audioguide)
    private readonly audioguideRepository: Repository<Audioguide>,
  ) {
    this.storage = new Storage({ projectId: process.env.GOOGLE_PROJECT_ID });

    this.ttsClient = new TextToSpeechClient();
  }

  async findAll(userId: string): Promise<Audioguide[]> {
    return this.audioguideRepository.find({ where: { userId } });
  }

  async findOne(id: string, userId: string): Promise<Audioguide> {
    const audioguide = await this.audioguideRepository.findOne({
      where: { id },
    });
    if (!audioguide) throw new NotFoundException('Audioguide not found');
    if (audioguide.userId !== userId) throw new ForbiddenException();
    return audioguide;
  }

  async remove(id: string, userId: string): Promise<void> {
    const audioguide = await this.findOne(id, userId);
    await this.audioguideRepository.remove(audioguide);
  }

  async generate(
    placeId: string,
    lang: string,
    userId: string,
  ): Promise<Audioguide> {
    const existing = await this.audioguideRepository.findOne({
      where: { placeId, lang },
    });
    if (existing) {
      console.log(`Cache hit for place_id ${placeId}`);
      return existing;
    }

    console.log(`Generating audioguide for place_id ${placeId}`);

    const bucketName = process.env.GCS_BUCKET_NAME!;
    const bucket = this.storage.bucket(bucketName);

    const placeDetails = await this.fetchPlaceDetailsFromGooglePlaces(
      placeId,
      lang,
      bucket,
      bucketName,
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
      bucketName,
    );

    await this.synthesizeAndUploadAudio(
      geminiResult.chapters,
      placeId,
      lang,
      bucket,
      bucketName,
    );

    return this.persistAudioguideToDatabase(
      placeId,
      lang,
      userId,
      placeDetails,
      geminiResult,
    );
  }

  private async fetchPlaceDetailsFromGooglePlaces(
    placeId: string,
    lang: string,
    bucket: Bucket,
    bucketName: string,
  ): Promise<PlaceDetails> {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,geometry,rating,photos&key=${process.env.GOOGLE_PLACES_API_KEY}`,
      );
      const data = (await res.json()) as {
        status: string;
        result: {
          name: string;
          geometry: { location: { lat: number; lng: number } };
          rating?: number;
          photos?: Array<{ photo_reference: string }>;
        };
      };

      if (data.status !== 'OK') {
        throw new Error(`Google Places API returned status: ${data.status}`);
      }

      const placeName = data.result.name;
      console.log(`Google Places OK: ${placeName}`);

      const mainImageUrl = await this.uploadMainPhoto(
        data.result.photos?.[0]?.photo_reference,
        placeId,
        lang,
        bucket,
        bucketName,
      );

      return {
        placeName,
        latitude: data.result.geometry.location.lat,
        longitude: data.result.geometry.location.lng,
        rating: data.result.rating ?? null,
        mainImageUrl,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Error at Google Places step: ${msg}`, error);
      throw new InternalServerErrorException(
        'An error occurred, please try again later',
      );
    }
  }

  private async uploadMainPhoto(
    photoRef: string | undefined,
    placeId: string,
    lang: string,
    bucket: Bucket,
    bucketName: string,
  ): Promise<string | undefined> {
    if (!photoRef) return undefined;

    const photoRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${process.env.GOOGLE_PLACES_API_KEY}`,
    );
    const buffer = Buffer.from(await photoRes.arrayBuffer());
    await bucket
      .file(`${placeId}/${lang}/pictures/main.jpg`)
      .save(buffer, { contentType: 'image/jpeg' });

    const url = `https://storage.googleapis.com/${bucketName}/${placeId}/${lang}/pictures/main.jpg`;
    console.log('Main photo uploaded to GCS');
    return url;
  }

  private async generateAudioguideWithGemini(
    placeName: string,
    lang: string,
  ): Promise<GeminiResult> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [
          {
            role: 'user',
            parts: [{ text: buildAudioguidePrompt(placeName, lang) }],
          },
        ],
        config: { responseMimeType: 'application/json' },
      });

      const responseText = result.text!;
      const geminiResult = JSON.parse(responseText) as GeminiResult;

      if (
        !geminiResult.title ||
        !geminiResult.history ||
        !Array.isArray(geminiResult.chapters) ||
        geminiResult.chapters.length < 3 ||
        geminiResult.chapters.length > 5
      ) {
        throw new Error('Invalid Gemini response structure');
      }

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
    bucketName: string,
  ): Promise<void> {
    try {
      await Promise.all(
        chapters.map((chapter) =>
          this.fetchAndUploadOneChapterImage(
            chapter,
            placeId,
            lang,
            bucket,
            bucketName,
          ),
        ),
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Error at Wikimedia images step: ${msg}`);
      throw new InternalServerErrorException(
        'An error occurred, please try again later',
      );
    }
  }

  private async fetchAndUploadOneChapterImage(
    chapter: GeminiChapter,
    placeId: string,
    lang: string,
    bucket: Bucket,
    bucketName: string,
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
      const pages = wikiData.query?.pages;
      const thumbUrl = pages
        ? (Object.values(pages)[0]?.imageinfo?.[0]?.thumburl ?? null)
        : null;

      if (!thumbUrl) {
        console.log(`No image found for chapter ${chapter.chapter_number}`);
        return;
      }

      const imgBuffer = Buffer.from(
        await (await fetch(thumbUrl)).arrayBuffer(),
      );
      await bucket
        .file(
          `${placeId}/${lang}/pictures/chapter_${chapter.chapter_number}.jpg`,
        )
        .save(imgBuffer, { contentType: 'image/jpeg' });

      chapter.image_url = `https://storage.googleapis.com/${bucketName}/${placeId}/${lang}/pictures/chapter_${chapter.chapter_number}.jpg`;
      console.log(`Chapter ${chapter.chapter_number} image uploaded`);
    } catch {
      console.log(`No image found for chapter ${chapter.chapter_number}`);
    }
  }

  private async synthesizeAndUploadAudio(
    chapters: GeminiChapter[],
    placeId: string,
    lang: string,
    bucket: Bucket,
    bucketName: string,
  ): Promise<void> {
    try {
      await Promise.all(
        chapters.map((chapter) =>
          this.synthesizeAndUploadOneChapterAudio(
            chapter,
            placeId,
            lang,
            bucket,
            bucketName,
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

  private async synthesizeAndUploadOneChapterAudio(
    chapter: GeminiChapter,
    placeId: string,
    lang: string,
    bucket: Bucket,
    bucketName: string,
  ): Promise<void> {
    const [ttsResponse] = await this.ttsClient.synthesizeSpeech({
      input: { text: chapter.text },
      voice: { languageCode: 'fr-FR', name: 'fr-FR-Chirp-HD-F' },
      audioConfig: {
        audioEncoding: 'MP3' as unknown as number,
        pitch: 3.0,
        speakingRate: 0.9,
      },
    });

    const audioBuffer = Buffer.from(ttsResponse.audioContent as Uint8Array);
    await bucket
      .file(`${placeId}/${lang}/tracks/chapter_${chapter.chapter_number}.mp3`)
      .save(audioBuffer, { contentType: 'audio/mpeg' });

    chapter.audio_url = `https://storage.googleapis.com/${bucketName}/${placeId}/${lang}/tracks/chapter_${chapter.chapter_number}.mp3`;
    console.log(`Chapter ${chapter.chapter_number} audio uploaded to GCS`);
  }

  private async persistAudioguideToDatabase(
    placeId: string,
    lang: string,
    userId: string,
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
        userId,
        attributes: {
          main_image_url: placeDetails.mainImageUrl ?? null,
          rating: placeDetails.rating,
          admission_price: geminiResult.admission_price,
          title: geminiResult.title,
          history: geminiResult.history,
          chapters: geminiResult.chapters,
        },
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
