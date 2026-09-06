import React, { useRef } from 'react';
import MapView, { type Region } from 'react-native-maps';
import { Box } from '@/components/ui/box';
import { clampRegionToBounds, isRegionOutOfBounds, MARSEILLE_REGION } from '@/lib/mapBounds';
import { AudioguideMarker } from './AudioguideMarker';
import type { AudioguideSummary } from '@/types/audioguide';

export interface AudioguideMapProps {
  audioguides: AudioguideSummary[];
  onTapAudioguide: (audioguideId: string) => void;
}

const CLAMP_ANIMATION_MS = 200;

export function AudioguideMap({ audioguides, onTapAudioguide }: AudioguideMapProps) {
  const mapRef = useRef<MapView>(null);
  const isCorrectingRef = useRef(false);

  // react-native-maps n'expose pas de maxBounds : on laisse le geste se
  // terminer, puis on ramène la caméra dans le cadre si elle en est sortie.
  //
  // Le drapeau isCorrecting est indispensable : notre propre animateToRegion
  // rappelle onRegionChangeComplete, et sans lui on retomberait dans la boucle
  // infinie qui faisait déborder la pile (crash de applyLegacyZoomConstrains).
  const handleRegionChangeComplete = (region: Region) => {
    if (isCorrectingRef.current) {
      isCorrectingRef.current = false;
      return;
    }
    if (!isRegionOutOfBounds(region)) return;

    isCorrectingRef.current = true;
    mapRef.current?.animateToRegion(clampRegionToBounds(region), CLAMP_ANIMATION_MS);
  };

  return (
    <Box className="w-full aspect-[4/3] rounded-3xl overflow-hidden bg-background-100">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={MARSEILLE_REGION}
        onRegionChangeComplete={handleRegionChangeComplete}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsPointsOfInterest={false}
      >
        {audioguides.map((audioguide) => (
          <AudioguideMarker key={audioguide.id} audioguide={audioguide} onPress={onTapAudioguide} />
        ))}
      </MapView>
    </Box>
  );
}
