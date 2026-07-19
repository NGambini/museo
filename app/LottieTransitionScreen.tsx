import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutationState } from '@tanstack/react-query';
import { LottieTransitionScreenView } from '@/components/screenviews/LottieTransitionScreenView';
import { findLottieForMuseum } from '@/lib/lottieMatcher';
import { getLottieAsset } from '@/lib/lottieAssets';
import { GENERATE_AUDIOGUIDE_MUTATION_KEY, type Audioguide } from '@/api/audioguides';

export default function LottieTransitionScreen() {
  const router = useRouter();
  const { placeId, image, name } = useLocalSearchParams<{ placeId: string; image?: string; name: string }>();

  const match = findLottieForMuseum(name ?? '');
  const lottieSource = getLottieAsset(match.id);

  // The mutation was fired from HomeScreen (mutationKey lets us watch it here
  // without lifting state or waiting for HomeScreen to stay mounted).
  const mutations = useMutationState({ filters: { mutationKey: GENERATE_AUDIOGUIDE_MUTATION_KEY } });
  const latest = mutations[mutations.length - 1];

  useEffect(() => {
    if (latest?.status === 'success') {
      const audioguide = latest.data as Audioguide;
      router.replace({ pathname: '/MuseumScreen', params: { id: audioguide.id, image: image ?? '', name } });
    }
  }, [latest, router, image, name]);

  return (
    <LottieTransitionScreenView
      lottieSource={lottieSource}
      museumName={name}
      error={latest?.status === 'error' ? "Impossible de préparer la visite." : undefined}
      onGoBack={() => router.back()}
    />
  );
}
