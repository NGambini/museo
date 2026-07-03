import React from 'react';
import { Pressable } from '@/components/ui/pressable';
import { MapPin as MapPinIcon } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import type { MapPin } from './types';

const PIN_SIZE = 24;

export type PinCoords = { x: number; y: number };

interface PinProps {
  pin: MapPin;
  coords: PinCoords;
  selected: boolean;
  onPress: () => void;
}

export function Pin({ pin, coords, selected, onPress }: PinProps) {
  return (
    <Pressable
      className="absolute rounded-full border-2 border-white items-center justify-center"
      style={{
        width: PIN_SIZE,
        height: PIN_SIZE,
        left: coords.x - PIN_SIZE / 2,
        top: coords.y - PIN_SIZE,
        backgroundColor: theme.primary,
        opacity: selected ? 1 : 0.9,
      }}
      onPress={onPress}
    >
      <MapPinIcon size={10} color="white" />
    </Pressable>
  );
}
