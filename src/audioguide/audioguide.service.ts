import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Storage } from '@google-cloud/storage';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { VertexAI } from '@google-cloud/vertexai';
import { Audioguide } from './audioguide.entity';
import { CreateAudioguideDto } from './dto/create-audioguide.dto';
import { UpdateAudioguideDto } from './dto/update-audioguide.dto';

interface GeminiChapter {
  chapter_number: number;
  title: string;
  description: string;
  text: string;
  image_search_query: string;
  image_url?: string;
  audio_url?: string;
}

interface GeminiResult {
  title: string;
  admission_price: string | null;
  history: string;
  chapters: GeminiChapter[];
}

@Injectable()
export class AudioguideService {
  private readonly storage: Storage;
  private readonly ttsClient: TextToSpeechClient;

  constructor(
    @InjectRepository(Audioguide)
    private readonly audioguideRepository: Repository<Audioguide>,
  ) {
    this.storage = new Storage();
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

  async create(dto: CreateAudioguideDto, userId: string): Promise<Audioguide> {
    const audioguide = this.audioguideRepository.create({
      ...dto,
      userId,
      attributes: dto.attributes ?? {},
    });
    return this.audioguideRepository.save(audioguide);
  }

  async update(
    id: string,
    dto: UpdateAudioguideDto,
    userId: string,
  ): Promise<Audioguide> {
    const audioguide = await this.findOne(id, userId);
    Object.assign(audioguide, dto);
    return this.audioguideRepository.save(audioguide);
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
    // Step 3: Cache check
    const existing = await this.audioguideRepository.findOne({
      where: { placeId, lang },
    });
    if (existing) {
      console.log(`Cache hit pour place_id ${placeId}`);
      return existing;
    }

    console.log(`Génération audioguide pour place_id ${placeId}`);

    const bucketName = process.env.GCS_BUCKET_NAME!;
    const bucket = this.storage.bucket(bucketName);

    // Step 4a: Google Places API + main photo upload
    let placeName!: string;
    let latitude!: number;
    let longitude!: number;
    let rating: number | null = null;
    let mainImageUrl: string | undefined;

    try {
      const placesRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,geometry,rating,photos&key=${process.env.GOOGLE_PLACES_API_KEY}`,
      );
      const placesData = (await placesRes.json()) as {
        status: string;
        result: {
          name: string;
          geometry: { location: { lat: number; lng: number } };
          rating?: number;
          photos?: Array<{ photo_reference: string }>;
        };
      };

      if (placesData.status !== 'OK') {
        throw new Error(
          `Google Places API returned status: ${placesData.status}`,
        );
      }

      placeName = placesData.result.name;
      latitude = placesData.result.geometry.location.lat;
      longitude = placesData.result.geometry.location.lng;
      rating = placesData.result.rating ?? null;

      console.log(`Google Places OK : ${placeName}`);

      const photoRef = placesData.result.photos?.[0]?.photo_reference;
      if (photoRef) {
        const photoRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${process.env.GOOGLE_PLACES_API_KEY}`,
        );
        const photoBuffer = Buffer.from(await photoRes.arrayBuffer());
        const gcsFile = bucket.file(`${placeId}/${lang}/pictures/main.jpg`);
        await gcsFile.save(photoBuffer, {
          contentType: 'image/jpeg',
          public: true,
        });
        mainImageUrl = `https://storage.googleapis.com/${bucketName}/${placeId}/${lang}/pictures/main.jpg`;
        console.log('Photo principale uploadée sur GCS');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Erreur étape Google Places : ${msg}`);
      throw new InternalServerErrorException(
        'An error occurred, please try again later',
      );
    }

    // Step 4b: Gemini 2.0 Flash via Vertex AI
    let geminiResult!: GeminiResult;

    try {
      const vertexAI = new VertexAI({
        project: process.env.GOOGLE_PROJECT_ID!,
        location: 'us-central1',
      });
      const model = vertexAI.getGenerativeModel({
        model: 'gemini-2.0-flash-001',
      });

      const prompt = `Tu es un guide touristique expert pour enfants de 6 à 12 ans. Génère un audioguide complet et captivant pour "${placeName}" en ${lang === 'fr' ? 'français' : lang}, adapté à des enfants.

Réponds UNIQUEMENT avec un objet JSON valide respectant exactement cette structure, sans aucun texte supplémentaire :
{
  "title": "Titre accrocheur de l'audioguide pour enfants",
  "admission_price": "prix d'entrée (ex: '15€') ou null si tu n'en es pas certain",
  "history": "Introduction historique du lieu en 2-3 phrases simples et engageantes pour les enfants",
  "chapters": [
    {
      "chapter_number": 1,
      "title": "Titre du chapitre",
      "description": "Description courte du chapitre en 1 phrase",
      "text": "Texte à lire à voix haute, adapté aux enfants de 6-12 ans, fun et éducatif (200-300 mots)",
      "image_search_query": "specific english keyword optimized for Wikimedia Commons image search"
    }
  ]
}

Génère entre 3 et 5 chapitres. Pour admission_price, ne renseigne ce champ que si tu en es certain, sinon mets null.`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });

      const responseText =
        result.response.candidates![0].content.parts[0].text!;
      geminiResult = JSON.parse(responseText) as GeminiResult;

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
        `Gemini OK : ${geminiResult.chapters.length} chapitres générés`,
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Erreur étape Gemini : ${msg}`);
      throw new InternalServerErrorException(
        'An error occurred, please try again later',
      );
    }

