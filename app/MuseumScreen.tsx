import React, { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { MuseumScreenView } from '@/components/screenviews/MuseumScreenView';
import { useAudioguide } from '@/api/audioguides';
import type { Chapter } from '@/components/screenviews/MuseumScreenView';

export default function MuseumScreen() {
  const { id, image, name } = useLocalSearchParams<{ id: string; image?: string; name?: string }>();
  const { data: audioguide } = useAudioguide(id);
  const [chapterIndex, setChapterIndex] = useState(0);

  const chapters = useMemo(() => (audioguide?.attributes?.chapters ?? []) as Chapter[], [audioguide]);
  const chapter = chapters[chapterIndex];

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
      chapter={chapter}
      chapterIndex={chapterIndex}
      onPreviousChapter={handlePreviousChapter}
      onNextChapter={handleNextChapter}
    />
  );
}
