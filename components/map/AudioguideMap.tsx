import React, { useCallback, useEffect, useRef, useState } from 'react';
import MapView, { type Region } from 'react-native-maps';
import { Box } from '@/components/ui/box';
import {
  clampRegionToBounds,
  isRegionOutOfBounds,
  regionForCoordinates,
  MARSEILLE_REGION,
} from '@/lib/mapBounds';
import { useUserLocationPermission } from '@/hooks/useUserLocationPermission';
import { AudioguideMarker } from './AudioguideMarker';
import type { AudioguideSummary } from '@/types/audioguide';

export interface AudioguideMapProps {
  audioguides: AudioguideSummary[];
  onTapAudioguide: (audioguideId: string) => void;
}

const CLAMP_ANIMATION_MS = 200;

// Window during which onRegionChangeComplete is ignored after we moved the
// camera ourselves. Covers the animation plus the time MapKit takes to settle.
const SELF_MOVE_COOLDOWN_MS = 400;

export function AudioguideMap({ audioguides, onTapAudioguide }: AudioguideMapProps) {
  const mapRef = useRef<MapView>(null);
  const selfMoveUntilRef = useRef(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const isUserLocationGranted = useUserLocationPermission();

  const moveTo = useCallback((region: Region) => {
    selfMoveUntilRef.current = Date.now() + SELF_MOVE_COOLDOWN_MS;
    mapRef.current?.animateToRegion(region, CLAMP_ANIMATION_MS);
  }, []);

  // Frame every audioguide as soon as they are known, so that no pin starts
  // off-screen.
  useEffect(() => {
    if (!isMapReady) return;

    const region = regionForCoordinates(audioguides);
    if (!region) return;

    moveTo(clampRegionToBounds(region));
  }, [isMapReady, audioguides, moveTo]);

  // react-native-maps has no maxBounds: we let the gesture finish, then bring
  // the camera back inside the frame if it drifted out.
  //
  // The cooldown is essential: our own animateToRegion re-triggers this
  // callback, and without it we would fall back into the loop that used to
  // overflow the stack. Unlike a plain flag, it expires on its own and thus
  // cannot swallow a user gesture if MapKit never calls back.
  const handleRegionChangeComplete = (region: Region) => {
    if (Date.now() < selfMoveUntilRef.current) return;
    if (!isRegionOutOfBounds(region)) return;

    moveTo(clampRegionToBounds(region));
  };

  return (
    <Box className="w-full aspect-square rounded-3xl overflow-hidden bg-background-100">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={MARSEILLE_REGION}
        onMapReady={() => setIsMapReady(true)}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation={isUserLocationGranted}
        showsMyLocationButton={isUserLocationGranted}
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
