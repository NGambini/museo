import type { PageHandler } from 'adminjs';
import { adminApi } from '../api/admin-client.js';

export interface DashboardData {
  total: number;
  generatedToday: number;
  dailyCap: number;
  byLang: Array<{ lang: string; count: number }>;
  recent: Array<{
    id: string;
    placeName: string;
    lang: string;
    createdAt: string;
    chapters: number;
  }>;
}

/**
 * Counters come from the API, which owns the daily cap constant — so the figure
 * shown here cannot drift from the one actually enforced.
 */
export const dashboardHandler: PageHandler = async () => {
  const [stats, latest] = await Promise.all([
    adminApi.audioguides.stats(),
    adminApi.audioguides.list({
      page: 1,
      limit: 6,
      sort_by: 'createdAt',
      direction: 'desc',
    }),
  ]);

  const data: DashboardData = {
    total: stats.total,
    generatedToday: stats.generatedToday,
    dailyCap: stats.dailyCap,
    byLang: stats.byLang,
    recent: latest.items.map((audioguide) => ({
      id: audioguide.id,
      placeName: audioguide.placeName,
      lang: audioguide.lang,
      createdAt: audioguide.createdAt,
      chapters: audioguide.attributes?.chapters?.length ?? 0,
    })),
  };

  return data;
};
