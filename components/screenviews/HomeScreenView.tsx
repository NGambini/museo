import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from '@/components/ui/scroll-view';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Image } from '@/components/ui/image';
import { Pressable } from '@/components/ui/pressable';
import { Divider } from '@/components/ui/divider';
import { Search, Clock, ChevronRight } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { MapSection, PinTooltip, type MapPin } from '@/components/map';
import { Header } from '@/components/Header';

export type { MapPin };

export interface HistoryItem {
  title: string;
  subtitle: string;
  image: string;
}

export interface HomeScreenViewProps {
  mapRef: React.RefObject<View>;
  mapUrl: string | null;
  mapCenter: { latitude: number; longitude: number } | null;
  mapPins: MapPin[];
  historyItems: HistoryItem[];
  selectedPin: MapPin | null;
  tooltipPos: { x: number; y: number } | null;
  onPinSelect: (pin: MapPin, coords: { x: number; y: number }) => void;
  onPinPress: (pin: MapPin) => void;
  onDismiss: () => void;
}

export function HomeScreenView({
  mapRef,
  mapUrl,
  mapCenter,
  mapPins,
  historyItems,
  selectedPin,
  tooltipPos,
  onPinSelect,
  onPinPress,
  onDismiss,
}: HomeScreenViewProps) {
  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background-0">
      <Header />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <VStack space="xl" className="px-4 pt-4">

          {/* Search bar */}
          <HStack className="items-center bg-background-50 rounded-full px-4 py-3 shadow-sm">
            <Search size={18} color={theme.secondary} />
            <Text className="ml-3 text-typography-400" size="md">Find a place</Text>
          </HStack>

          {/* Map */}
          <MapSection
            mapRef={mapRef}
            mapUrl={mapUrl}
            mapCenter={mapCenter}
            mapPins={mapPins}
            selectedPinId={selectedPin?.id ?? null}
            onPinPress={onPinSelect}
          />

          {/* History */}
          <Box className="bg-background-50 rounded-3xl p-6">
            <HStack className="items-center gap-3 mb-6">
              <Clock size={21} color={theme.primary} />
              <Text className="text-primary-500" size="md">+Historique</Text>
            </HStack>

            <VStack>
              {historyItems.map((item, index) => (
                <Box key={index}>
                  {index > 0 && <Divider orientation="horizontal" />}
                  <Pressable onPress={onDismiss}>
                    <HStack className="items-center justify-between py-4">
                      <HStack className="items-center gap-4 flex-1 mr-3">
                        <Image
                          source={{ uri: item.image }}
                          size="none"
                          className="w-12 h-12 rounded-xl bg-background-100"
                          resizeMode="cover"
                          alt={item.title}
                        />
                        <VStack className="flex-1">
                          <Text className="text-typography-900 font-bold" size="sm" numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text className="text-typography-400 mt-0.5" size="xs">
                            {item.subtitle}
                          </Text>
                        </VStack>
                      </HStack>
                      <ChevronRight size={16} color={theme.secondary} />
                    </HStack>
                  </Pressable>
                </Box>
              ))}
            </VStack>
          </Box>

        </VStack>
      </ScrollView>

      {/* Dismiss overlay + floating tooltip */}
      {selectedPin && tooltipPos && (
        <>
          <Pressable className="absolute inset-0" style={{ zIndex: 99 }} onPress={onDismiss} />
          <PinTooltip
            pin={selectedPin}
            pos={tooltipPos}
            onVoir={() => {
              onPinPress(selectedPin);
              onDismiss();
            }}
          />
        </>
      )}
    </SafeAreaView>
  );
}
