import React, { useState, useRef } from 'react';
import { View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from '@/components/ui/scroll-view';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Image } from '@/components/ui/image';
import { Pressable } from '@/components/ui/pressable';
import { Divider } from '@/components/ui/divider';
import { Search, Clock, ChevronRight, User, ChevronDown } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { MapSection, PinTooltip, type MapPin } from '@/components/map';

export type { MapPin };

export interface HistoryItem {
  title: string;
  subtitle: string;
  image: string;
}

export interface HomeScreenViewProps {
  mapUrl: string | null;
  mapCenter: { latitude: number; longitude: number } | null;
  mapPins: MapPin[];
  historyItems: HistoryItem[];
  onPinPress: (pin: MapPin) => void;
}

export function HomeScreenView({
  mapUrl,
  mapCenter,
  mapPins,
  historyItems,
  onPinPress,
}: HomeScreenViewProps) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<View>(null) as React.RefObject<View>;
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const handlePinSelect = (pin: MapPin, localCoords: { x: number; y: number }) => {
    if (selectedPin?.id === pin.id) {
      setSelectedPin(null);
      setTooltipPos(null);
      return;
    }
    mapRef.current?.measure((_fx, _fy, _w, _h, pageX, pageY) => {
      setSelectedPin(pin);
      setTooltipPos({
        x: pageX + localCoords.x,
        y: pageY + localCoords.y - 10, // Offset to position the tooltip above the pin
      });
    });
  };

  const dismissTooltip = () => {
    setSelectedPin(null);
    setTooltipPos(null);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background-0">
      {/* Header */}
      <HStack className="items-center justify-between px-4 h-16 bg-background-0/90">
        <Heading className="text-primary-500" size="2xl">
          Museo
        </Heading>
        <Pressable className="flex-row items-center p-2 rounded-full">
          <User size={20} color={theme.secondary} />
          <ChevronDown size={12} color={theme.secondary} />
        </Pressable>
      </HStack>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <VStack space="xl" className="px-4 pt-4">

          {/* Search bar */}
          <HStack className="items-center bg-background-50 rounded-full px-4 py-3 shadow-sm">
            <Search size={18} color={theme.secondary} />
            <Text className="ml-3 text-typography-400" size="md">
              Find a place
            </Text>
          </HStack>

          {/* Map */}
          <MapSection
            mapRef={mapRef}
            mapUrl={mapUrl}
            mapCenter={mapCenter}
            mapPins={mapPins}
            selectedPinId={selectedPin?.id ?? null}
            onPinPress={handlePinSelect}
          />

          {/* History section */}
          <Box className="bg-background-50 rounded-3xl p-6">
            <HStack className="items-center gap-3 mb-6">
              <Clock size={21} color={theme.primary} />
              <Text className="text-primary-500" size="md">
                +Historique
              </Text>
            </HStack>

            <VStack>
              {historyItems.map((item, index) => (
                <Box key={index}>
                  {index > 0 && <Divider orientation="horizontal" />}
                  <Pressable onPress={dismissTooltip}>
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

      {/* Dismiss overlay (zIndex 99) + floating tooltip (zIndex 100) */}
      {selectedPin && tooltipPos && (
        <>
          <Pressable
            className="absolute inset-0"
            style={{ zIndex: 99 }}
            onPress={dismissTooltip}
          />
          <PinTooltip
            pin={selectedPin}
            pos={tooltipPos}
            onVoir={() => {
              onPinPress(selectedPin);
              dismissTooltip();
            }}
          />
        </>
      )}
    </SafeAreaView>
  );
}
