import { setAuthCookies } from '../admin/auth.js';
import { authedCall } from './client.js';
import { currentContext } from './request-context.js';
import type { AudioguideAttributes } from '../types/attributes.js';

/**
 * Typed access to the API's /admin surface.
 *
 * These endpoints return rows exactly as stored — `attributes` holds raw GCS
 * paths. Playback needs signed URLs instead, which is what the public
 * `GET /audioguides/:id` provides; see routes/bo-api.ts.
 */

export interface AdminAudioguide {
  id: string;
  placeId: string;
  placeName: string;
  latitude: number;
  longitude: number;
  lang: string;
  attributes: AudioguideAttributes;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AudioguideStats {
  total: number;
  generatedToday: number;
  dailyCap: number;
  byLang: Array<{ lang: string; count: number }>;
}

/** Every call runs as the admin behind the current request. */
function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { tokens, res } = currentContext();
  return authedCall<T>(path, init, tokens, (renewed) =>
    setAuthCookies(res, renewed),
  );
}

function query(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const adminApi = {
  audioguides: {
    list: (params: Record<string, unknown>) =>
      call<Paginated<AdminAudioguide>>(`/admin/audioguides${query(params)}`),
    get: (id: string) =>
      call<AdminAudioguide>(`/admin/audioguides/${encodeURIComponent(id)}`),
    update: (id: string, body: Record<string, unknown>) =>
      call<AdminAudioguide>(`/admin/audioguides/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      call<void>(`/admin/audioguides/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
    stats: () => call<AudioguideStats>('/admin/audioguides/stats'),
  },
  users: {
    list: (params: Record<string, unknown>) =>
      call<Paginated<AdminUser>>(`/admin/users${query(params)}`),
    get: (id: string) =>
      call<AdminUser>(`/admin/users/${encodeURIComponent(id)}`),
    updateRole: (id: string, role: string) =>
      call<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
  },
};
