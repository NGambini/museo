/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
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
  TextToSpeechClient: jest.fn().mockImplementation(() => ({
    synthesizeSpeech: jest.fn(),
  })),
}));

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
}));

const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
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
    userId: 'user-uuid',
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

  describe('remove', () => {
    it('throws NotFoundException if the audioguide is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.remove('ag-uuid', 'user-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if the audioguide belongs to another user', async () => {
      mockRepository.findOne.mockResolvedValue(
        makeAudioguide({ userId: 'other-user' }),
      );
      await expect(service.remove('ag-uuid', 'user-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deletes the audioguide if the user is the owner', async () => {
      const ag = makeAudioguide();
      mockRepository.findOne.mockResolvedValue(ag);
      mockRepository.remove.mockResolvedValue(undefined);

      await service.remove('ag-uuid', 'user-uuid');

      expect(mockRepository.remove).toHaveBeenCalledWith(ag);
    });
  });

  describe('generate', () => {
    it('returns the existing audioguide without calling the AI (cache hit)', async () => {
      const existing = makeAudioguide();
      // findOne called for the cache check (where: { placeId, lang })
      mockRepository.findOne.mockResolvedValue(existing);

      const result = await service.generate('place-123', 'fr', 'user-uuid');

      expect(result.placeId).toBe('place-123');
      // The repository should not have created/saved a new audioguide
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});
