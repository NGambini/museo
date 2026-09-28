import React from 'react';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Map } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import type { AudioguideMapProps } from './AudioguideMap';

// react-native-maps ne supporte pas le web : sur cette plateforme on retombe
// sur un placeholder pour ne pas casser `expo export --platform web`.
export function AudioguideMap(_props: AudioguideMapProps) {
  return (
    <Box className="w-full aspect-[4/3] rounded-3xl bg-background-50 items-center justify-center border border-dashed border-outline-200">
      <Map size={28} color={theme.secondary} />
      <Text className="text-typography-400 mt-2" size="sm">
        Carte indisponible sur le web
      </Text>
    </Box>
  );
}
