import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { MuseumScreenView } from '@/components/screenviews/MuseumScreenView';
import { useAudioguide } from '@/api/audioguides';

export default function MuseumScreen() {
  const { id, image, name } = useLocalSearchParams<{ id: string; image?: string; name?: string }>();
  const { data: audioguide } = useAudioguide(id);

  return <MuseumScreenView image={image} name={name} audioguide={audioguide} />;
}
