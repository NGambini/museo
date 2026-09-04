import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AudioguideService } from './audioguide.service';
import { Audioguide } from './audioguide.entity';

const mockGetSignedUrl = jest
  .fn()
  .mockResolvedValue(['https://signed.url/test']);
const mockFileFn = jest
  .fn()
  .mockReturnValue({ getSignedUrl: mockGetSignedUrl, save: jest.fn() });
const mockBucketFn = jest.fn().mockReturnValue({ file: mockFileFn });

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({ bucket: mockBucketFn })),
}));

jest.mock('@google-cloud/text-to-speech', () => ({
  v1beta1: {
    TextToSpeechClient: jest.fn().mockImplementation(() => ({
      synthesizeSpeech: jest.fn(),
    })),
  },
  protos: {
    google: {
      cloud: {
        texttospeech: {
          v1beta1: {
            AudioEncoding: { MP3: 2 },
            SynthesizeSpeechRequest: { TimepointType: { SSML_MARK: 1 } },
          },
        },
      },
    },
  },
}));

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
}));

const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const makeAudioguide = (overrides: Partial<Audioguide> = {}): Audioguide =>
  ({
    id: 'ag-uuid',
    placeId: 'place-123',
    placeName: 'Tour Eiffel',
    latitude: 48.8584,
    longitude: 2.2945,
    lang: 'fr',
    attributes: {},
    ...overrides,
  }) as Audioguide;

describe('AudioguideService', () => {
  let service: AudioguideService;

  beforeAll(() => {
    process.env.GCS_BUCKET_NAME = 'test-bucket';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudioguideService,
        { provide: getRepositoryToken(Audioguide), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<AudioguideService>(AudioguideService);
    jest.clearAllMocks();
    mockGetSignedUrl.mockResolvedValue(['https://signed.url/test']);
    mockFileFn.mockReturnValue({
      getSignedUrl: mockGetSignedUrl,
      save: jest.fn(),
    });
    mockBucketFn.mockReturnValue({ file: mockFileFn });
  });

  describe('findOne', () => {
    it('throws NotFoundException if the audioguide is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('ag-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the audioguide whoever created it (catalogue partagé)', async () => {
      mockRepository.findOne.mockResolvedValue(makeAudioguide());

      const result = await service.findOne('ag-uuid');

      expect(result.placeId).toBe('place-123');
    });
  });

  describe('generate', () => {
    it('returns the existing audioguide without calling the AI (cache hit)', async () => {
      const existing = makeAudioguide();
      // findOne called for the cache check (where: { placeId, lang })
      mockRepository.findOne.mockResolvedValue(existing);

      const result = await service.generate('place-123', 'fr');

      expect(result.placeId).toBe('place-123');
      // The repository should not have created/saved a new audioguide
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('does not count a cache hit against the daily cap', async () => {
      mockRepository.findOne.mockResolvedValue(makeAudioguide());

      await service.generate('place-123', 'fr');

      expect(mockRepository.count).not.toHaveBeenCalled();
    });

    it('throws ServiceUnavailableException once the daily cap is reached', async () => {
      // Pas de cache hit : la génération doit passer par le plafond.
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.count.mockResolvedValue(100);

      await expect(service.generate('place-999', 'fr')).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('counts only audioguides created since midnight UTC', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.count.mockResolvedValue(100);

      await expect(service.generate('place-999', 'fr')).rejects.toThrow(
        ServiceUnavailableException,
      );

      const [{ where }] = mockRepository.count.mock.calls.at(0) as [
        { where: { createdAt: { value: Date } } },
      ];
      const since = where.createdAt.value;
      expect(since.getUTCHours()).toBe(0);
      expect(since.getUTCMinutes()).toBe(0);
      expect(since.getUTCSeconds()).toBe(0);
    });
  });
});
