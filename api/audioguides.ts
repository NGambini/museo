import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { queryClient } from '@/lib/queryClient';

export type Audioguide = {
  id: string;
  createdAt: string;
  updatedAt: string;
  placeId: string;
  placeName: string;
  latitude: number;
  longitude: number;
  lang: string;
  userId: string;
  attributes: { title?: string; chapters?: unknown[] };
};

const KEYS = {
  all: ['audioguides'] as const,
  one: (id: string) => ['audioguides', id] as const,
};

export function useAudioguides() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: () => apiFetch<Audioguide[]>('/audioguides'),
  });
}

export function useAudioguide(id: string) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: () => apiFetch<Audioguide>(`/audioguides/${id}`),
  });
}

export function useGenerateAudioguide() {
  return useMutation({
    mutationFn: (input: { place_id: string; lang?: string }) =>
      apiFetch<Audioguide>('/audioguides/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (newAudioguide) => {
      // Ajoute directement au cache sans refetch
      queryClient.setQueryData<Audioguide[]>(KEYS.all, (prev = []) => [newAudioguide, ...prev]);
      // Seed le cache individuel aussi
      queryClient.setQueryData(KEYS.one(newAudioguide.id), newAudioguide);
    },
  });
}

export function useDeleteAudioguide() {
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/audioguides/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Audioguide[]>(KEYS.all, (prev = []) =>
        prev.filter((a) => a.id !== id)
      );
      queryClient.removeQueries({ queryKey: KEYS.one(id) });
    },
  });
}
