import type { PageHandler } from 'adminjs';
import { dataSource } from '../db/data-source.js';
import { Audioguide } from '../entities/audioguide.entity.js';

// Reflet du plafond codé dans l'API (MAX_GENERATIONS_PER_DAY). S'il change
// là-bas, le compteur affiché ici devient faux — c'est un chiffre indicatif,
// pas la source de vérité.
const DAILY_CAP = 100;

export interface DashboardData {
  total: number;
  byLang: Array<{ lang: string; count: number }>;
  generatedToday: number;
  dailyCap: number;
  recent: Array<{
    id: string;
    placeName: string;
    lang: string;
    createdAt: string;
    chapters: number;
  }>;
}

export const dashboardHandler: PageHandler = async () => {
  const repository = dataSource.getRepository(Audioguide);

  const startOfDayUtc = new Date();
  startOfDayUtc.setUTCHours(0, 0, 0, 0);

  const [total, byLangRows, generatedToday, recent] = await Promise.all([
    repository.count(),
    repository
      .createQueryBuilder('a')
      .select('a.lang', 'lang')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.lang')
      .orderBy('count', 'DESC')
      .getRawMany<{ lang: string; count: string }>(),
    repository
      .createQueryBuilder('a')
      .where('a.created_at >= :start', { start: startOfDayUtc })
      .getCount(),
    repository.find({
      select: ['id', 'placeName', 'lang', 'createdAt', 'attributes'],
      order: { createdAt: 'DESC' },
      take: 6,
    }),
  ]);

  const data: DashboardData = {
    total,
    byLang: byLangRows.map((row) => ({
      lang: row.lang,
      count: Number(row.count),
    })),
    generatedToday,
    dailyCap: DAILY_CAP,
    recent: recent.map((audioguide) => ({
      id: audioguide.id,
      placeName: audioguide.placeName,
      lang: audioguide.lang,
      createdAt: audioguide.createdAt.toISOString(),
      chapters: audioguide.attributes?.chapters?.length ?? 0,
    })),
  };

  return data;
};