    // Step 4c: Wikimedia images + GCS upload in parallel
    try {
      await Promise.all(
        geminiResult.chapters.map(async (chapter) => {
          try {
            const wikiRes = await fetch(
              `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(chapter.image_search_query)}&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=500&format=json`,
            );
            const wikiData = (await wikiRes.json()) as {
              query?: {
                pages?: Record<
                  string,
                  { imageinfo?: Array<{ thumburl?: string }> }
                >;
              };
            };
            const pages = wikiData.query?.pages;

            if (pages) {
              const firstPage = Object.values(pages)[0];
              const thumbUrl = firstPage?.imageinfo?.[0]?.thumburl;

              if (thumbUrl) {
                const imgRes = await fetch(thumbUrl);
                const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
                const gcsFile = bucket.file(
                  `${placeId}/${lang}/pictures/chapter_${chapter.chapter_number}.jpg`,
                );
                await gcsFile.save(imgBuffer, {
                  contentType: 'image/jpeg',
                  public: true,
                });
                chapter.image_url = `https://storage.googleapis.com/${bucketName}/${placeId}/${lang}/pictures/chapter_${chapter.chapter_number}.jpg`;
                console.log(
                  `Image chapitre ${chapter.chapter_number} uploadée`,
                );
              } else {
                console.log(
                  `Pas d'image trouvée pour chapitre ${chapter.chapter_number}`,
                );
              }
            } else {
              console.log(
                `Pas d'image trouvée pour chapitre ${chapter.chapter_number}`,
              );
            }
          } catch {
            console.log(
              `Pas d'image trouvée pour chapitre ${chapter.chapter_number}`,
            );
          }
        }),
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Erreur étape Wikimedia images : ${msg}`);
      throw new InternalServerErrorException(
        'An error occurred, please try again later',
      );
    }

    // Step 4d+4e: TTS in parallel + GCS upload
    try {
      await Promise.all(
        geminiResult.chapters.map(async (chapter) => {
          const [ttsResponse] = await this.ttsClient.synthesizeSpeech({
            input: { text: chapter.text },
            voice: { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A' },
            audioConfig: {
              audioEncoding: 'MP3' as unknown as number,
              pitch: 3.0,
              speakingRate: 0.9,
            },
          });

          const audioBuffer = Buffer.from(
            ttsResponse.audioContent as Uint8Array,
          );
          const gcsFile = bucket.file(
            `${placeId}/${lang}/tracks/chapter_${chapter.chapter_number}.mp3`,
          );
          await gcsFile.save(audioBuffer, {
            contentType: 'audio/mpeg',
            public: true,
          });
          chapter.audio_url = `https://storage.googleapis.com/${bucketName}/${placeId}/${lang}/tracks/chapter_${chapter.chapter_number}.mp3`;
          console.log(
            `Audio chapitre ${chapter.chapter_number} uploadé sur GCS`,
          );
        }),
      );

      console.log(`TTS OK pour ${geminiResult.chapters.length} chapitres`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Erreur étape TTS : ${msg}`);
      throw new InternalServerErrorException(
        'An error occurred, please try again later',
      );
    }

    // Step 4h: Save to DB
    try {
      const audioguide = this.audioguideRepository.create({
        placeId,
        placeName,
        latitude,
        longitude,
        lang,
        userId,
        audioUrl: null,
        attributes: {
          main_image_url: mainImageUrl ?? null,
          rating,
          admission_price: geminiResult.admission_price,
          title: geminiResult.title,
          history: geminiResult.history,
          chapters: geminiResult.chapters,
        },
      });

      const saved = await this.audioguideRepository.save(audioguide);
      console.log('Audioguide sauvegardé en base avec succès');
      return saved;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Erreur étape sauvegarde DB : ${msg}`);
      throw new InternalServerErrorException(
        'An error occurred, please try again later',
      );
    }
  }
}
