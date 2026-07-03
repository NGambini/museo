import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { MuseumScreenView } from '@/components/screenviews/MuseumScreenView';

export default function MuseumScreen() {
  const { placeId, image, name } = useLocalSearchParams<{ placeId: string; image?: string; name: string }>();

  return <MuseumScreenView placeId={placeId} image={image} name={name} />;
}
