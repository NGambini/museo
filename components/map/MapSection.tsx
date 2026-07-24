import React, { useState } from 'react';
import { View } from 'react-native';
import { Box } from '@/components/ui/box';
import { Image } from '@/components/ui/image';
import { Spinner } from '@/components/ui/spinner';
import { pinToDisplayCoords } from '@/lib/mapUtils';
import { Pin } from './Pin';
import type { MapPin } from './types';
import type { PinCoords } from './Pin';

interface MapSectionProps {
  mapRef: React.RefObject<View>;
  mapUrl: string | null;
  mapCenter: { latitude: number; longitude: number } | null;
  mapPins: MapPin[];
  selectedPinId: string | null;
  onPinPress: (pin: MapPin, coords: PinCoords) => void;
}

export function MapSection({ mapRef, mapUrl, mapCenter, mapPins, selectedPinId, onPinPress }: MapSectionProps) {
  const [mapSize, setMapSize] = useState<{ width: number; height: number } | null>(null);

  const ready = mapUrl && mapCenter && mapSize;

  return (
    <Box
      ref={mapRef}
      className="w-full aspect-[4/3] rounded-3xl shadow-sm"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setMapSize({ width, height });
      }}
    >
      <Box className="absolute inset-0 rounded-3xl overflow-hidden bg-background-100 items-center justify-center">
        {mapUrl ? (
          <Image source={{ uri: mapUrl }} size="none" className="w-full h-full" resizeMode="cover" alt="Cultural places map" />
        ) : (
          <Spinner size="large" className="text-primary-500" />
        )}

        {ready && mapPins.map((pin) => {
          const coords = pinToDisplayCoords(
            pin.latitude, pin.longitude,
            mapCenter.latitude, mapCenter.longitude,
            mapSize.width, mapSize.height,
          );
          return (
            <Pin key={pin.id} pin={pin} coords={coords} selected={selectedPinId === pin.id} onPress={() => onPinPress(pin, coords)} />
          );
        })}
      </Box>
    </Box>
  );
}
