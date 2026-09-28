import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { queryClient } from '@/lib/queryClient';
import type { Audioguide, AudioguideSummary, PaginatedAudioguides } from '@/types/audioguide';

const KEYS = {
  all: (params: AudioguidesListParams) => ['audioguides', params] as const,
  one: (id: string) => ['audioguides', id] as const,
};

// Fixed key (not per-place): only one generation is ever in flight at a time in
// this flow, so LottieTransitionScreen can watch it via useMutationState without
// HomeScreen having to stay mounted or pass anything through navigation params.
export const GENERATE_AUDIOGUIDE_MUTATION_KEY = ['audioguides', 'generate'] as const;

export type AudioguidesListParams = {
  page?: number;
  limit?: number;
  lang?: string;
};

function buildQueryString(params: AudioguidesListParams): string {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.lang) search.set('lang', params.lang);
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** GET /audioguides — catalogue partagé, pas d'authentification. */
export function useAudioguides(params: AudioguidesListParams = {}) {
  return useQuery({
    queryKey: KEYS.all(params),
    queryFn: () => apiFetch<PaginatedAudioguides>(`/audioguides${buildQueryString(params)}`),
  });
}

export function useAudioguide(id: string) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: () => apiFetch<Audioguide>(`/audioguides/${id}`),
    enabled: Boolean(id),
  });
}

export function useGenerateAudioguide() {
  return useMutation({
    mutationKey: GENERATE_AUDIOGUIDE_MUTATION_KEY,
    mutationFn: (input: { place_id: string; lang?: string }) =>
      apiFetch<Audioguide>('/audioguides/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (newAudioguide) => {
      // Seed le cache individuel, et invalide le catalogue (paginé côté API,
      // donc on ne peut plus l'éditer à la main de façon fiable).
      queryClient.setQueryData(KEYS.one(newAudioguide.id), newAudioguide);
      queryClient.invalidateQueries({ queryKey: ['audioguides'] });
    },
  });
}

export type { AudioguideSummary };
