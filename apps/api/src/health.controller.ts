import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Liveness probe. Unlike `/`, it actually hits the database: an API that
 * answers but can no longer read its own data is not healthy.
 */
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<{ status: string; database: string }> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Health check failed: ${msg}`);
      // 503 rather than 500: the service is temporarily unavailable, which is
      // what probes and load balancers know how to act on.
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }

    return { status: 'ok', database: 'up' };
  }
}
