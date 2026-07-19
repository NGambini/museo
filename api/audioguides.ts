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
  attributes: {
    title: string;
    rating: number;
    history: string;
    chapters: {
      text: string;
      lines: string[];
      title: string;
      audio_url: string;
      image_url: string;
      transcript: string;
      description: string;
      chapter_number: number;
      image_search_query: string;
    }[];
    main_image_url: string;
    admission_price: number | null;
  };
};

const KEYS = {
  all: ['audioguides'] as const,
  one: (id: string) => ['audioguides', id] as const,
};

// Fixed key (not per-place): only one generation is ever in flight at a time in
// this flow, so LottieTransitionScreen can watch it via useMutationState without
// HomeScreen having to stay mounted or pass anything through navigation params.
export const GENERATE_AUDIOGUIDE_MUTATION_KEY = ['audioguides', 'generate'] as const;

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
    mutationKey: GENERATE_AUDIOGUIDE_MUTATION_KEY,
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

