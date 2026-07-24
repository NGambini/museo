import React, { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { MuseumScreenView } from '@/components/screenviews/MuseumScreenView';
import { useAudioguide } from '@/api/audioguides';
import { addHistoryItem } from '@/lib/historyStore';

export default function MuseumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: audioguide } = useAudioguide(id);
  const [chapterIndex, setChapterIndex] = useState(0);

  const museumImage = audioguide?.attributes?.main_image_url;
  const museumName = audioguide?.attributes?.title ?? audioguide?.placeName;

  useEffect(() => {
    if (!audioguide) return;

    const imageUrl = audioguide.attributes.main_image_url;
    const title = audioguide.attributes.title;
    const subtitle = `Visité: ${audioguide.placeName}`;

    addHistoryItem({
      id: audioguide.id,
      title,
      subtitle,
      image: imageUrl,
      visitedAt: new Date().toISOString(),
    }).catch(() => undefined);
  }, [audioguide]);

  const handlePreviousChapter = () => {
    // If we are already on the first chapter, do nothing.
    if (chapterIndex === 0) {
      return;
    }

    // Otherwise, go to the previous chapter.
    setChapterIndex(chapterIndex - 1);
  };

  const handleNextChapter = () => {
    const chapterCount = audioguide?.attributes?.chapters?.length ?? 0;

    // If there are no chapters, do nothing.
    if (chapterCount === 0) {
      return;
    }

    // If we are already on the last chapter, do nothing.
    if (chapterIndex >= chapterCount - 1) {
      return;
    }

    setChapterIndex(chapterIndex + 1);
  };

  return (
    <MuseumScreenView
      image={museumImage}
      name={museumName}
      audioguide={audioguide}
      chapterIndex={chapterIndex}
      onPreviousChapter={handlePreviousChapter}
      onNextChapter={handleNextChapter}
    />
  );
}
