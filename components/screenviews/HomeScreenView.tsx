import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from '@/components/ui/scroll-view';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Image } from '@/components/ui/image';
import { Pressable } from '@/components/ui/pressable';
import { Divider } from '@/components/ui/divider';
import { Clock, ChevronRight, AlertCircle } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { Header } from '@/components/Header';
import { AudioguideMap } from '@/components/map';
import type { AudioguideSummary } from '@/types/audioguide';

export interface HistoryItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  visitedAt: string;
}

export interface HomeScreenViewProps {
  audioguides: AudioguideSummary[];
  audioguidesError: Error | null;
  onRetryAudioguides: () => void;
  onTapAudioguide: (audioguideId: string) => void;
  historyItems: HistoryItem[];
  onTapHistoryItem: (placeId: string) => void;
}

export function HomeScreenView({
  audioguides,
  audioguidesError,
  onRetryAudioguides,
  onTapAudioguide,
  historyItems,
  onTapHistoryItem,
}: HomeScreenViewProps) {
  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background-0">
      <Header isHome />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <VStack space="xl" className="px-4 pt-6">

          {/* Carte Marseille : verrouillée sur les bounds, un marker par audioguide */}
          <AudioguideMap audioguides={audioguides} onTapAudioguide={onTapAudioguide} />

          {audioguidesError ? (
            <Box className="bg-background-50 rounded-2xl p-4">
              <HStack className="items-center gap-3">
                <AlertCircle size={18} color={theme.secondary} />
                <Text className="text-typography-900 flex-1" size="sm">
                  Impossible de charger les audioguides.
                </Text>
                <Pressable onPress={onRetryAudioguides}>
                  <Text className="text-primary-500" size="sm" bold>
                    Réessayer
                  </Text>
                </Pressable>
              </HStack>
            </Box>
          ) : null}

          {/* History */}
          {historyItems.length > 0 && (
            <Box className="bg-background-50 rounded-3xl p-6">
              <HStack className="items-center gap-3 mb-6">
                <Clock size={21} color={theme.primary} />
                <Text className="text-primary-500" size="md" bold>Historique</Text>
              </HStack>

              <VStack>
                {historyItems.map((item, index) => (
                  <Box key={index}>
                    {index > 0 && <Divider orientation="horizontal" />}
                    <Pressable onPress={() => onTapHistoryItem(item.id)}>
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
                            <Text className="text-typography-900 font-spaced" size="sm" numberOfLines={2}>
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
          )}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
