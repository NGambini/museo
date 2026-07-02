import React from 'react';
import { Dimensions } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Image } from '@/components/ui/image';
import { Button, ButtonText } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import type { MapPin } from './types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TOOLTIP_WIDTH = 210;
const TOOLTIP_IMAGE_HEIGHT = 96;
const TOOLTIP_CONTENT_HEIGHT = 84;
const TOOLTIP_ARROW = 10;
export const TOOLTIP_HEIGHT = TOOLTIP_IMAGE_HEIGHT + TOOLTIP_CONTENT_HEIGHT + TOOLTIP_ARROW;

interface PinTooltipProps {
  pin: MapPin;
  pos: { x: number; y: number };
  onVoir: () => void;
}

export function PinTooltip({ pin, pos, onVoir }: PinTooltipProps) {
  const left = Math.max(8, Math.min(pos.x - TOOLTIP_WIDTH / 2, SCREEN_WIDTH - TOOLTIP_WIDTH - 8));
  const top = Math.max(8, pos.y - TOOLTIP_HEIGHT - 12);
  const arrowLeft = Math.max(8, Math.min(pos.x - left - TOOLTIP_ARROW, TOOLTIP_WIDTH - TOOLTIP_ARROW * 2 - 8));

  return (
    <Box
      className="absolute bg-background-0 rounded-2xl shadow-lg"
      style={{ width: TOOLTIP_WIDTH, left, top, zIndex: 100 }}
    >
      {/* Arrow rendered first so card content paints on top of it */}
      <Box
        className="absolute bg-background-0"
        style={{
          width: TOOLTIP_ARROW * 2,
          height: TOOLTIP_ARROW * 2,
          bottom: -TOOLTIP_ARROW,
          left: arrowLeft,
          transform: [{ rotate: '45deg' }],
        }}
      />

      {/* Photo */}
      <Box className="rounded-t-2xl overflow-hidden bg-background-100" style={{ height: TOOLTIP_IMAGE_HEIGHT }}>
        {pin.photoUrl ? (
          <Image
            source={{ uri: pin.photoUrl }}
            size="none"
            className="w-full h-full"
            resizeMode="cover"
            alt={pin.name}
          />
        ) : null}
      </Box>

      {/* Content — renders after arrow in JSX, so it paints above it */}
      <VStack className="px-3 pt-2 pb-3 gap-2">
        <Text className="text-typography-900 font-bold" size="sm" numberOfLines={2}>
          {pin.name}
        </Text>
        <Button size="sm" className="rounded-xl bg-primary-500" onPress={onVoir}>
          <ButtonText className="text-white">Voir</ButtonText>
        </Button>
      </VStack>
    </Box>
  );
}
