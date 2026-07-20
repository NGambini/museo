import React, { useMemo, useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { MuseumScreenView } from '@/components/screenviews/MuseumScreenView';
import { useAudioguide } from '@/api/audioguides';
import { addHistoryItem } from '@/lib/historyStore';
import type { Chapter } from '@/components/screenviews/MuseumScreenView';

export default function MuseumScreen() {
  const { id, image, name } = useLocalSearchParams<{ id: string; image?: string; name?: string }>();
  const { data: audioguide } = useAudioguide(id);
  const [chapterIndex, setChapterIndex] = useState(0);

  const chapters = useMemo(() => (audioguide?.attributes?.chapters ?? []) as Chapter[], [audioguide]);

  useEffect(() => {
    if (!audioguide) return;

    const imageUrl = image ?? audioguide.attributes.main_image_url ?? '';
    const title = audioguide.attributes.title || audioguide.placeName || name || 'Audioguide';
    const subtitle = name ? `Visité: ${name}` : audioguide.placeName ? `Visité: ${audioguide.placeName}` : 'Audioguide récent';

    addHistoryItem({
      id: audioguide.id,
      title,
      subtitle,
      image: imageUrl,
      visitedAt: new Date().toISOString(),
    }).catch(() => undefined);
  }, [audioguide, image, name]);

  const handlePreviousChapter = () => {
    setChapterIndex((currentIndex) => Math.max(0, currentIndex - 1));
  };

  const handleNextChapter = () => {
    setChapterIndex((currentIndex) => Math.min(chapters.length - 1, currentIndex + 1));
  };

  return (
    <MuseumScreenView
      image={image}
      name={name}
      audioguide={audioguide}
      chapters={chapters}
      chapterIndex={chapterIndex}
      onPreviousChapter={handlePreviousChapter}
      onNextChapter={handleNextChapter}
    />
  );
}
