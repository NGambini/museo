import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AudioguideService } from './audioguide.service';
import { Audioguide } from './audioguide.entity';
import { GenerationJobsService } from './jobs/generation-jobs.service';

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
            AudioEncoding: { LINEAR16: 1 },
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
  findAndCount: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
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
        GenerationJobsService,
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

    it('returns the audioguide whoever created it (shared catalogue)', async () => {
      mockRepository.findOne.mockResolvedValue(makeAudioguide());

      const result = await service.findOne('ag-uuid');

      expect(result.placeId).toBe('place-123');
    });
  });

  describe('findAll', () => {
    it('paginates the catalogue and reports the total', async () => {
      mockRepository.findAndCount.mockResolvedValue([[makeAudioguide()], 42]);

      const result = await service.findAll(3, 20);

      expect(result).toEqual({
        items: [makeAudioguide()],
        total: 42,
        page: 3,
        limit: 20,
      });
      const [options] = mockRepository.findAndCount.mock.calls.at(0) as [
        { skip: number; take: number; where: Record<string, unknown> },
      ];
      expect(options.skip).toBe(40);
      expect(options.take).toBe(20);
      expect(options.where).toEqual({});
    });

    it('filters by language when one is given', async () => {
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 20, 'en');

      const [options] = mockRepository.findAndCount.mock.calls.at(0) as [
        { where: Record<string, unknown> },
      ];
      expect(options.where).toEqual({ lang: 'en' });
    });

    it('does not sign any URL for the listing', async () => {
      mockRepository.findAndCount.mockResolvedValue([[makeAudioguide()], 1]);

      await service.findAll(1, 20);

      expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('admin surface', () => {
    it('keeps raw GCS paths — signing here would be written back on save', async () => {
      mockRepository.findAndCount.mockResolvedValue([
        [
          makeAudioguide({
            attributes: { chapters: [{ audio_url: 'a/b.mp3' }] },
          }),
        ],
        1,
      ]);

      const result = await service.findAllForAdmin({});

      expect(mockGetSignedUrl).not.toHaveBeenCalled();
      expect(result.items[0].attributes).toEqual({
        chapters: [{ audio_url: 'a/b.mp3' }],
      });
    });

    it('translates filters and sorting into the query', async () => {
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAllForAdmin({
        lang: 'en',
        place_id: 'place-123',
        place_name: 'eiffel',
        sort_by: 'placeName',
        direction: 'asc',
        page: 3,
        limit: 10,
      });

      const [options] = mockRepository.findAndCount.mock.calls.at(0) as [
        {
          where: Record<string, unknown>;
          order: Record<string, string>;
          skip: number;
          take: number;
        },
      ];
      expect(options.where.lang).toBe('en');
      expect(options.where.placeId).toBe('place-123');
      expect(options.order).toEqual({ placeName: 'asc' });
      expect(options.skip).toBe(20);
      expect(options.take).toBe(10);
    });

    it('leaves untouched columns alone when the patch omits them', async () => {
      const existing = makeAudioguide();
      mockRepository.findOne.mockResolvedValue(existing);
      mockRepository.save.mockResolvedValue(existing);

      // The validation pipe hands over a DTO whose absent fields are present
      // but undefined; assigning it wholesale would blank those columns.
      await service.update('ag-uuid', {
        placeName: 'Renamed',
        placeId: undefined,
        attributes: undefined,
      });

      const [saved] = mockRepository.save.mock.calls.at(0) as [
        { placeName: string; placeId: string; attributes: unknown },
      ];
      expect(saved.placeName).toBe('Renamed');
      expect(saved.placeId).toBe('place-123');
      expect(saved.attributes).toEqual({});
    });

    it('throws NotFoundException when deleting an unknown id', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.remove('nope')).rejects.toThrow(NotFoundException);
      expect(mockRepository.remove).not.toHaveBeenCalled();
    });

    it('reports the cap the API actually enforces', async () => {
      mockRepository.count.mockResolvedValue(7);
      mockRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ lang: 'fr', count: '7' }]),
      });

      const stats = await service.stats();

      expect(stats.dailyCap).toBe(100);
      expect(stats.byLang).toEqual([{ lang: 'fr', count: 7 }]);
    });
  });

  describe('generate', () => {
    it('finishes the job on the spot without calling the AI (cache hit)', async () => {
      const existing = makeAudioguide();
      // findOne called for the cache check (where: { placeId, lang })
      mockRepository.findOne.mockResolvedValue(existing);

      const job = await service.startGeneration('place-123', 'fr');

      // The caller gets a finished job in the 202 body, so a cache hit needs no
      // websocket round trip.
      expect(job.step).toBe('done');
      expect(job.audioguideId).toBe(existing.id);
      // The repository should not have created/saved a new audioguide
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('does not count a cache hit against the daily cap', async () => {
      mockRepository.findOne.mockResolvedValue(makeAudioguide());

      await service.startGeneration('place-123', 'fr');

      expect(mockRepository.count).not.toHaveBeenCalled();
    });

    it('rejects the request itself when the cap is reached, not the job', async () => {
      // The two refusals that can happen up front stay synchronous, so the
      // caller reads them off the HTTP response instead of waiting on a socket.
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.count.mockResolvedValue(100);

      await expect(service.startGeneration('place-999', 'fr')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('throws ServiceUnavailableException once the daily cap is reached', async () => {
      // No cache hit: generation has to go through the cap.
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.count.mockResolvedValue(100);

      await expect(service.startGeneration('place-999', 'fr')).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('counts only audioguides created since midnight UTC', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.count.mockResolvedValue(100);

      await expect(service.startGeneration('place-999', 'fr')).rejects.toThrow(
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
