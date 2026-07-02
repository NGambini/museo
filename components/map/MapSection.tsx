import React, { useState } from 'react';
import { View } from 'react-native';
import { Box } from '@/components/ui/box';
import { Image } from '@/components/ui/image';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { MapPin as MapPinIcon } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { pinToDisplayCoords } from '@/lib/mapUtils';
import type { MapPin } from './types';

const SECONDARY_CIRCLE = 24;
const PRIMARY_CIRCLE = 30;
const LABEL_HEIGHT = 18;
const LABEL_GAP = 4;
const PRIMARY_WIDTH = 120;
const PRIMARY_TOTAL_HEIGHT = LABEL_HEIGHT + LABEL_GAP + PRIMARY_CIRCLE;

interface MapSectionProps {
  mapRef: React.RefObject<View>;
  mapUrl: string | null;
  mapCenter: { latitude: number; longitude: number } | null;
  mapPins: MapPin[];
  selectedPinId: string | null;
  onPinPress: (pin: MapPin, coords: { x: number; y: number }) => void;
}

export function MapSection({
  mapRef,
  mapUrl,
  mapCenter,
  mapPins,
  selectedPinId,
  onPinPress,
}: MapSectionProps) {
  const [mapSize, setMapSize] = useState<{ width: number; height: number } | null>(null);

  return (
    <Box
      ref={mapRef}
      className="w-full aspect-[4/3] rounded-3xl shadow-md"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setMapSize({ width, height });
      }}
    >
      <Box className="absolute inset-0 rounded-3xl overflow-hidden bg-background-100 items-center justify-center">
        {mapUrl ? (
          <Image
            source={{ uri: mapUrl }}
            size="none"
            className="w-full h-full"
            resizeMode="cover"
            alt="Carte des lieux culturels"
          />
        ) : (
          <Spinner size="large" className="text-primary-500" />
        )}

        {mapUrl && mapCenter && mapSize &&
          mapPins.map((pin) => {
            const coords = pinToDisplayCoords(
              pin.latitude,
              pin.longitude,
              mapCenter.latitude,
              mapCenter.longitude,
              mapSize.width,
              mapSize.height,
            );
            const isSelected = selectedPinId === pin.id;

            if (pin.primary) {
              return (
                <Pressable
                  key={pin.id}
                  className="absolute items-center"
                  style={{
                    width: PRIMARY_WIDTH,
                    left: coords.x - PRIMARY_WIDTH / 2,
                    top: coords.y - PRIMARY_TOTAL_HEIGHT,
                  }}
                  onPress={() => onPinPress(pin, coords)}
                >
                  <Box
                    className="rounded-full px-3 mb-1"
                    style={{ backgroundColor: theme.primary, paddingVertical: 4 }}
                  >
                    <Text className="text-white font-bold" style={{ fontSize: 11 }} numberOfLines={1}>
                      {pin.name}
                    </Text>
                  </Box>
                  <Box
                    className="rounded-full border-2 border-white items-center justify-center"
                    style={{ width: PRIMARY_CIRCLE, height: PRIMARY_CIRCLE, backgroundColor: theme.primary }}
                  >
                    <MapPinIcon size={13} color="white" />
                  </Box>
                </Pressable>
              );
            }

            return (
              <Pressable
                key={pin.id}
                className="absolute rounded-full border-2 border-white items-center justify-center"
                style={{
                  width: SECONDARY_CIRCLE,
                  height: SECONDARY_CIRCLE,
                  left: coords.x - SECONDARY_CIRCLE / 2,
                  top: coords.y - SECONDARY_CIRCLE,
                  backgroundColor: theme.primary,
                  opacity: isSelected ? 1 : 0.9,
                }}
                onPress={() => onPinPress(pin, coords)}
              >
                <MapPinIcon size={10} color="white" />
              </Pressable>
            );
          })
        }
      </Box>
    </Box>
  );
}
