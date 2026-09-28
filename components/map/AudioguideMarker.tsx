import React, { useEffect, useState } from 'react';
import { Marker } from 'react-native-maps';
import { VStack } from '@/components/ui/vstack';
import { Box } from '@/components/ui/box';
import { Headphones } from 'lucide-react-native';
import type { AudioguideSummary } from '@/types/audioguide';

export interface AudioguideMarkerProps {
  audioguide: AudioguideSummary;
  onPress: (audioguideId: string) => void;
}

// Un marker à vue custom se redessine à chaque frame tant que
// tracksViewChanges est vrai, ce qui fait ramer la carte. On le laisse actif
// juste le temps du premier rendu, puis on le coupe.
const TRACK_VIEW_CHANGES_MS = 500;

export function AudioguideMarker({ audioguide, onPress }: AudioguideMarkerProps) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setTracksViewChanges(false), TRACK_VIEW_CHANGES_MS);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Marker
      identifier={audioguide.id}
      coordinate={{ latitude: audioguide.latitude, longitude: audioguide.longitude }}
      title={audioguide.placeName}
      description={audioguide.city ?? undefined}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracksViewChanges}
      onCalloutPress={() => onPress(audioguide.id)}
    >
      <VStack className="items-center">
        <Box className="w-9 h-9 rounded-full bg-primary-500 border-2 border-background-0 items-center justify-center shadow-hard-2">
          <Headphones size={16} color="#ffffff" />
        </Box>
        {/* Pointe du pin : un carré tourné à 45°, à moitié masqué par la pastille. */}
        <Box className="w-3 h-3 bg-primary-500 rotate-45 -mt-2 rounded-sm" />
      </VStack>
    </Marker>
  );
}
