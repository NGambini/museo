import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const query = jest.fn();

  const makeController = async (): Promise<HealthController> => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: getDataSourceToken(), useValue: { query } }],
    }).compile();

    return module.get<HealthController>(HealthController);
  };

  beforeEach(() => jest.clearAllMocks());

  it('reports ok when the database answers', async () => {
    query.mockResolvedValue([{ '?column?': 1 }]);
    const controller = await makeController();

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('throws 503 when the database is unreachable', async () => {
    query.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const controller = await makeController();

    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('does not leak the database error to the caller', async () => {
    query.mockRejectedValue(new Error('password authentication failed'));
    const controller = await makeController();

    await expect(controller.check()).rejects.toMatchObject({
      response: { status: 'error', database: 'down' },
    });
  });
});
