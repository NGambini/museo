import React, { useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LottieTransitionScreenView } from '@/components/screenviews/LottieTransitionScreenView';
import { findLottieForMuseum } from '@/lib/lottieMatcher';
import { getLottieAsset } from '@/lib/lottieAssets';

const VISIT_PREPARATION_DELAY_MS = 500000;

export default function LottieTransitionScreen() {
  const router = useRouter();
  const { placeId, image, name } = useLocalSearchParams<{ placeId: string; image?: string; name: string }>();

  const lottieSource = useMemo(() => {
    const match = findLottieForMuseum(name ?? '');
    return getLottieAsset(match.id);
  }, [name]);

  useEffect(() => {
    // TODO: remplacer par le véritable appel de préparation de la visite.
    const timer = setTimeout(() => {
      router.replace({ pathname: '/MuseumScreen', params: { placeId, image: image ?? '', name } });
    }, VISIT_PREPARATION_DELAY_MS);

    return () => clearTimeout(timer);
  }, [router, placeId, image, name]);

  return <LottieTransitionScreenView lottieSource={lottieSource} museumName={name} />;
}
