import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { HomeScreenView } from '@/components/screenviews/HomeScreenView';
import { useAudioguides } from '@/api/audioguides';
import { getHistory, type HistoryItem as StoredHistoryItem } from '@/lib/historyStore';

const AUDIOGUIDES_PAGE_SIZE = 100;

export default function HomeScreen() {
  const router = useRouter();

  // Catalogue partagé : chargé dès l'arrivée sur le Home, sans authentification.
  const {
    data: audioguidesPage,
    error: audioguidesError,
    refetch: refetchAudioguides,
  } = useAudioguides({ limit: AUDIOGUIDES_PAGE_SIZE });

  const [historyItems, setHistoryItems] = useState<StoredHistoryItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      getHistory()
        .catch(() => [])
        .then((storedHistory) => {
          if (active) setHistoryItems(storedHistory);
        });

      return () => {
        active = false;
      };
    }, [])
  );

  useEffect(() => {
    (async () => {
      const storedHistory = await getHistory().catch(() => []);
      setHistoryItems(storedHistory);
    })();
  }, []);

  const handleTapAudioguide = (audioguideId: string) => {
    router.push({ pathname: '/MuseumScreen', params: { id: audioguideId } });
  };

  const handleTapHistoryItem = (placeId: string) => {
    router.push({
      pathname: '/MuseumScreen',
      params: { id: placeId },
    });
  };

  return (
    <HomeScreenView
      audioguides={audioguidesPage?.items ?? []}
      audioguidesError={audioguidesError}
      onRetryAudioguides={() => refetchAudioguides()}
      onTapAudioguide={handleTapAudioguide}
      historyItems={historyItems}
      onTapHistoryItem={handleTapHistoryItem}
    />
  );
}
