import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Sonde de vie. Contrairement à `/`, elle touche réellement la base : une API
 * qui répond mais ne peut plus lire ses données n'est pas en bonne santé.
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
      // 503 plutôt que 500 : le service est temporairement indisponible, ce que
      // les sondes et les load balancers savent interpréter.
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }

    return { status: 'ok', database: 'up' };
  }
}
