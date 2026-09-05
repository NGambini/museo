import React, { useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutationState } from '@tanstack/react-query';
import { LottieTransitionScreenView } from '@/components/screenviews/LottieTransitionScreenView';
import { getRandomLottieAsset } from '@/lib/lottieAssets';
import { GENERATE_AUDIOGUIDE_MUTATION_KEY } from '@/api/audioguides';
import { Audioguide } from '@/types/audioguide';

export default function LottieTransitionScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();

  // Memoized: useMutationState re-renders throughout the wait, and this is
  // precisely the screen where the animation must run without a hitch.
  const lottieSource = useMemo(() => getRandomLottieAsset(), []);

  // The mutation was fired from HomeScreen (mutationKey lets us watch it here
  // without lifting state or waiting for HomeScreen to stay mounted).
  const mutations = useMutationState({ filters: { mutationKey: GENERATE_AUDIOGUIDE_MUTATION_KEY } });
  const latest = mutations[mutations.length - 1];

  useEffect(() => {
    if (latest?.status === 'success') {
      const audioguide = latest.data as Audioguide;
      router.replace({ pathname: '/MuseumScreen', params: { id: audioguide.id } });
    }
  }, [latest, router, name]);

  return (
    <LottieTransitionScreenView
      lottieSource={lottieSource}
      museumName={name}
      error={latest?.status === 'error' ? "Impossible de préparer la visite." : undefined}
      onGoBack={() => router.back()}
    />
  );
}
